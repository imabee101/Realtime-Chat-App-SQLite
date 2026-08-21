import { io, type Socket } from "socket.io-client";
import type {
	ClientToServerEvents,
	ServerToClientEvents,
} from "../shared/events";

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();
