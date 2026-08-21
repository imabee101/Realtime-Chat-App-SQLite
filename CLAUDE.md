# Realtime-Chat-App-SQLite

Single-room, real-time chat: TypeScript + Express + Socket.IO server, SQLite persistence via `better-sqlite3`, a vanilla-TS client bundled with webpack, no accounts.

## Commands (verified)

- `npm run dev` — `tsx watch --env-file=.env src/server/index.ts` + `webpack --watch` in parallel via `concurrently`. **Requires `.env` to exist** (`cp .env.example .env` first) — `--env-file` hard-fails with `.env: not found` otherwise, it does not silently fall back to defaults.
- `npm run build` — `tsc -p tsconfig.server.build.json` then `webpack --mode production`. Produces `dist/server/*.js`, `dist/shared/*.js`, and `public/bundle.js`.
- `npm start` — `node dist/server/index.js`. Runs compiled output only; no `--env-file`, so production config comes from real process env vars (e.g. what `docker-compose.yml` sets), not a baked-in `.env`.
- `npm test` — `tsx --test "src/**/*.test.ts"` (Node's built-in test runner, no Jest/Vitest). All tests are colocated with source — there is no separate `tests/` directory.
- `npm run typecheck` — `tsc -p tsconfig.server.json --noEmit && tsc -p tsconfig.client.json --noEmit`. Note this uses `tsconfig.server.json` (includes tests), while `npm run build` uses the separate `tsconfig.server.build.json` (excludes `*.test.ts`) — two server tsconfigs exist on purpose, not a duplicate.
- `npm run lint` — `biome lint .`.
- `docker compose up --build` — builds the multi-stage `Dockerfile` and starts the app on port 3000 with a persistent named volume. Not exercised in this environment (no local Docker); verify manually before relying on it.

## File map

- `src/shared/events.ts` — Zod schemas + typed Socket.IO event interfaces, imported by both server and client.
- `src/server/` — `index.ts` (entrypoint: listen + graceful shutdown), `app.ts` (`createServer()`, no `.listen()`, used by tests), `env.ts` (`PORT`/`DB_PATH`), `db.ts` (SQLite access), `socket.ts` (connection/event handlers, rate limiting). Tests live alongside as `*.test.ts`.
- `src/client/` — `main.ts` (DOM wiring, join form), `socket.ts` (typed `socket.io-client` instance), `render.ts` (DOM rendering — `textContent`/`createElement` only, never `innerHTML`).
- `public/` — `index.html`, hand-authored `style.css` (not run through webpack), `fonts/*.woff2` (self-hosted `@fontsource` files, committed as static assets — webpack does **not** copy or regenerate them), `bundle.js` (webpack output, gitignored).
- `dist/` — `tsc` output for `src/server` and `src/shared`, gitignored.

## Convention deltas

- Biome (`@biomejs/biome`), not ESLint + Prettier — one config file (`biome.json`), one dependency, `npm run lint` / `npm run format`.
- `src/server/db.ts` is hand-rolled `better-sqlite3` with two prepared statements — no ORM, no migration tool. There are no accounts and no schema beyond one `messages` table, so an ORM would be pure overhead.
- No `dotenv` dependency. Dev config comes from the `--env-file=.env` flag on `tsx watch` (Node's native env-file loading); `npm start` reads real process env vars only, matching how `docker-compose.yml` supplies them.
- ESM throughout (`"type": "module"`), `import.meta.dirname` in place of `__dirname` (used in `app.ts` to resolve the `public/` static-file path).

## Invariants and gotchas

- Default `PORT=3000`, default `DB_PATH=./data/chat.db` (see `src/server/env.ts`). `db.ts` creates the parent directory itself (`mkdirSync(..., { recursive: true })`) — no manual `mkdir data/` step needed.
- `chat.db` (`*.db`) and `.env` are gitignored, along with `dist/` and `public/bundle.js` (build artifacts).
- `docker-compose.yml`'s named volume is `chat-data`, mounted at `/app/data`, with `DB_PATH=/app/data/chat.db` set via `environment:` — not baked into the image.
- The per-socket rate limiter (token bucket, 5 burst / ~1 per second refill) and the presence counter are in-memory state scoped to the running process — single-instance only, no shared store. A client that reconnects gets a fresh bucket, so the limiter deters accidental flooding, not a determined attacker cycling connections. This is a documented limitation of the anonymous, no-accounts design, not a bug to fix.
- `chat:message` never carries a client-supplied username — the server attaches `socket.data.username` (set once at `user:join`) to every persisted/broadcast message, so a client cannot spoof a different name per message.

## Standards exceptions

- **CI has no deploy/artifact-promotion/rollback stage.** `.github/workflows/ci.yml` runs typecheck, lint, test, build, and `docker build .` (image builds, no push) and stops there. This repo has no deploy target — there is nothing to promote to or roll back. EXCEPTION, not a gap.
- **Single global chat room, no user accounts.** This is the deliberate product scope for an anonymous demo app, not a missing multi-room or auth feature. EXCEPTION, not a gap.
