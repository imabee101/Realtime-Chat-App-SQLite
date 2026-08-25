import { z } from "zod";

export const USERNAME_MAX_LEN = 24;
export const MESSAGE_MAX_LEN = 1000;
export const HISTORY_LIMIT = 100;

export const usernameSchema = z
	.string()
	.trim()
	.min(1, "Username is required")
	.max(
		USERNAME_MAX_LEN,
		`Username must be ${USERNAME_MAX_LEN} characters or fewer`,
	)
	.regex(
		/^[\p{L}\p{N} _-]+$/u,
		"Username may only contain letters, numbers, spaces, underscores, and hyphens",
	);

// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally stripping raw control bytes from user input
const CONTROL_CHARS_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F]/gu;

const stripControlChars = (value: unknown): unknown =>
	typeof value === "string" ? value.replace(CONTROL_CHARS_PATTERN, "") : value;

export const messageContentSchema = z.preprocess(
	stripControlChars,
	z
		.string()
		.trim()
		.min(1, "Message is required")
		.max(
			MESSAGE_MAX_LEN,
			`Message must be ${MESSAGE_MAX_LEN} characters or fewer`,
		),
);

export const joinPayloadSchema = z.object({ username: usernameSchema });
export const messagePayloadSchema = z.object({ content: messageContentSchema });

export const clientEnvelopeSchema = z.object({
	id: z.string().min(1),
	event: z.enum(["user:join", "chat:message"]),
	payload: z.unknown(),
});

export interface ChatMessage {
	id: number;
	username: string;
	content: string;
	createdAt: string;
}

export type JoinAck = { ok: true } | { ok: false; error: string };
export type MessageAck =
	| { ok: true; message: ChatMessage }
	| { ok: false; error: string };

export type ClientToServerEnvelope =
	| { id: string; event: "user:join"; payload: { username: string } }
	| { id: string; event: "chat:message"; payload: { content: string } };

export type ServerToClientEnvelope =
	| { id: string; event: "ack"; payload: JoinAck | MessageAck }
	| { event: "chat:history"; payload: { messages: ChatMessage[] } }
	| { event: "chat:message"; payload: { message: ChatMessage } }
	| { event: "presence:count"; payload: { count: number } };

export interface SocketData {
	username?: string;
}
