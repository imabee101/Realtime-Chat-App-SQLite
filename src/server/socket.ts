import type { Server, Socket } from "socket.io";
import {
	type ClientToServerEvents,
	type InterServerEvents,
	joinPayloadSchema,
	messagePayloadSchema,
	type ServerToClientEvents,
	type SocketData,
} from "../shared/events.js";
import type { Db } from "./db.js";

type ChatServer = Server<
	ClientToServerEvents,
	ServerToClientEvents,
	InterServerEvents,
	SocketData
>;
type ChatSocket = Socket<
	ClientToServerEvents,
	ServerToClientEvents,
	InterServerEvents,
	SocketData
>;

const RATE_LIMIT_CAPACITY = 5;
const RATE_LIMIT_REFILL_PER_SEC = 1;

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

export function registerSocketHandlers(io: ChatServer, db: Db): void {
	const rateLimiters = new Map<string, TokenBucket>();
	let presenceCount = 0;

	io.on("connection", (socket: ChatSocket) => {
		rateLimiters.set(
			socket.id,
			new TokenBucket(RATE_LIMIT_CAPACITY, RATE_LIMIT_REFILL_PER_SEC),
		);

		socket.on("user:join", (payload, ack) => {
			if (socket.data.username) {
				ack({ ok: false, error: "Already joined" });
				return;
			}

			const result = joinPayloadSchema.safeParse(payload);
			if (!result.success) {
				ack({
					ok: false,
					error: result.error.issues[0]?.message ?? "Invalid username",
				});
				return;
			}

			socket.data.username = result.data.username;
			ack({ ok: true });

			socket.emit("chat:history", { messages: db.getRecentMessages() });

			presenceCount += 1;
			io.emit("presence:count", { count: presenceCount });
		});

		socket.on("chat:message", (payload, ack) => {
			if (!socket.data.username) {
				ack({ ok: false, error: "Join first" });
				return;
			}

			const bucket = rateLimiters.get(socket.id);
			if (!bucket?.tryConsume()) {
				ack({ ok: false, error: "You're sending messages too fast" });
				return;
			}

			const result = messagePayloadSchema.safeParse(payload);
			if (!result.success) {
				ack({
					ok: false,
					error: result.error.issues[0]?.message ?? "Invalid message",
				});
				return;
			}

			try {
				const message = db.insertMessage(
					socket.data.username,
					result.data.content,
				);
				ack({ ok: true, message });
				io.emit("chat:message", { message });
			} catch (error) {
				console.error("Failed to persist chat message:", error);
				ack({ ok: false, error: "Failed to send message" });
			}
		});

		socket.on("disconnect", () => {
			rateLimiters.delete(socket.id);
			if (socket.data.username) {
				presenceCount -= 1;
				io.emit("presence:count", { count: presenceCount });
			}
		});
	});
}
