import { afterEach, beforeEach, expect, test } from "bun:test";
import {
	type JoinAck,
	MESSAGE_MAX_LEN,
	type MessageAck,
	type ServerToClientEnvelope,
} from "../shared/events.js";
import { createServer } from "./app.js";

let server: ReturnType<typeof createServer>;
let client: WebSocket | undefined;

beforeEach(() => {
	server = createServer(":memory:", 0);
});

afterEach(async () => {
	client?.close();
	client = undefined;
	await server.server.stop(true);
	server.db.close();
});

function connect(): Promise<WebSocket> {
	const socket = new WebSocket(`ws://127.0.0.1:${server.server.port}/ws`);
	client = socket;
	return new Promise((resolve, reject) => {
		socket.addEventListener("open", () => resolve(socket), { once: true });
		socket.addEventListener("error", () => reject(new Error("connect failed")), {
			once: true,
		});
	});
}

function send(
	socket: WebSocket,
	envelope: { id: string; event: string; payload: unknown },
): void {
	socket.send(JSON.stringify(envelope));
}

function waitFor(
	socket: WebSocket,
	match: (envelope: ServerToClientEnvelope) => boolean,
): Promise<ServerToClientEnvelope> {
	return new Promise((resolve, reject) => {
		const onMessage = (event: MessageEvent) => {
			if (typeof event.data !== "string") {
				return;
			}
			const envelope = JSON.parse(event.data) as ServerToClientEnvelope;
			if (match(envelope)) {
				socket.removeEventListener("message", onMessage);
				resolve(envelope);
			}
		};
		socket.addEventListener("message", onMessage);
		socket.addEventListener(
			"error",
			() => {
				socket.removeEventListener("message", onMessage);
				reject(new Error("socket error while waiting"));
			},
			{ once: true },
		);
	});
}

function join(socket: WebSocket, username: string): Promise<JoinAck> {
	const ack = waitFor(
		socket,
		(envelope) => envelope.event === "ack" && envelope.id === "join-1",
	);
	send(socket, { id: "join-1", event: "user:join", payload: { username } });
	return ack.then((envelope) => {
		if (envelope.event !== "ack") {
			throw new Error("expected ack");
		}
		return envelope.payload as JoinAck;
	});
}

function sendMessage(socket: WebSocket, content: string): Promise<MessageAck> {
	const ack = waitFor(
		socket,
		(envelope) => envelope.event === "ack" && envelope.id === "msg-1",
	);
	send(socket, { id: "msg-1", event: "chat:message", payload: { content } });
	return ack.then((envelope) => {
		if (envelope.event !== "ack") {
			throw new Error("expected ack");
		}
		return envelope.payload as MessageAck;
	});
}

test("join, history, and message round trip", async () => {
	const socket = await connect();

	const historyPromise = waitFor(socket, (envelope) => envelope.event === "chat:history");

	const joinResult = await join(socket, "tester");
	expect(joinResult).toEqual({ ok: true });

	const history = await historyPromise;
	if (history.event !== "chat:history") {
		throw new Error("expected history");
	}
	expect(history.payload.messages).toEqual([]);

	const broadcastPromise = waitFor(
		socket,
		(envelope) => envelope.event === "chat:message",
	);

	const content = "hello from the integration test";
	const messageResult = await sendMessage(socket, content);
	if (!messageResult.ok) {
		throw new Error(`expected message ack to succeed, got error: ${messageResult.error}`);
	}
	expect(messageResult.message.content).toBe(content);
	expect(messageResult.message.username).toBe("tester");

	const broadcast = await broadcastPromise;
	if (broadcast.event !== "chat:message") {
		throw new Error("expected chat:message");
	}
	expect(broadcast.payload.message.content).toBe(content);
	expect(broadcast.payload.message.id).toBe(messageResult.message.id);
});

test("oversized message content is rejected", async () => {
	const socket = await connect();

	const joinResult = await join(socket, "tester");
	expect(joinResult).toEqual({ ok: true });

	const oversized = "a".repeat(MESSAGE_MAX_LEN + 1);
	const result = await sendMessage(socket, oversized);

	if (result.ok) {
		throw new Error("expected oversized message content to be rejected");
	}
	expect(result.ok).toBe(false);
	expect(result.error).toBe(
		`Message must be ${MESSAGE_MAX_LEN} characters or fewer`,
	);
});
