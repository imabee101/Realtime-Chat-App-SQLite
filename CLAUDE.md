# Realtime-Chat-App-SQLite

Single-room, real-time chat: TypeScript + Bun.serve + native WebSocket, SQLite persistence via `bun:sqlite`, a vanilla-TS client bundled with `bun build`, no accounts.

## Commands (verified)

- `bun run dev` — `bun --watch --env-file=.env src/server/index.ts` + `bun build --watch` in parallel via `bun run --parallel`. **Requires `.env` to exist** (`cp .env.example .env` first) — the `dev:server` script checks `test -f .env` because Bun's `--env-file` does not error on a missing file.
- `bun run build` — `bun build --target=bun` for the server then `bun build --target=browser` for the client. Produces `dist/server/index.js` and `public/bundle.js`.
- `bun start` — `bun dist/server/index.js`. Runs compiled output only; no `--env-file`, so production config comes from real process env vars (e.g. what `docker-compose.yml` sets), not a baked-in `.env`.
- `bun test` — `bun test --isolate`. All tests are colocated with source — there is no separate `tests/` directory.
- `bun run typecheck` — `bunx tsc -p tsconfig.server.json --noEmit && bunx tsc -p tsconfig.client.json --noEmit`. Bun's compiler does not typecheck; `tsc --noEmit` with `strict: true` is the typecheck. There is no server emit tsconfig.
- `bun run lint` — `biome lint .`.
- `docker compose up --build` — builds the multi-stage `Dockerfile` (`oven/bun:1.4.0`) and starts the app on port 3000 with a persistent named volume. Not exercised in this environment (no local Docker); verify manually before relying on it.

## File map

- `src/shared/events.ts` — Zod schemas + JSON WebSocket envelope types, imported by both server and client.
- `src/server/` — `index.ts` (entrypoint: listen + graceful shutdown), `app.ts` (`createServer()`, used by tests), `env.ts` (`PORT`/`DB_PATH`), `db.ts` (`bun:sqlite`), `socket.ts` (connection/event handlers, rate limiting). Tests live alongside as `*.test.ts`.
- `src/client/` — `main.ts` (DOM wiring, join form), `socket.ts` (browser `WebSocket` + reconnect + envelope acks), `render.ts` (DOM rendering — `textContent`/`createElement` only, never `innerHTML`).
- `public/` — `index.html`, hand-authored `style.css` (not run through the bundler), `fonts/*.woff2` (self-hosted files, committed as static assets — `bun build` does **not** copy or regenerate them), `bundle.js` (`bun build` output, gitignored).
- `dist/` — `bun build --target=bun` server output, gitignored.

## Convention deltas

- Biome (`@biomejs/biome`), not ESLint + Prettier — one config file (`biome.json`), one dependency, `bun run lint` / `bun run format`. Bun has no formatter/linter.
- `src/server/db.ts` is hand-rolled `bun:sqlite` with two prepared statements — no ORM, no migration tool. There are no accounts and no schema beyond one `messages` table, so an ORM would be pure overhead.
- No `dotenv` dependency. Dev config comes from `--env-file=.env` on `bun --watch`; `bun start` reads real process env vars only, matching how `docker-compose.yml` supplies them.
- ESM throughout (`"type": "module"`), `import.meta.dirname` in place of `__dirname` (used in `app.ts` to resolve the `public/` static-file path).
- Package manager is Bun (`bun.lock`, `bun install`). Commands are `bun`; do not use npm or Node.

## Invariants and gotchas

- Default `PORT=3000`, default `DB_PATH=./data/chat.db` (see `src/server/env.ts`). `db.ts` creates the parent directory itself (`mkdirSync(..., { recursive: true })`) — no manual `mkdir data/` step needed.
- `chat.db` (`*.db`) and `.env` are gitignored, along with `dist/` and `public/bundle.js` (build artifacts).
- `docker-compose.yml`'s named volume is `chat-data`, mounted at `/app/data`, with `DB_PATH=/app/data/chat.db` set via `environment:` — not baked into the image.
- The per-socket rate limiter (token bucket, 5 burst / ~1 per second refill) and the presence counter are in-memory state scoped to the running process — single-instance only, no shared store. A client that reconnects gets a fresh bucket, so the limiter deters accidental flooding, not a determined attacker cycling connections. This is a documented limitation of the anonymous, no-accounts design, not a bug to fix.
- `chat:message` never carries a client-supplied username — the server attaches `ws.data.username` (set once at `user:join`) to every persisted/broadcast message, so a client cannot spoof a different name per message.

## Standards exceptions

- **CI has no deploy/artifact-promotion/rollback stage.** `.github/workflows/ci.yml` runs typecheck, lint, test, build, and `docker build .` (image builds, no push) and stops there. This repo has no deploy target — there is nothing to promote to or roll back. EXCEPTION, not a gap.
- **Single global chat room, no user accounts.** This is the deliberate product scope for an anonymous demo app, not a missing multi-room or auth feature. EXCEPTION, not a gap.
