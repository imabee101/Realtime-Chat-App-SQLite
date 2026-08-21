# Realtime Chat App (SQLite)

A real-time, single-room chat app built with TypeScript, Express, Socket.IO, and SQLite. Dark "Signal"-inspired UI, hardened server-side validation, and a fully typed client/server event contract.

## Features

- Real-time messaging over Socket.IO, broadcast to every connected client
- Message history persisted to SQLite (`better-sqlite3`), capped at the 100 most recent messages
- Server-side validated, rate-limited input — usernames and message content are checked with Zod on every event, never trusted from the client alone
- XSS-safe rendering — the client builds message DOM with `textContent`/`createElement` only, never `innerHTML`
- Dark, "Signal"-themed UI with a live connection-status indicator and presence count
- Docker support via a multi-stage `Dockerfile` and `docker-compose.yml` with a persistent named volume for the database

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/imabee101/Realtime-Chat-App-SQLite.git
cd Realtime-Chat-App-SQLite
npm install
```

Copy the example environment file (required — the dev server will not start without a `.env` file):

```bash
cp .env.example .env
```

## Running

Start the app in development mode (TypeScript server with hot reload + webpack watching the client bundle):

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

For a production build:

```bash
npm run build
npm start
```

### Running with Docker

```bash
docker compose up --build
```

This builds the image, starts the app on port 3000, and persists `chat.db` in a named Docker volume so history survives container restarts.

## Running tests

```bash
npm test
```

Runs the project's test suite (Node's built-in test runner via `tsx`) covering the shared event schemas and the SQLite data layer.

Other useful commands:

```bash
npm run typecheck   # type-check server and client, no emit
npm run lint         # Biome lint
```

## Usage

1. Enter a username and press Enter (or click "Enter chat") to join the room.
2. Type a message and press Enter (or click Send) to broadcast it to everyone connected.
3. Messages from other users appear in real time; the header shows the connection status and how many people are currently present.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

1. Fork the repository.
2. Create a new branch for your changes (`git checkout -b feature/your-feature`).
3. Make your changes.
4. Commit and push your changes to the new branch (`git add . && git commit -m "Add your feature" && git push origin feature/your-feature`).
5. Open a pull request on GitHub.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.
