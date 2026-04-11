# PB138 Project

TODO: Add description

## Tech Stack

- **Runtime:** Bun
- **Monorepo:** Turborepo
- **Frontend:** React, TailWindCSS, Shadcn/ui
- **Backend:** TypeScript
- **API:** Elysia
- **Database**: Drizzle, PostgreSQL
- **Validation:**
- **Language:** TypeScript

## Docker

Docker is responsible for running the components in their separate containers. The project consists of three components: frontend (web), backend (server), and database.
If you use WSL, you need have Docker Desktop installed on your Windows machine.
After installing and opening Docker Desktop and run `docker compose up --build -d` in the project root. You should see the running containers on your Docker Desktop. To access the web type http://localhost:5173/ into your browser.
Do not forget to run `docker compose down` after you are finished with your work.

## Prerequisites

- [Bun](https://bun.com/) 1.3.10+

### Installing Bun

**Linux / WSL:**
```bash
curl -fsSL https://bun.sh/install | bash
```

After installation, **restart** your terminal and verify:
```bash
bun --version
```

If you get `command not found`, you need to add Bun to your PATH manually:

1. Open your shell config file `~/.bashrc`
2. Add these lines anywhere in the config:
```bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
```

3. Reload the config:
```bash
source ~/.bashrc
```

## Getting Started
```bash
# Install dependencies
bun install

# Start all apps in dev mode
bun dev
```

## Project Structure
```
├── docs/              # Project documentation and diagrams
├── apps/
│   ├── server/        # Backend API
│   └── web/           # React frontend
├── packages/
│   └── shared/        # Shared types & Zod schemas
├── turbo.json
└── package.json
```

## Commands

- `bun dev` — start all apps in dev mode
- `bun build` — build all apps
- `bun test` — run tests
