# Realtime Chat App (SQLite)

A real-time, single-room chat app built with TypeScript, Bun, WebSockets, and SQLite. Dark "Signal"-inspired UI, hardened server-side validation, and a fully typed client/server event contract.

## Features

- Real-time messaging over WebSocket, broadcast to every connected client
- Message history persisted to SQLite (`bun:sqlite`), capped at the 100 most recent messages
- Server-side validated, rate-limited input — usernames and message content are checked with Zod on every event, never trusted from the client alone
- XSS-safe rendering — the client builds message DOM with `textContent`/`createElement` only, never `innerHTML`
- Dark, "Signal"-themed UI with a live connection-status indicator and presence count
- Docker support via a multi-stage `Dockerfile` (`oven/bun`) and `docker-compose.yml` with a persistent named volume for the database

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/imabee101/Realtime-Chat-App-SQLite.git
cd Realtime-Chat-App-SQLite
bun install
```

Copy the example environment file (required — the dev server will not start without a `.env` file):

```bash
cp .env.example .env
```

## Running

Start the app in development mode (TypeScript server with hot reload + `bun build` watching the client bundle):

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in the browser.

For a production build:

```bash
bun run build
bun start
```

### Running with Docker

```bash
docker compose up --build
```

This builds the image, starts the app on port 3000, and persists `chat.db` in a named Docker volume so history survives container restarts.

## Running tests

```bash
bun test
```

Runs the project's test suite (`bun:test`) covering the shared event schemas, the SQLite data layer, and a WebSocket round trip.

Other useful commands:

```bash
bun run typecheck   # type-check server and client, no emit
bun run lint         # Biome lint
```

## Usage

1. Enter a username and press Enter (or click "Enter chat") to join the room.
2. Type a message and press Enter (or click Send) to broadcast it to everyone connected.
3. Messages from other users appear in real time; the header shows the connection status and how many people are currently present.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.
