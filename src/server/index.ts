import { createServer } from "./app.js";
import { env } from "./env.js";

const { httpServer, io, db } = createServer(env.DB_PATH);

httpServer.listen(env.PORT, () => {
	console.log(`Server listening on port ${env.PORT}`);
});

function shutdown(signal: string): void {
	console.log(`Received ${signal}, shutting down`);
	io.close(() => {
		db.close();
		process.exit(0);
	});
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (error) => {
	console.error("Uncaught exception:", error);
	process.exit(1);
});

process.on("unhandledRejection", (reason) => {
	console.error("Unhandled rejection:", reason);
	process.exit(1);
});
