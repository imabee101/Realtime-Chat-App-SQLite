import type { ChatMessage } from "../shared/events";

const timeFormatter = new Intl.DateTimeFormat(undefined, {
	hour: "numeric",
	minute: "2-digit",
});

export function buildMessageRow(
	message: ChatMessage,
	localUsername: string,
): HTMLLIElement {
	const isOwn = message.username === localUsername;

	const row = document.createElement("li");
	row.className = `message-row ${isOwn ? "message-row--own" : "message-row--other"}`;

	const bubble = document.createElement("div");
	bubble.className = "message-bubble";

	const meta = document.createElement("div");
	meta.className = "message-meta";

	const username = document.createElement("span");
	username.className = "message-username";
	username.textContent = message.username;
	meta.appendChild(username);

	const time = document.createElement("time");
	time.className = "message-time";
	const createdAt = new Date(message.createdAt);
	time.textContent = timeFormatter.format(createdAt);
	time.title = createdAt.toISOString();
	time.dateTime = createdAt.toISOString();
	meta.appendChild(time);

	const content = document.createElement("p");
	content.className = "message-content";
	content.textContent = message.content;

	bubble.appendChild(meta);
	bubble.appendChild(content);
	row.appendChild(bubble);

	return row;
}

export function buildEmptyState(): HTMLLIElement {
	const row = document.createElement("li");
	row.className = "empty-state";
	row.textContent = "No messages yet — say something.";
	return row;
}

export function buildNewMessagesPill(): HTMLButtonElement {
	const pill = document.createElement("button");
	pill.type = "button";
	pill.className = "new-messages-pill";
	pill.textContent = "new messages ↓";
	return pill;
}
