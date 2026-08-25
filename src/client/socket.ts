import type {
	ChatMessage,
	ClientToServerEnvelope,
	JoinAck,
	MessageAck,
	ServerToClientEnvelope,
} from "../shared/events";

type ConnectionHandler = () => void;
type PresenceHandler = (payload: { count: number }) => void;
type HistoryHandler = (payload: { messages: ChatMessage[] }) => void;
type MessageHandler = (payload: { message: ChatMessage }) => void;

const INITIAL_RECONNECT_MS = 500;
const MAX_RECONNECT_MS = 5000;

function wsUrl(): string {
	const protocol = location.protocol === "https:" ? "wss:" : "ws:";
	return `${protocol}//${location.host}/ws`;
}

function parseEnvelope(raw: string): ServerToClientEnvelope | undefined {
	try {
		return JSON.parse(raw) as ServerToClientEnvelope;
	} catch {
		return undefined;
	}
}

class ChatSocket {
	active = true;
	private ws: WebSocket | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private reconnectDelayMs = INITIAL_RECONNECT_MS;
	private nextId = 0;
	private readonly pending = new Map<string, (ack: JoinAck | MessageAck) => void>();
	private readonly connectHandlers: ConnectionHandler[] = [];
	private readonly disconnectHandlers: ConnectionHandler[] = [];
	private readonly connectErrorHandlers: ConnectionHandler[] = [];
	private readonly presenceHandlers: PresenceHandler[] = [];
	private readonly historyHandlers: HistoryHandler[] = [];
	private readonly messageHandlers: MessageHandler[] = [];

	constructor() {
		this.connect();
	}

	on(event: "connect" | "disconnect" | "connect_error", handler: ConnectionHandler): void;
	on(event: "presence:count", handler: PresenceHandler): void;
	on(event: "chat:history", handler: HistoryHandler): void;
	on(event: "chat:message", handler: MessageHandler): void;
	on(
		event:
			| "connect"
			| "disconnect"
			| "connect_error"
			| "presence:count"
			| "chat:history"
			| "chat:message",
		handler: ConnectionHandler | PresenceHandler | HistoryHandler | MessageHandler,
	): void {
		switch (event) {
			case "connect":
				this.connectHandlers.push(handler as ConnectionHandler);
				break;
			case "disconnect":
				this.disconnectHandlers.push(handler as ConnectionHandler);
				break;
			case "connect_error":
				this.connectErrorHandlers.push(handler as ConnectionHandler);
				break;
			case "presence:count":
				this.presenceHandlers.push(handler as PresenceHandler);
				break;
			case "chat:history":
				this.historyHandlers.push(handler as HistoryHandler);
				break;
			case "chat:message":
				this.messageHandlers.push(handler as MessageHandler);
				break;
		}
	}

	emit(
		event: "user:join",
		payload: { username: string },
		ack: (res: JoinAck) => void,
	): void;
	emit(
		event: "chat:message",
		payload: { content: string },
		ack: (res: MessageAck) => void,
	): void;
	emit(
		...args:
			| [
					event: "user:join",
					payload: { username: string },
					ack: (res: JoinAck) => void,
			  ]
			| [
					event: "chat:message",
					payload: { content: string },
					ack: (res: MessageAck) => void,
			  ]
	): void {
		const [event, payload, ack] = args;
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			ack({ ok: false, error: "Not connected" });
			return;
		}
		this.nextId += 1;
		const id = String(this.nextId);
		this.pending.set(id, ack as (res: JoinAck | MessageAck) => void);
		const envelope = { id, event, payload } as ClientToServerEnvelope;
		this.ws.send(JSON.stringify(envelope));
	}

	private connect(): void {
		this.active = true;
		const ws = new WebSocket(wsUrl());
		this.ws = ws;

		ws.addEventListener("open", () => {
			this.reconnectDelayMs = INITIAL_RECONNECT_MS;
			for (const handler of this.connectHandlers) {
				handler();
			}
		});

		ws.addEventListener("message", (event) => {
			if (typeof event.data !== "string") {
				return;
			}
			const envelope = parseEnvelope(event.data);
			if (!envelope) {
				return;
			}
			this.dispatch(envelope);
		});

		ws.addEventListener("close", () => {
			this.flushPending("Not connected");
			for (const handler of this.disconnectHandlers) {
				handler();
			}
			this.scheduleReconnect();
		});

		ws.addEventListener("error", () => {
			for (const handler of this.connectErrorHandlers) {
				handler();
			}
		});
	}

	private dispatch(envelope: ServerToClientEnvelope): void {
		if (envelope.event === "ack") {
			const pending = this.pending.get(envelope.id);
			this.pending.delete(envelope.id);
			pending?.(envelope.payload);
			return;
		}
		if (envelope.event === "presence:count") {
			for (const handler of this.presenceHandlers) {
				handler(envelope.payload);
			}
			return;
		}
		if (envelope.event === "chat:history") {
			for (const handler of this.historyHandlers) {
				handler(envelope.payload);
			}
			return;
		}
		for (const handler of this.messageHandlers) {
			handler(envelope.payload);
		}
	}

	private flushPending(error: string): void {
		for (const ack of this.pending.values()) {
			ack({ ok: false, error });
		}
		this.pending.clear();
	}

	private scheduleReconnect(): void {
		if (!this.active) {
			return;
		}
		if (this.reconnectTimer !== null) {
			return;
		}
		const delay = this.reconnectDelayMs;
		this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, MAX_RECONNECT_MS);
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			this.connect();
		}, delay);
	}
}

export const socket = new ChatSocket();
