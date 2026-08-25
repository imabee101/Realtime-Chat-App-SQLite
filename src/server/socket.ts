import type { Server, ServerWebSocket } from "bun";
import {
	clientEnvelopeSchema,
	joinPayloadSchema,
	messagePayloadSchema,
	type ServerToClientEnvelope,
	type SocketData,
} from "../shared/events.js";
import type { Db } from "./db.js";

const RATE_LIMIT_CAPACITY = 5;
const RATE_LIMIT_REFILL_PER_SEC = 1;
const ROOM = "room";

class TokenBucket {
	private tokens: number;
	private lastRefillMs: number;

	constructor(
		private readonly capacity: number,
		private readonly refillPerSec: number,
	) {
		this.tokens = capacity;
		this.lastRefillMs = Date.now();
	}

	tryConsume(): boolean {
		const now = Date.now();
		const elapsedSec = (now - this.lastRefillMs) / 1000;
		this.tokens = Math.min(
			this.capacity,
			this.tokens + elapsedSec * this.refillPerSec,
		);
		this.lastRefillMs = now;

		if (this.tokens < 1) {
			return false;
		}
		this.tokens -= 1;
		return true;
	}
}

type ChatSocket = ServerWebSocket<SocketData>;

function send(ws: ChatSocket, envelope: ServerToClientEnvelope): void {
	ws.send(JSON.stringify(envelope));
}

function publish(
	server: Server<SocketData>,
	envelope: ServerToClientEnvelope,
): void {
	server.publish(ROOM, JSON.stringify(envelope));
}

function rawToString(raw: string | Buffer): string {
	return typeof raw === "string" ? raw : raw.toString();
}

export function createWebsocketHandlers(db: Db) {
	const rateLimiters = new WeakMap<ChatSocket, TokenBucket>();
	let presenceCount = 0;
	let server: Server<SocketData> | undefined;

	function setServer(value: Server<SocketData>): void {
		server = value;
	}

	const websocket = {
		data: {} as SocketData,
		open(ws: ChatSocket) {
			rateLimiters.set(
				ws,
				new TokenBucket(RATE_LIMIT_CAPACITY, RATE_LIMIT_REFILL_PER_SEC),
			);
			ws.subscribe(ROOM);
		},
		message(ws: ChatSocket, raw: string | Buffer) {
			let parsedJson: unknown;
			try {
				parsedJson = JSON.parse(rawToString(raw));
			} catch {
				return;
			}

			const frame = clientEnvelopeSchema.safeParse(parsedJson);
			if (!frame.success) {
				return;
			}

			const { id, event, payload } = frame.data;

			if (event === "user:join") {
				if (ws.data.username) {
					send(ws, { id, event: "ack", payload: { ok: false, error: "Already joined" } });
					return;
				}

				const result = joinPayloadSchema.safeParse(payload);
				if (!result.success) {
					send(ws, {
						id,
						event: "ack",
						payload: {
							ok: false,
							error: result.error.issues[0]?.message ?? "Invalid username",
						},
					});
					return;
				}

				ws.data.username = result.data.username;
				send(ws, { id, event: "ack", payload: { ok: true } });
				send(ws, {
					event: "chat:history",
					payload: { messages: db.getRecentMessages() },
				});

				presenceCount += 1;
				if (server) {
					publish(server, { event: "presence:count", payload: { count: presenceCount } });
				}
				return;
			}

			if (!ws.data.username) {
				send(ws, { id, event: "ack", payload: { ok: false, error: "Join first" } });
				return;
			}

			const bucket = rateLimiters.get(ws);
			if (!bucket?.tryConsume()) {
				send(ws, {
					id,
					event: "ack",
					payload: { ok: false, error: "You're sending messages too fast" },
				});
				return;
			}

			const result = messagePayloadSchema.safeParse(payload);
			if (!result.success) {
				send(ws, {
					id,
					event: "ack",
					payload: {
						ok: false,
						error: result.error.issues[0]?.message ?? "Invalid message",
					},
				});
				return;
			}

			try {
				const message = db.insertMessage(ws.data.username, result.data.content);
				send(ws, { id, event: "ack", payload: { ok: true, message } });
				if (server) {
					publish(server, { event: "chat:message", payload: { message } });
				}
			} catch (error) {
				console.error("Failed to persist chat message:", error);
				send(ws, {
					id,
					event: "ack",
					payload: { ok: false, error: "Failed to send message" },
				});
			}
		},
		close(ws: ChatSocket) {
			rateLimiters.delete(ws);
			if (ws.data.username) {
				presenceCount -= 1;
				if (server) {
					publish(server, {
						event: "presence:count",
						payload: { count: presenceCount },
					});
				}
			}
		},
	};

	return { websocket, setServer };
}
