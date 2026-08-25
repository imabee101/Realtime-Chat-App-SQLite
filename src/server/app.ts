import path from "node:path";
import type { Server } from "bun";
import type { SocketData } from "../shared/events.js";
import { createDb } from "./db.js";
import { createWebsocketHandlers } from "./socket.js";

export function createServer(dbPath: string, port = 0) {
	const db = createDb(dbPath);
	const { websocket, setServer } = createWebsocketHandlers(db);
	const publicDir = path.join(import.meta.dirname, "../../public");

	const server = Bun.serve<SocketData>({
		port,
		hostname: "0.0.0.0",
		routes: {
			"/ws": (req: Request, srv: Server<SocketData>) => {
				if (srv.upgrade(req, { data: {} })) {
					return undefined;
				}
				return new Response("Upgrade failed", { status: 400 });
			},
			"/*": { dir: publicDir },
		},
		websocket,
	});

	setServer(server);
	return { server, db };
}
