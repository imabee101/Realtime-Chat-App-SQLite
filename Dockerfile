FROM oven/bun:1.4.0 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1.4.0
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=bun:bun /app/dist ./dist
COPY --from=build --chown=bun:bun /app/public ./public
RUN mkdir -p /app/data && chown bun:bun /app/data
USER bun
EXPOSE 3000
CMD ["bun", "dist/server/index.js"]
