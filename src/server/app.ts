import { createServer as createHttpServer } from "node:http";
import path from "node:path";
import express from "express";
import { Server } from "socket.io";
import type {
	ClientToServerEvents,
	InterServerEvents,
	ServerToClientEvents,
	SocketData,
} from "../shared/events.js";
import { createDb } from "./db.js";
import { registerSocketHandlers } from "./socket.js";

export function createServer(dbPath: string) {
	const app = express();
	const httpServer = createHttpServer(app);
	const io = new Server<
		ClientToServerEvents,
		ServerToClientEvents,
		InterServerEvents,
		SocketData
	>(httpServer);
	const db = createDb(dbPath);

	app.use(express.static(path.join(import.meta.dirname, "../../public")));

	registerSocketHandlers(io, db);

	return { app, httpServer, io, db };
}
