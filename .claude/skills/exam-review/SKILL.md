---
name: exam-review
description: "Run a full project quality review across 14 categories (Component Library, Styling, Loading Data, Environment Variables, REST API Design, Database, BE Design Patterns, Auth, Testing, Logging & Monitoring, Error Handling, Security, Forms, Frontend Structure) plus open-ended discovery. Produces a dated markdown report saved to docs/reviews/ and printed to the terminal."
---

# Exam Review

You are the coordinator for a parallel code quality review of this project. Your job is to spawn 5 review agents simultaneously, collect their findings, assemble a single report, save it, and print it.

## Step 1 — Spawn all 5 agents in parallel

Launch all five agents in a **single message** with parallel Agent tool calls. Do NOT wait for one before starting the next.

---

### Agent 1: Frontend Agent

**Brief for the agent:**

You are reviewing the frontend of a full-stack web application (React 19 + React Router + TailwindCSS). The frontend lives in `apps/web/src/`. Your job is to evaluate 5 specific quality categories and return your findings in a structured format.

For each category, assign one status:
- ✅ Good — no meaningful issues
- ⚠️ Concerns — issues worth fixing but not blocking
- ❌ Issues — significant problems that hurt quality
- N/A — not applicable

Return your findings as markdown in this format for each category:

```
### [Category Name]
**Status:** [emoji] [status] — [one-line verdict]

[Evidence: quote actual file paths with line numbers and code snippets that demonstrate the issue]

**Recommendations:**
1. ...
```

**Categories to evaluate:**

**1. Component Library**
Check `apps/web/package.json` for installed but unused dependencies (install present, zero imports anywhere). Read `apps/web/src/components/ui/` to understand what UI primitives exist. Then grep across `apps/web/src/pages/` and `apps/web/src/components/` for raw `<input`, `<textarea`, `<button` elements that bypass the existing primitives. Note which files do and don't use `components/ui/`.

**2. Styling**
Search `apps/web/src/` for:
- `style={{` attributes (inline styles, especially for fontFamily/fontSize)
- Tailwind arbitrary values: `text-[`, `leading-[`, `w-[`, `h-[`, `gap-[`, `p-[`, `m-[`
- `!important` in any `.css` file

**3. Loading Data**
Check `apps/web/package.json` for TanStack Query (`@tanstack/react-query`), SWR, or similar. Check `apps/web/src/lib/api.ts` for the Eden Treaty client. Then grep `apps/web/src/` for `fetch(` and `useEffect` patterns. Count how many components use raw fetch vs the treaty client.

**4. Forms**
Count `useState` calls per file in `apps/web/src/pages/`. Flag any file with 8+ useState calls. Look for manual validation logic (password comparison, required field checks in submit handlers). Check if React Hook Form, TanStack Form, or Formik is in `apps/web/package.json`. Check if Zod is used for frontend validation.

**5. Frontend Structure**
Count lines in each file under `apps/web/src/pages/` — flag files over 300 lines. Count `useState` calls per file — flag files with 10+. Count total custom hooks in `apps/web/src/hooks/`. Look for components that mix data fetching + state management + rendering (god components). Look for sub-components defined inline inside page files or receiving 8+ props.

---

### Agent 2: Backend Agent

**Brief for the agent:**

You are reviewing the backend of a full-stack web application (Elysia + Drizzle ORM + PostgreSQL). The backend lives in `apps/server/src/`. Your job is to evaluate 4 specific quality categories and return your findings in structured markdown.

For each category, assign one status:
- ✅ Good — no meaningful issues
- ⚠️ Concerns — issues worth fixing but not blocking
- ❌ Issues — significant problems that hurt quality
- N/A — not applicable

Return your findings as markdown in this format for each category:

```
### [Category Name]
**Status:** [emoji] [status] — [one-line verdict]

[Evidence: quote actual file paths with line numbers and code snippets]

**Recommendations:**
1. ...
```

**Categories to evaluate:**

**1. REST API Design**
Read `apps/server/src/routes/` to check:
- HTTP verbs: GET for reads, POST for creates, PUT for full replace, PATCH for partial update, DELETE for remove
- Any PUT endpoint body schema that uses `t.Optional()` fields (this is a PATCH semantics violation)
- CORS configuration in `apps/server/src/server.ts` — is `cors()` called with no options (wildcard)?
- HTTP status codes: 201 for creation, 204 for deletion, correct 400/401/403/404 usage
- URL patterns: are they resource-oriented and plural?

**2. Database**
Read `apps/server/src/db/schema.ts` and `apps/server/drizzle/` to check:
- UUID primary keys with `defaultRandom()`
- Foreign keys with `references()` and appropriate `onDelete` rules
- Composite PKs for join/many-to-many tables
- Binary data or files stored as database blobs vs URLs in text columns
- Migration files: are there numbered sequential SQL files under `drizzle/`?
- Raw SQL: check `apps/server/src/db/rls.ts` and any other raw SQL — does it use parameterized Drizzle `sql` template tags or raw string concatenation?

**3. BE Design Patterns**
Count lines in each file under `apps/server/src/services/` — flag files over 300 lines. Read `apps/server/src/routes/` and check if route handlers ever call database methods directly (should delegate to services). Check if a `withDb` or transaction wrapper pattern is used consistently. Identify service files that mix more than 3 distinct responsibilities (CRUD, search, queue, images, stats all in one file).

**4. Auth**
Check `apps/server/package.json` for auth libraries (better-auth, lucia, auth.js). Read `apps/server/src/middleware/auth.ts` — is auth hand-rolled with JWT sign/verify? Check password hashing: is `Bun.password` (argon2) or bcrypt used? Or is anything weaker (MD5, SHA1, plaintext)? Check token expiration configuration. Look for a refresh token flow. Check that `requireAuth`/`requireRole` middleware is applied to protected routes. Check if RLS policies exist in `apps/server/src/db/rls.ts`.

---

### Agent 3: Infrastructure Agent

**Brief for the agent:**

You are reviewing the infrastructure and operational quality of a full-stack web application. Your job is to evaluate 3 specific quality categories and return your findings in structured markdown.

For each category, assign one status:
- ✅ Good — no meaningful issues
- ⚠️ Concerns — issues worth fixing but not blocking
- ❌ Issues — significant problems that hurt quality
- N/A — not applicable

Return your findings as markdown in this format for each category:

```
### [Category Name]
**Status:** [emoji] [status] — [one-line verdict]

[Evidence: quote actual file paths with line numbers and code snippets]

**Recommendations:**
1. ...
```

**Categories to evaluate:**

**1. Environment Variables**
Check: Does `.env.example` exist? Does `.gitignore` exclude `.env` and `.env.*` variants? Search source code for hardcoded `localhost` URLs, ports, or fallback values (e.g. `?? "http://localhost:3000"`). Check seed scripts under `apps/server/src/db/seeds/` for hardcoded URLs (MinIO, S3, etc.) that should be env vars.

**2. Security**
Check `apps/server/src/server.ts` for `cors()` configuration — is it called with no arguments (wildcard `*`)? Grep all source files for string concatenation into SQL queries (injection risk). Search for hardcoded secrets, API keys, tokens, or passwords in source files (not `.env`). Check if any security headers middleware (Helmet or equivalent) is used. Check if sensitive data appears in error response bodies.

**3. Logging & Monitoring**
Read `apps/server/src/utils/logger.ts` — is there a structured logger? Check if the logger is actually used in service files vs `console.log`. Grep `apps/web/src/` for `console.log` and `console.debug` in hooks and components (runtime frontend logs). Grep `apps/server/src/` for `console.log` in non-CLI, non-seed, non-test files. Check seed scripts for any `console.log` that prints plaintext passwords or tokens.

---

### Agent 4: Quality Agent

**Brief for the agent:**

You are reviewing the testing and error handling quality of a full-stack web application. Your job is to evaluate 2 specific quality categories and return your findings in structured markdown.

For each category, assign one status:
- ✅ Good — no meaningful issues
- ⚠️ Concerns — issues worth fixing but not blocking
- ❌ Issues — significant problems that hurt quality
- N/A — not applicable

Return your findings as markdown in this format for each category:

```
### [Category Name]
**Status:** [emoji] [status] — [one-line verdict]

[Evidence: quote actual file paths with line numbers and code snippets]

**Recommendations:**
1. ...
```

**Categories to evaluate:**

**1. Testing**
Count test files under `apps/server/src/` (`*.test.ts`) and `tests/` (E2E specs). List their names and what they appear to test. Grep for skipped tests: `test.skip`, `it.skip`, `xdescribe`, `.todo(`. Check that a `test` script exists in `apps/server/package.json` and `apps/web/package.json`. Assess whether critical paths are tested: auth, article lifecycle, role management, E2E user flows.

**2. Error Handling**
Read `apps/server/src/errors/index.ts` — is there a custom error class hierarchy? Check `apps/server/src/server.ts` for a global error handler. Grep `apps/web/src/pages/` for error state display (`error && <`, `setError(`, `.catch(`) — are errors surfaced to the user? Look for empty catch blocks: `catch (e) {}` or `catch (_) {}`. Check if a React `ErrorBoundary` component exists in the frontend.

---

### Agent 5: Discovery Agent

**Brief for the agent:**

You are doing an open-ended code quality review of this project. The project is a full-stack web application (React frontend + Elysia/Bun backend + PostgreSQL) built as a Turborepo monorepo. Other agents are already covering these 14 specific categories: Component Library, Styling, Loading Data, Environment Variables, REST API Design, Database, BE Design Patterns, Auth, Testing, Logging & Monitoring, Error Handling, Security, Forms, Frontend Structure.

Your job is to find anything **outside those 14 categories** that a code reviewer or examiner would flag. Read broadly across the repository.

Areas to investigate:
- `package.json` files at root and in each workspace — conflicting versions, duplicate dependencies, missing scripts, outdated or suspicious packages
- `turbo.json` — misconfigured pipeline tasks, missing outputs/inputs
- `tsconfig.json` files — strict mode, path aliases, consistency across workspaces
- `docs/` — missing documentation, outdated API contract, incomplete sections
- TODOs and FIXMEs in source files (grep for `TODO`, `FIXME`, `HACK`, `XXX`)
- Accessibility: grep `apps/web/src/` for interactive elements missing `aria-*`, `role`, or `alt` attributes
- Naming conventions: inconsistent file naming (camelCase vs kebab-case vs PascalCase) across same directories
- Dead code: exported symbols that are never imported anywhere
- `docker-compose.yml` — missing health checks, exposed ports in production config, hardcoded credentials
- CI/CD: does a `.github/workflows/` or equivalent exist?
- Any other patterns that suggest technical debt, maintainability issues, or exam-relevant quality gaps

For each issue you find, create a named extra category (e.g. "Accessibility", "CI/CD", "TypeScript Config"). Use the same status format:

```
### [Extra Category Name]
**Status:** [emoji] [status] — [one-line verdict]

[Evidence with file paths and code snippets]

**Recommendations:**
1. ...
```

If you find nothing noteworthy beyond the 14 categories, return a single line: `No additional issues found.`

---

## Step 2 — Assemble the report

Once all 5 agents return their findings, assemble a single report in this exact format:

```markdown
# Project Review: pb138

**Date:** [today's date as YYYY-MM-DD]

---

## Project Orientation

[Write 1-2 paragraphs describing the project's tech stack, architecture, and tooling based on what you can observe from the codebase: monorepo structure, frontend framework, backend framework, ORM, database, auth approach, testing tools, deployment setup.]

---

## Review Summary

| Category              | Status         |
| --------------------- | -------------- |
| Component Library     | [status emoji + word] |
| Styling               | [status] |
| Loading Data          | [status] |
| Environment Variables | [status] |
| REST API Design       | [status] |
| Database              | [status] |
| BE Design Patterns    | [status] |
| Auth                  | [status] |
| Testing               | [status] |
| Logging & Monitoring  | [status] |
| Error Handling        | [status] |
| Security              | [status] |
| Forms                 | [status] |
| Frontend Structure    | [status] |
[Add rows for any extra categories the Discovery agent found]

Status legend: ✅ Good | ⚠️ Concerns | ❌ Issues | N/A

---

## Detailed Review

[Insert all category sections from all 5 agents here, numbered sequentially. Use the fixed order: 1. Component Library, 2. Styling, 3. Loading Data, 4. Environment Variables, 5. REST API Design, 6. Database, 7. BE Design Patterns, 8. Auth, 9. Testing, 10. Logging & Monitoring, 11. Error Handling, 12. Security, 13. Forms, 14. Frontend Structure, then extra categories starting at 15.]

---

## Overall Summary

[Write 3-5 sentences synthesizing the review: what the project does well, what the main weaknesses are, and what should be prioritized before submission.]
```

## Step 3 — Save and print

1. Create the directory `docs/reviews/` if it does not exist (use Bash: `mkdir -p docs/reviews`)
2. Save the report to `docs/reviews/[YYYY-MM-DD]-review.md` — if a file for today already exists, overwrite it
3. Print the full report to the terminal
