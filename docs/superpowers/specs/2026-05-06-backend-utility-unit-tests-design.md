# Backend Utility Unit Tests

**Date:** 2026-05-06
**Status:** Approved

## Overview

Add pure unit tests for the three utility modules in `apps/server/src/utils/`: `logger.ts`, `audit.ts`, and `email.ts`. Tests run with `bun test`, use `mock.module()` to stub dependencies (`db`, `nodemailer`, `console`), and require no database, network, or other infrastructure.

Routes and the auth middleware are deliberately out of scope. They are request-scoped Elysia plugins tightly coupled to Drizzle ORM — they belong in integration tests, not unit tests.

## Approach

Pure unit tests only (no real DB, no real SMTP, no Redis). Each test isolates one function, mocks its dependencies at the module boundary, and asserts a single behavior.

## File Structure

```
apps/server/test/
└── utils/
    ├── logger.test.ts
    ├── audit.test.ts
    └── email.test.ts
```

Mirrors `apps/server/src/utils/`.

## Tooling

- **Runner:** `bun test`
- **Mocking:** `mock.module()` from `bun:test`, with `mock.restore()` between tests
- **No shared state** between test files

## Package.json Script

Add to `apps/server/package.json`:

```json
"scripts": {
  "test": "bun test"
}
```

Run from the server workspace via `bun run test`.

## Test Coverage

### `logger.test.ts` (~5 tests)

1. Output is valid JSON containing `level`, `timestamp` (ISO 8601), and `message`.
2. `meta` object fields are merged into the JSON output.
3. `error` and `warn` write to `console.error`.
4. `info` writes to `console.log`.
5. `debug` is silent when `NODE_ENV === "production"`, active otherwise.

### `audit.test.ts` (~4 tests)

Mocks: `../../src/db` (replaces `db.insert(...).values(...)` with a spy).

1. Inserts a row into `auditLogs` with the given `userId`, `operationType`, `targetObjectId`, and `result`.
2. Substitutes `null` for missing optional fields (`userId`, `targetObjectId`).
3. Does not throw when the DB insert rejects.
4. On insert failure, calls `logger.error` with the operation type and an `error` field.

### `email.test.ts` (~4 tests)

Mocks: `nodemailer` (replaces `createTransport` with a stub returning a `sendMail` spy).

1. `sendVerificationEmail` calls `sendMail` with the `to` address, a subject, and a link containing the token and newspaper slug.
2. `sendPasswordResetEmail` calls `sendMail` with a link to the reset path containing the token.
3. Both use `SMTP_FROM` as the sender, falling back to `noreply@example.com` when unset.
4. Both build the link from `FRONTEND_URL`, falling back to `http://localhost:5173` when unset.

## Conventions

- One assertion topic per test — no kitchen-sink tests.
- Use `expect(spy).toHaveBeenCalledWith(...)` and `expect(spy.mock.calls[0][0])` patterns to inspect mock arguments.
- Reset mocks in `afterEach` so tests don't leak state.
- Test names describe the behavior in plain English (e.g., `"writes error level to stderr"`).

## Out of Scope

- Auth middleware tests (belongs in integration tests — Elysia plugin requires real request flow)
- Route handler tests (Drizzle-coupled — needs real DB)
- `utils/jwt.ts` (only exports constants, nothing to test)
- `utils/redis.ts` (thin wrapper around Bun.redis — covered by integration tests)
- CI integration
- Coverage reporting setup
