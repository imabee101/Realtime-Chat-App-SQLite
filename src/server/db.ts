import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { type ChatMessage, HISTORY_LIMIT } from "../shared/events.js";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS messages (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	username TEXT NOT NULL,
	content TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
)
`;

export function createDb(path: string) {
	mkdirSync(dirname(path), { recursive: true });

	const db = new Database(path);
	db.pragma("journal_mode = WAL");
	db.exec(SCHEMA);

	const insertStatement = db.prepare<[string, string], ChatMessage>(
		"INSERT INTO messages (username, content) VALUES (?, ?) RETURNING id, username, content, created_at AS createdAt",
	);
	const recentStatement = db.prepare<[number], ChatMessage>(
		"SELECT id, username, content, created_at AS createdAt FROM messages ORDER BY id DESC LIMIT ?",
	);

	function insertMessage(username: string, content: string): ChatMessage {
		const message = insertStatement.get(username, content);
		if (!message) {
			throw new Error("Failed to insert message");
		}
		return message;
	}

	function getRecentMessages(limit = HISTORY_LIMIT): ChatMessage[] {
		return recentStatement.all(limit).reverse();
	}

	function close(): void {
		db.close();
	}

	return { insertMessage, getRecentMessages, close };
}

export type Db = ReturnType<typeof createDb>;
