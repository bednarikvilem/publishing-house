FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install

# Copy source
COPY . .

EXPOSE 5173

CMD ["bun", "--hot", "src/index.ts"]
