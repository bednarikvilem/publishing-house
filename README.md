# PB138 Project — Newspaper Platform

A web-based platform for a publication house managing multiple newspapers, with roles ranging from Visitor to Director.

## Tech Stack

- **Runtime:** Bun
- **Monorepo:** Turborepo
- **Frontend:** React 19, React Router, TailwindCSS, shadcn/ui, Lexical (rich text editor)
- **API:** Elysia, OpenAPI (`@elysiajs/openapi`)
- **Auth:** JWT (`@elysiajs/jwt`), `Bun.password` (argon2)
- **Database:** Drizzle ORM, PostgreSQL 17
- **Cache:** Redis (via `Bun.redis`)
- **Image Storage:** MinIO (S3-compatible, self-hosted)
- **Email:** Nodemailer (Mailtrap sandbox for development)
- **Linting / Formatting:** ESLint, Prettier
- **Language:** TypeScript

## Project Structure

```
├── apps/
│   ├── server/        # Elysia backend API
│   └── web/           # React frontend
├── packages/
│   └── shared/        # Shared types
├── docs/              # Documentation, diagrams, API contract
├── docker-compose.yml
├── turbo.json
└── package.json
```

---

## Running with Docker (full stack)

Docker runs all components in isolated containers. This is the simplest way to get everything running.

**Prerequisites:** Docker Desktop installed and running (on Windows/WSL: install Docker Desktop on Windows).

### First-time setup

```bash
# 1. Copy environment file and fill in values
cp .env.example .env

# 2. Install dependencies (needed for the bun workspace)
bun install

# 3. Start all containers
docker compose up --build -d

# 4. Apply the database migrations (creates schema + RLS policies)
cd apps/server && bun db:migrate

# 5. Seed the database with initial data
bun db:seed
```

### Daily use

```bash
docker compose up -d          # start (keeps existing data)
docker compose down           # stop (keeps existing data)
```

> **Warning:** `docker compose up --build -d` followed by `docker compose down -v` will **wipe** the database volume.

Use `--build` again only when `package.json` or the Bun version changes.

### Accessing the app

| Service        | URL                          |
|----------------|------------------------------|
| Frontend       | http://localhost:5173        |
| Backend API    | http://localhost:3000        |
| MinIO console  | http://localhost:9001        |

---

## Running in dev mode (recommended for development)

In dev mode you run the server and frontend directly on your machine with hot reload. Only the infrastructure services (database, Redis, MinIO) run in Docker.

### Prerequisites

Install Bun 1.3.10+:

```bash
# Linux / WSL
curl -fsSL https://bun.sh/install | bash
```

Restart your terminal and verify:

```bash
bun --version
```

If you get `command not found`, add Bun to your PATH in `~/.bashrc`:

```bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
source ~/.bashrc
```

### Setup

```bash
# 1. Copy environment file and fill in values
cp .env.example .env

# 2. Install dependencies
bun install

# 3. Start only the infrastructure containers
docker compose up db redis minio minio-init -d

# 4. Apply the database migrations (first time only, or after pulling new ones)
cd apps/server && bun db:migrate

# 5. Seed the database (first time only)
bun db:seed
```

### Starting the dev servers

Open two terminals:

```bash
# Terminal 1 — backend (http://localhost:3000)
cd apps/server && bun run dev

# Terminal 2 — frontend (http://localhost:5173)
cd apps/web && bun run dev
```

Changes are applied automatically; refresh the browser for frontend changes.

### After each `git pull`

```bash
bun install                       # pick up new dependencies
cd apps/server && bun db:migrate  # apply any new migrations
```

> If your DB was built with the old `db:push` workflow (i.e. it already has tables that the early migration files would re-create), you need a one-time bootstrap to mark those migrations as applied. See the comment in `apps/server/scripts/bootstrap-migrations.ts` and run e.g. `bun db:bootstrap 0001_add_article_views` before the first `db:migrate`.

---

## Docker components

| Service      | Image                  | Port(s)       | Purpose                                                              |
|--------------|------------------------|---------------|----------------------------------------------------------------------|
| `db`         | `postgres:17`          | 5432          | Primary PostgreSQL database. Data is persisted in a named volume.    |
| `server`     | (local Dockerfile)     | 3000          | Elysia backend API. Serves REST endpoints consumed by the frontend.  |
| `web`        | (local Dockerfile)     | 5173          | React frontend. Served as a static Bun bundle.                       |
| `redis`      | `redis:8-alpine`       | 6379          | In-memory cache and session store used by the backend.               |
| `minio`      | `minio/minio:latest`   | 9000, 9001    | S3-compatible object storage for article images. Console on 9001.   |
| `minio-init` | `minio/mc`             | —             | One-time init container: creates the image bucket and sets it public.|

---

## Linting and formatting

Before committing, run these in `apps/web`:

```bash
bun run lint      # check for style issues (fix before committing)
bun run format    # auto-fix formatting
```

---

## Database tooling

```bash
cd apps/server

bun db:generate                  # generate a new migration .sql from changes to schema.ts
bun db:migrate                   # apply pending migrations
bun db:bootstrap <migration-tag> # mark a migration as already-applied without running it
bun db:seed                      # populate with initial/seed data
bun db:studio                    # open Drizzle Studio at https://local.drizzle.studio
```

Row-Level Security policies live in `apps/server/drizzle/0002_enable_rls.sql` and are applied by `bun db:migrate`. The app connects as the non-superuser `app_user` role created by that migration; the migration also sets up the session GUCs (`app.user_id`, `app.newspaper_id`, `app.roles`) used by the policies.

---

## Email (development)

The project uses [Mailtrap](https://mailtrap.io) as a sandbox SMTP server so outgoing emails are captured and never delivered. Sign up for a free account, go to **Inboxes → SMTP Settings**, and copy the credentials into your `.env`:

```
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-username
SMTP_PASS=your-mailtrap-password
```
