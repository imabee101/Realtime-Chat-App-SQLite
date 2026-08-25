import { describe, expect, test } from "bun:test";
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
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe("Alice_01");
		}
	});

	test("trims surrounding whitespace", () => {
		const result = usernameSchema.safeParse("  Bob  ");
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe("Bob");
		}
	});

	test("rejects an empty string", () => {
		const result = usernameSchema.safeParse("");
		expect(result.success).toBe(false);
	});

	test("rejects a whitespace-only string", () => {
		const result = usernameSchema.safeParse("   ");
		expect(result.success).toBe(false);
	});

	test("rejects a string over the max length", () => {
		const tooLong = "a".repeat(USERNAME_MAX_LEN + 1);
		const result = usernameSchema.safeParse(tooLong);
		expect(result.success).toBe(false);
	});

	test("accepts a string at exactly the max length", () => {
		const atMax = "a".repeat(USERNAME_MAX_LEN);
		const result = usernameSchema.safeParse(atMax);
		expect(result.success).toBe(true);
	});

	test("rejects a username containing '<'", () => {
		const result = usernameSchema.safeParse("<script>");
		expect(result.success).toBe(false);
	});

	test("rejects a username containing a control character", () => {
		const result = usernameSchema.safeParse("Alice\x01Bob");
		expect(result.success).toBe(false);
	});
});

describe("messageContentSchema", () => {
	test("accepts valid content", () => {
		const result = messageContentSchema.safeParse("Hello, world!");
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe("Hello, world!");
		}
	});

	test("rejects an empty string", () => {
		const result = messageContentSchema.safeParse("");
		expect(result.success).toBe(false);
	});

	test("rejects a string over the max length", () => {
		const tooLong = "a".repeat(MESSAGE_MAX_LEN + 1);
		const result = messageContentSchema.safeParse(tooLong);
		expect(result.success).toBe(false);
	});

	test("accepts a string at exactly the max length", () => {
		const atMax = "a".repeat(MESSAGE_MAX_LEN);
		const result = messageContentSchema.safeParse(atMax);
		expect(result.success).toBe(true);
	});

	test("strips control characters before validating", () => {
		const result = messageContentSchema.safeParse("Hi\x01there");
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBe("Hithere");
		}
	});

	test("rejects content that is only control characters", () => {
		const result = messageContentSchema.safeParse("\x01\x02\x03");
		expect(result.success).toBe(false);
	});
});

describe("joinPayloadSchema", () => {
	test("accepts a valid join payload", () => {
		const result = joinPayloadSchema.safeParse({ username: "Alice" });
		expect(result.success).toBe(true);
	});

	test("rejects a join payload with a disallowed-character username", () => {
		const result = joinPayloadSchema.safeParse({ username: "<Alice>" });
		expect(result.success).toBe(false);
	});

	test("rejects a join payload with an empty username", () => {
		const result = joinPayloadSchema.safeParse({ username: "" });
		expect(result.success).toBe(false);
	});
});

describe("messagePayloadSchema", () => {
	test("accepts a valid message payload", () => {
		const result = messagePayloadSchema.safeParse({ content: "hi there" });
		expect(result.success).toBe(true);
	});

	test("rejects a message payload over the max length", () => {
		const result = messagePayloadSchema.safeParse({
			content: "a".repeat(MESSAGE_MAX_LEN + 1),
		});
		expect(result.success).toBe(false);
	});

	test("rejects a message payload with empty content", () => {
		const result = messagePayloadSchema.safeParse({ content: "" });
		expect(result.success).toBe(false);
	});
});
