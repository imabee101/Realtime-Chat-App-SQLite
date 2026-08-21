import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, test } from "node:test";
import { type Socket as ClientSocket, io as ioClient } from "socket.io-client";
import {
	type ChatMessage,
	type ClientToServerEvents,
	type JoinAck,
	MESSAGE_MAX_LEN,
	type MessageAck,
	type ServerToClientEvents,
} from "../shared/events.js";
import { createServer } from "./app.js";

type TestSocket = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

let server: ReturnType<typeof createServer>;
let client: TestSocket | undefined;
let url: string;

beforeEach(async () => {
	server = createServer(":memory:");
	await new Promise<void>((resolve) => {
		server.httpServer.listen(0, resolve);
	});
	const { port } = server.httpServer.address() as AddressInfo;
	url = `http://localhost:${port}`;
});

afterEach(async () => {
	client?.disconnect();
	client = undefined;
	await server.io.close();
	server.db.close();
});

function connect(): Promise<TestSocket> {
	const socket: TestSocket = ioClient(url, {
		reconnection: false,
		transports: ["websocket"],
	});
	client = socket;
	return new Promise((resolve, reject) => {
		socket.once("connect", () => resolve(socket));
		socket.once("connect_error", reject);
	});
}

function join(socket: TestSocket, username: string): Promise<JoinAck> {
	return new Promise((resolve) => {
		socket.emit("user:join", { username }, resolve);
	});
}

function sendMessage(socket: TestSocket, content: string): Promise<MessageAck> {
	return new Promise((resolve) => {
		socket.emit("chat:message", { content }, resolve);
	});
}

test("join, history, and message round trip", async () => {
	const socket = await connect();

	const historyPromise = new Promise<{ messages: ChatMessage[] }>((resolve) => {
		socket.once("chat:history", resolve);
	});

	const joinResult = await join(socket, "tester");
	assert.deepEqual(joinResult, { ok: true });

	const history = await historyPromise;
	assert.deepEqual(history.messages, []);

	const broadcastPromise = new Promise<{ message: ChatMessage }>((resolve) => {
		socket.once("chat:message", resolve);
	});

	const content = "hello from the integration test";
	const messageResult = await sendMessage(socket, content);
	if (!messageResult.ok) {
		assert.fail(
			`expected message ack to succeed, got error: ${messageResult.error}`,
		);
	}
	assert.equal(messageResult.message.content, content);
	assert.equal(messageResult.message.username, "tester");

	const broadcast = await broadcastPromise;
	assert.equal(broadcast.message.content, content);
	assert.equal(broadcast.message.id, messageResult.message.id);
});

test("oversized message content is rejected", async () => {
	const socket = await connect();

	const joinResult = await join(socket, "tester");
	assert.deepEqual(joinResult, { ok: true });

	const oversized = "a".repeat(MESSAGE_MAX_LEN + 1);
	const result = await sendMessage(socket, oversized);

	if (result.ok) {
		assert.fail("expected oversized message content to be rejected");
	}
	assert.equal(result.ok, false);
	assert.equal(
		result.error,
		`Message must be ${MESSAGE_MAX_LEN} characters or fewer`,
	);
});
