# E2E Playwright Test Setup

**Date:** 2026-04-30  
**Status:** Approved

## Overview

Add end-to-end tests to the pb138 monorepo using Playwright. Tests run against a pre-started full stack (Docker + dev servers). The first test covers the login flow.

## Structure

A new `tests/` directory is added at the repo root as a Bun workspace. It is self-contained: its own `package.json`, `playwright.config.ts`, and test files.

```
pb138/
├── apps/
│   ├── web/
│   └── server/
├── packages/
│   └── shared/
├── tests/
│   ├── package.json
│   ├── playwright.config.ts
│   ├── .env                    ← gitignored, auto-loaded by Bun
│   ├── .env.example            ← committed
│   └── e2e/
│       ├── auth/
│       │   └── login.spec.ts
│       └── helpers/
│           └── auth.ts
├── package.json                ← "tests" added to workspaces
└── ...
```

## Installation

- Playwright is a devDependency of the `tests/` workspace (`@playwright/test`)
- `bun install` at the repo root installs it automatically
- Browsers: Chromium only to start; install with `bunx playwright install chromium` from `tests/`

## Root package.json changes

Add `"tests"` to `"workspaces"` array:
```json
"workspaces": ["apps/*", "packages/*", "tests"]
```

Add convenience script:
```json
"test:e2e": "bun run --cwd tests test"
```

Run with: `bun run test:e2e` from the repo root.

## Playwright Configuration (`tests/playwright.config.ts`)

- `baseURL`: `http://localhost:5173` (web app dev URL)
- `testDir`: `./e2e`
- Single browser project: `chromium`
- `use.trace`: `"on-first-retry"` — captures traces on test failure
- No `webServer` block — tests assume the stack is already running

## Environment Variables

`tests/.env` (gitignored) holds test credentials. Bun auto-loads `.env` from the working directory, so no extra flags are needed:

```
TEST_BASE_URL=http://localhost:5173
TEST_NEWSPAPER=your-newspaper-slug
TEST_EMAIL=testuser@example.com
TEST_PASSWORD=password123
```

`tests/.env.example` is committed so other developers know what to fill in.

Playwright config reads these via `process.env` (populated automatically by Bun before the process starts).

## First Test: Login Flow

**File:** `tests/e2e/auth/login.spec.ts`

Steps:
1. Navigate to `/{TEST_NEWSPAPER}/login`
2. Fill in email (`TEST_EMAIL`) and password (`TEST_PASSWORD`)
3. Submit the form
4. Assert the user is no longer on the login page (redirected to homepage or profile)

## Reusable Login Helper

**File:** `tests/e2e/helpers/auth.ts`

Exports a `login(page, email, password)` function that encapsulates the login navigation, form fill, and submit. All tests requiring an authenticated user import this helper.

## Prerequisites to Run Tests

1. Start the full stack: `docker-compose up -d` then `bun run dev`
2. Ensure a test user matching `TEST_EMAIL` / `TEST_PASSWORD` exists in the database (via seed or manual creation)
3. Copy `tests/.env.example` to `tests/.env` and fill in values
4. From repo root: `bun run test:e2e`

## Out of Scope

- Firefox and WebKit browser projects (add later)
- CI pipeline integration
- Test user lifecycle management (creation/teardown via API)
- Tests beyond the login flow
