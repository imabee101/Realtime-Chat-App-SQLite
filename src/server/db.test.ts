import { describe, expect, test } from "bun:test";
import { HISTORY_LIMIT } from "../shared/events.js";
import { createDb } from "./db.js";

describe("insertMessage", () => {
	test("returns a ChatMessage with a real id and createdAt", () => {
		const db = createDb(":memory:");
		try {
			const message = db.insertMessage("alice", "hello world");

			expect(message.username).toBe("alice");
			expect(message.content).toBe("hello world");
			expect(typeof message.id).toBe("number");
			expect(message.id).toBeGreaterThan(0);
			expect(typeof message.createdAt).toBe("string");
			expect(message.createdAt).toMatch(
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
			);
		} finally {
			db.close();
		}
	});

	test("assigns increasing ids across inserts", () => {
		const db = createDb(":memory:");
		try {
			const first = db.insertMessage("alice", "first");
			const second = db.insertMessage("alice", "second");

			expect(second.id).toBeGreaterThan(first.id);
		} finally {
			db.close();
		}
	});
});

describe("getRecentMessages", () => {
	test("returns inserted messages in ascending chronological order", () => {
		const db = createDb(":memory:");
		try {
			db.insertMessage("alice", "first");
			db.insertMessage("alice", "second");
			db.insertMessage("alice", "third");

			const recent = db.getRecentMessages();

			expect(recent.length).toBe(3);
			expect(recent.map((m) => m.content)).toEqual(["first", "second", "third"]);
			expect(recent[0].id).toBeLessThan(recent[1].id);
			expect(recent[1].id).toBeLessThan(recent[2].id);
		} finally {
			db.close();
		}
	});

	test("returns an empty array when no messages exist", () => {
		const db = createDb(":memory:");
		try {
			expect(db.getRecentMessages()).toEqual([]);
		} finally {
			db.close();
		}
	});

	test("caps results at HISTORY_LIMIT, keeping the most recent messages oldest-first", () => {
		const db = createDb(":memory:");
		try {
			const totalInserted = HISTORY_LIMIT + 10;
			for (let i = 0; i < totalInserted; i += 1) {
				db.insertMessage("alice", `msg-${i}`);
			}

			const recent = db.getRecentMessages();

			expect(recent.length).toBe(HISTORY_LIMIT);
			expect(recent[0].content).toBe("msg-10");
			expect(recent[recent.length - 1].content).toBe(`msg-${totalInserted - 1}`);

			for (let i = 1; i < recent.length; i += 1) {
				expect(recent[i].id).toBeGreaterThan(recent[i - 1].id);
			}
		} finally {
			db.close();
		}
	});
});
