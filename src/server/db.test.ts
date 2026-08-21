import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { HISTORY_LIMIT } from "../shared/events.js";
import { createDb } from "./db.js";

describe("insertMessage", () => {
	test("returns a ChatMessage with a real id and createdAt", (t) => {
		const db = createDb(":memory:");
		t.after(() => db.close());

		const message = db.insertMessage("alice", "hello world");

		assert.equal(message.username, "alice");
		assert.equal(message.content, "hello world");
		assert.equal(typeof message.id, "number");
		assert.ok(message.id > 0);
		assert.equal(typeof message.createdAt, "string");
		assert.match(
			message.createdAt,
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
		);
	});

	test("assigns increasing ids across inserts", (t) => {
		const db = createDb(":memory:");
		t.after(() => db.close());

		const first = db.insertMessage("alice", "first");
		const second = db.insertMessage("alice", "second");

		assert.ok(second.id > first.id);
	});
});

describe("getRecentMessages", () => {
	test("returns inserted messages in ascending chronological order", (t) => {
		const db = createDb(":memory:");
		t.after(() => db.close());

		db.insertMessage("alice", "first");
		db.insertMessage("alice", "second");
		db.insertMessage("alice", "third");

		const recent = db.getRecentMessages();

		assert.equal(recent.length, 3);
		assert.deepEqual(
			recent.map((m) => m.content),
			["first", "second", "third"],
		);
		assert.ok(recent[0].id < recent[1].id);
		assert.ok(recent[1].id < recent[2].id);
	});

	test("returns an empty array when no messages exist", (t) => {
		const db = createDb(":memory:");
		t.after(() => db.close());

		assert.deepEqual(db.getRecentMessages(), []);
	});

	test("caps results at HISTORY_LIMIT, keeping the most recent messages oldest-first", (t) => {
		const db = createDb(":memory:");
		t.after(() => db.close());

		const totalInserted = HISTORY_LIMIT + 10;
		for (let i = 0; i < totalInserted; i += 1) {
			db.insertMessage("alice", `msg-${i}`);
		}

		const recent = db.getRecentMessages();

		assert.equal(recent.length, HISTORY_LIMIT);
		assert.equal(recent[0].content, "msg-10");
		assert.equal(recent[recent.length - 1].content, `msg-${totalInserted - 1}`);

		for (let i = 1; i < recent.length; i += 1) {
			assert.ok(recent[i].id > recent[i - 1].id);
		}
	});
});
