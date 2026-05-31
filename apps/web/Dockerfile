FROM oven/bun:1.3.11 AS base
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY tests/package.json ./tests/package.json

RUN bun install --frozen-lockfile

COPY apps/server/ ./apps/server/
COPY apps/web/ ./apps/web/

WORKDIR /app/apps/web

ENV NODE_ENV=production
EXPOSE 5173

CMD ["bun", "src/index.ts"]
