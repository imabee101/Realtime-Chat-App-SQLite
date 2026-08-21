import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
	joinPayloadSchema,
	MESSAGE_MAX_LEN,
	messageContentSchema,
	messagePayloadSchema,
	USERNAME_MAX_LEN,
	usernameSchema,
} from "./events.js";

describe("usernameSchema", () => {
	test("accepts a valid username", () => {
		const result = usernameSchema.safeParse("Alice_01");
		assert.equal(result.success, true);
		if (result.success) {
			assert.equal(result.data, "Alice_01");
		}
	});

	test("trims surrounding whitespace", () => {
		const result = usernameSchema.safeParse("  Bob  ");
		assert.equal(result.success, true);
		if (result.success) {
			assert.equal(result.data, "Bob");
		}
	});

	test("rejects an empty string", () => {
		const result = usernameSchema.safeParse("");
		assert.equal(result.success, false);
	});

	test("rejects a whitespace-only string", () => {
		const result = usernameSchema.safeParse("   ");
		assert.equal(result.success, false);
	});

	test("rejects a string over the max length", () => {
		const tooLong = "a".repeat(USERNAME_MAX_LEN + 1);
		const result = usernameSchema.safeParse(tooLong);
		assert.equal(result.success, false);
	});

	test("accepts a string at exactly the max length", () => {
		const atMax = "a".repeat(USERNAME_MAX_LEN);
		const result = usernameSchema.safeParse(atMax);
		assert.equal(result.success, true);
	});

	test("rejects a username containing '<'", () => {
		const result = usernameSchema.safeParse("<script>");
		assert.equal(result.success, false);
	});

	test("rejects a username containing a control character", () => {
		const result = usernameSchema.safeParse("Alice\x01Bob");
		assert.equal(result.success, false);
	});
});

describe("messageContentSchema", () => {
	test("accepts valid content", () => {
		const result = messageContentSchema.safeParse("Hello, world!");
		assert.equal(result.success, true);
		if (result.success) {
			assert.equal(result.data, "Hello, world!");
		}
	});

	test("rejects an empty string", () => {
		const result = messageContentSchema.safeParse("");
		assert.equal(result.success, false);
	});

	test("rejects a string over the max length", () => {
		const tooLong = "a".repeat(MESSAGE_MAX_LEN + 1);
		const result = messageContentSchema.safeParse(tooLong);
		assert.equal(result.success, false);
	});

	test("accepts a string at exactly the max length", () => {
		const atMax = "a".repeat(MESSAGE_MAX_LEN);
		const result = messageContentSchema.safeParse(atMax);
		assert.equal(result.success, true);
	});

	test("strips control characters before validating", () => {
		const result = messageContentSchema.safeParse("Hi\x01there");
		assert.equal(result.success, true);
		if (result.success) {
			assert.equal(result.data, "Hithere");
		}
	});

	test("rejects content that is only control characters", () => {
		const result = messageContentSchema.safeParse("\x01\x02\x03");
		assert.equal(result.success, false);
	});
});

describe("joinPayloadSchema", () => {
	test("accepts a valid join payload", () => {
		const result = joinPayloadSchema.safeParse({ username: "Alice" });
		assert.equal(result.success, true);
	});

	test("rejects a join payload with a disallowed-character username", () => {
		const result = joinPayloadSchema.safeParse({ username: "<Alice>" });
		assert.equal(result.success, false);
	});

	test("rejects a join payload with an empty username", () => {
		const result = joinPayloadSchema.safeParse({ username: "" });
		assert.equal(result.success, false);
	});
});

describe("messagePayloadSchema", () => {
	test("accepts a valid message payload", () => {
		const result = messagePayloadSchema.safeParse({ content: "hi there" });
		assert.equal(result.success, true);
	});

	test("rejects a message payload over the max length", () => {
		const result = messagePayloadSchema.safeParse({
			content: "a".repeat(MESSAGE_MAX_LEN + 1),
		});
		assert.equal(result.success, false);
	});

	test("rejects a message payload with empty content", () => {
		const result = messagePayloadSchema.safeParse({ content: "" });
		assert.equal(result.success, false);
	});
});
