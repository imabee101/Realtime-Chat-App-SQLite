import { createServer } from "./app.js";
import { env } from "./env.js";

const { server, db } = createServer(env.DB_PATH, env.PORT);

console.log(`Server listening on port ${server.port}`);

function shutdown(signal: string): void {
	console.log(`Received ${signal}, shutting down`);
	void server.stop(true).then(() => {
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
