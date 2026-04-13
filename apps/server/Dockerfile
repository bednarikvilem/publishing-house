# Použijeme Bun jako základ
FROM oven/bun:1 AS runner
WORKDIR /app

# Kopírujeme soubory ze složky out, kterou turbo vytvořilo v rootu
# POZOR: Docker musí vidět root projektu (vysvětleno níže)
COPY out/json/ .
COPY out/json/bun.lock ./bun.lock

# Instalace závislostí s tvým novým konzistentním lockfilem
RUN bun install --frozen-lockfile

# Kopírování zdrojových kódů
COPY out/full/ .

# Spuštění serveru
CMD ["bun", "run", "apps/server/src/index.ts"]