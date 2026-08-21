import { MESSAGE_MAX_LEN, USERNAME_MAX_LEN, type ChatMessage } from "../shared/events";
import { buildEmptyState, buildMessageRow, buildNewMessagesPill } from "./render";
import { socket } from "./socket";

function requireElement<T extends HTMLElement>(id: string): T {
	const el = document.getElementById(id);
	if (!el) {
		throw new Error(`Missing required element: #${id}`);
	}
	return el as T;
}

const connectionStatusEl = requireElement<HTMLElement>("connection-status");
const connectionStatusText = requireElement<HTMLElement>("connection-status-text");
const presenceCountEl = requireElement<HTMLElement>("presence-count");

const joinScreen = requireElement<HTMLElement>("join-screen");
const joinForm = requireElement<HTMLFormElement>("join-form");
const usernameInput = requireElement<HTMLInputElement>("username-input");
const joinError = requireElement<HTMLElement>("join-error");

const chatScreen = requireElement<HTMLElement>("chat-screen");
const messageListWrapper = requireElement<HTMLElement>("message-list-wrapper");
const messageList = requireElement<HTMLUListElement>("message-list");

const composerForm = requireElement<HTMLFormElement>("composer-form");
const messageInput = requireElement<HTMLInputElement>("message-input");
const composerSubmit = requireElement<HTMLButtonElement>("composer-submit");
const composerError = requireElement<HTMLElement>("composer-error");

usernameInput.maxLength = USERNAME_MAX_LEN;
messageInput.maxLength = MESSAGE_MAX_LEN;

let localUsername = "";
let newMessagesPill: HTMLButtonElement | null = null;

const NEAR_BOTTOM_THRESHOLD_PX = 100;

function isNearBottom(): boolean {
	const distance =
		messageListWrapper.scrollHeight -
		messageListWrapper.scrollTop -
		messageListWrapper.clientHeight;
	return distance <= NEAR_BOTTOM_THRESHOLD_PX;
}

function scrollToBottom(): void {
	messageListWrapper.scrollTop = messageListWrapper.scrollHeight;
}

function hideNewMessagesPill(): void {
	newMessagesPill?.remove();
	newMessagesPill = null;
}

function showNewMessagesPill(): void {
	if (newMessagesPill) {
		return;
	}
	newMessagesPill = buildNewMessagesPill();
	newMessagesPill.addEventListener("click", () => {
		scrollToBottom();
		hideNewMessagesPill();
	});
	messageListWrapper.appendChild(newMessagesPill);
}

messageListWrapper.addEventListener("scroll", () => {
	if (newMessagesPill && isNearBottom()) {
		hideNewMessagesPill();
	}
});

function renderHistory(messages: ChatMessage[]): void {
	messageList.replaceChildren();
	if (messages.length === 0) {
		messageList.appendChild(buildEmptyState());
	} else {
		for (const message of messages) {
			messageList.appendChild(buildMessageRow(message, localUsername));
		}
	}
	scrollToBottom();
}

function appendMessage(message: ChatMessage): void {
	const emptyState = messageList.querySelector(".empty-state");
	emptyState?.remove();

	const wasNearBottom = isNearBottom();
	messageList.appendChild(buildMessageRow(message, localUsername));

	if (wasNearBottom) {
		scrollToBottom();
	} else {
		showNewMessagesPill();
	}
}

type ConnectionState = "connected" | "reconnecting" | "offline";

function setConnectionState(state: ConnectionState): void {
	connectionStatusEl.dataset.state = state;
	connectionStatusText.textContent =
		state === "connected" ? "live" : state === "reconnecting" ? "reconnecting" : "offline";

	const disabled = state !== "connected";
	messageInput.disabled = disabled;
	composerSubmit.disabled = disabled;
}

setConnectionState("offline");

socket.on("connect", () => {
	setConnectionState("connected");
});

socket.on("disconnect", () => {
	setConnectionState(socket.active ? "reconnecting" : "offline");
});

socket.on("connect_error", () => {
	setConnectionState(socket.active ? "reconnecting" : "offline");
});

socket.on("presence:count", ({ count }) => {
	presenceCountEl.textContent = `${count} here`;
});

socket.on("chat:history", ({ messages }) => {
	renderHistory(messages);
});

socket.on("chat:message", ({ message }) => {
	appendMessage(message);
});

joinForm.addEventListener("submit", (event) => {
	event.preventDefault();
	const username = usernameInput.value.trim();
	joinError.textContent = "";

	localUsername = username;

	socket.emit("user:join", { username }, (ack) => {
		if (ack.ok) {
			joinScreen.hidden = true;
			chatScreen.hidden = false;
			scrollToBottom();
			messageInput.focus();
		} else {
			localUsername = "";
			joinError.textContent = ack.error;
		}
	});
});

composerForm.addEventListener("submit", (event) => {
	event.preventDefault();
	const content = messageInput.value;
	if (!content.trim()) {
		return;
	}

	messageInput.value = "";
	composerError.textContent = "";

	socket.emit("chat:message", { content }, (ack) => {
		if (!ack.ok) {
			composerError.textContent = ack.error;
		}
	});
});
