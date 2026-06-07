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

# 4. Set up the database (creates schema + RLS policies)
cd apps/server && bun db:setup

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

# 4. Set up the database (first time only)
cd apps/server && bun db:setup

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

## Seed data

Running `bun db:seed` populates the database with the following five newspapers:

| Name | Slug | Categories |
|------|------|------------|
| AudioWire | `audiowire` | Pop & Rock, Rap, Electronic, Live Events |
| The Statline | `the-statline` | Mundial, Premier League, LaLiga, Transfers & Rumors, Match Analysis |
| The Binge Ledger | `the-binge-ledger` | Drama, Comedy & Sitcoms, Sci-Fi & Fantasy, Reality TV |
| ClaudeDaily | `claudedaily` | AI & Machine Learning, New Tech & Gadgets, Software & Coding, Cybersecurity |
| The PokéScope | `the-pokescope` | Video Games, Trading Card Game, Anime & Movies, Pokémon GO |

### Known seed credentials

| Account | Email | Password | Role |
|---------|-------|----------|------|
| System Administrator | `admin@newspapers.com` | `test1234` | SYSTEM_ADMINISTRATOR |
| Director | `director@claudedaily.cz` | `test1234` | DIRECTOR |
| ClaudeDaily manager/editor/author | `emma.bednarikova@email.cz` | `test1234` | NEWSPAPER_MANAGER, EDITOR, AUTHOR, REGISTERED_USER |
| ClaudeDaily test author | `jan.novak@claudedaily.cz` | `test1234` | AUTHOR, REGISTERED_USER |
| Registered user (all newspapers) | `seed@seed.com` | `test1234` | REGISTERED_USER |

### Re-seeding from scratch

There is no `db:reset` script. To wipe all data and re-seed, connect to the database and run:

```sql
TRUNCATE TABLE
    audit_logs, subscription_tokens, subscriptions,
    article_views, likes, comments, article_reviews,
    article_images, articles, newspaper_authors,
    user_roles, global_roles, article_category,
    users, newspapers
CASCADE;
```

Then run `bun db:seed` again.

---

## Database tooling

```bash
cd apps/server

bun db:setup                     # first-time init: push schema + apply RLS migrations
bun db:seed                      # populate with initial/seed data
bun db:generate                  # generate a new migration .sql from changes to schema.ts
bun db:migrate                   # apply pending migrations (use after git pull, not for first-time setup)
bun db:bootstrap <migration-tag> # mark a migration as already-applied without running it
bun db:studio                    # open Drizzle Studio at https://local.drizzle.studio
```

**First-time vs. ongoing:** use `bun db:setup` on a fresh database (new Docker volume). Use `bun db:migrate` to pick up new migrations after a `git pull`.

Row-Level Security policies live in `apps/server/drizzle/0002_enable_rls.sql`. The app connects as the non-superuser `app_user` role created by that migration; it also sets up the session GUCs (`app.user_id`, `app.newspaper_id`, `app.roles`) used by the policies.

### Creating a new migration

For plain schema changes:

1. Edit `apps/server/src/db/schema.ts`.
2. `bun run db:generate` — writes the next `drizzle/NNNN_*.sql` and a matching snapshot in `drizzle/meta/`.
3. Review the generated SQL.
4. Commit both files together.
5. `bun run db:migrate` to apply locally.

For anything Drizzle can't express (RLS policies, SQL functions, triggers, role grants, data backfills) hand-write the file: create `apps/server/drizzle/NNNN_short_name.sql` and append a matching entry to `apps/server/drizzle/meta/_journal.json` (`idx`, `when: Date.now()`, `tag`, `breakpoints: true`).

---

## Email (development)

The project uses [Mailtrap](https://mailtrap.io) as a sandbox SMTP server so outgoing emails are captured and never delivered. Sign up for a free account, go to **Inboxes → SMTP Settings**, and copy the credentials into your `.env`:

```
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-username
SMTP_PASS=your-mailtrap-password
```
