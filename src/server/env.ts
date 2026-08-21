const DEFAULT_PORT = 3000;
const DEFAULT_DB_PATH = "./data/chat.db";

function parsePort(raw: string | undefined): number {
	if (raw === undefined || raw === "") {
		return DEFAULT_PORT;
	}
	const parsed = Number(raw);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error(
			`Invalid PORT env var: ${raw} (must be a positive integer)`,
		);
	}
	return parsed;
}

export const env = {
	PORT: parsePort(process.env.PORT),
	DB_PATH: process.env.DB_PATH || DEFAULT_DB_PATH,
};
