# Exam Review Skill — Design Spec

**Date:** 2026-06-04

---

## Purpose

A Claude Code skill (`/exam-review`) that replicates the examiner's project assessment tool used in the PB138 course. The skill evaluates the codebase across 14 mandatory categories and any additional issues the Discovery agent surfaces. It produces a dated markdown report saved to `docs/reviews/` and printed to the terminal.

---

## Invocation

```
/exam-review
```

No arguments. Always reviews the current project rooted at the working directory.

---

## Architecture

Five agents run in **parallel**. A coordinator (the main skill execution) waits for all five, then assembles and saves the final report.

```
/exam-review
    ├── Frontend agent   (Component Library, Styling, Loading Data, Forms, Frontend Structure)
    ├── Backend agent    (REST API Design, Database, BE Design Patterns, Auth)
    ├── Infra agent      (Environment Variables, Security, Logging & Monitoring)
    ├── Quality agent    (Testing, Error Handling)
    └── Discovery agent  (open-ended — anything outside the 14 categories)
```

---

## Agent Responsibilities

### Frontend Agent

**Scope:** `apps/web/src/`

**Categories and criteria:**

**Component Library**
- Dead dependencies installed but unused (e.g. `shadcn` present but never imported)
- Raw `<input>`/`<textarea>`/`<button>` HTML elements used in place of existing `components/ui/` primitives
- Inconsistent adoption: some pages use the UI library, others bypass it

**Styling**
- Inline `style={{}}` attributes for typography/font overrides (should be Tailwind theme tokens)
- Arbitrary Tailwind values (`text-[14px]`, `leading-[1.8]`, `w-[320px]`) instead of standard scale
- `!important` usage in CSS files

**Loading Data**
- Absence of TanStack Query, SWR, or equivalent data-fetching library
- Raw `fetch()` calls inside `useEffect` hooks in components/pages
- Whether `@elysiajs/eden` Treaty client is used consistently or only in one file

**Forms**
- Count of `useState` calls per component — flags components with 8+ form-field states
- Manual field-by-field state management (one `useState` per field)
- Manual validation logic (`if (password !== confirmPassword)` style checks)
- Absence of React Hook Form, TanStack Form, or Formik
- Zod present but not used for frontend validation

**Frontend Structure**
- Page component line counts — flags files over 300 lines
- Number of `useState` calls per file — flags files with 10+
- Total count of custom hooks vs total pages (ratio check)
- Components that mix data fetching + local state + rendering in a single file
- Sub-components receiving 8+ props (deeply coupled)

---

### Backend Agent

**Scope:** `apps/server/src/`

**Categories and criteria:**

**REST API Design**
- HTTP verb correctness: GET reads, POST creates, PUT full-replace, PATCH partial update, DELETE removes
- `PUT` endpoints with `t.Optional()` fields (should be `PATCH` if partial)
- CORS configured with explicit origin vs wildcard `*`
- Correct status codes: 201 for creation, 204 for no-content deletion, 400/401/403/404 used appropriately
- Resource-oriented plural URL patterns (`/articles`, `/newspapers/:id/articles`)

**Database**
- UUID primary keys with `defaultRandom()`
- Proper foreign keys with `references()` and cascade rules
- Composite PKs for join tables
- Image/file data stored as URLs, not blobs
- Migration files versioned and sequential under `drizzle/`
- Raw SQL uses parameterized Drizzle `sql` tagged templates (no string concatenation)

**BE Design Patterns**
- Service file line counts — flags files over 300 lines
- Route handlers that query the database directly (should delegate to services)
- Single service files covering more than 3 distinct responsibilities
- Presence of `withDb` / transaction wrapper pattern in routes

**Auth**
- Hand-rolled vs established auth library (Better Auth, Lucia, Auth.js)
- Password hashing algorithm (argon2/bcrypt acceptable; plaintext/MD5/SHA1 are issues)
- JWT sign/verify present; token expiration configured
- Refresh token flow present or absent
- `requireAuth` / `requireRole` middleware enforced on protected routes
- RLS policies as secondary authorization layer

---

### Infrastructure Agent

**Scope:** `.env.example`, `.gitignore`, `docker-compose.yml`, `apps/server/src/server.ts`, `apps/server/src/utils/logger.ts`, seed scripts, any `*.config.*` files

**Categories and criteria:**

**Environment Variables**
- `.env.example` present with placeholder values
- `.gitignore` excludes `.env`, `.env.*` variants
- Hardcoded fallback URLs in source (e.g. `?? "http://localhost:3000"`)
- Hardcoded hostnames/ports in seed scripts or config files that should be env vars

**Security**
- CORS configured with wildcard `*` (flags as concern) vs explicit `origin`
- SQL injection surface: raw string interpolation in queries
- Hardcoded secrets, API keys, or passwords in source files
- Missing security headers (Helmet equivalent)
- Sensitive data (tokens, passwords) in error responses or logs

**Logging & Monitoring**
- Structured logger defined and used in services
- `console.log` / `console.debug` in frontend runtime code (hooks, components, pages)
- `console.log` in server runtime code outside of CLI scripts
- Plaintext sensitive data (passwords, tokens) in any log output
- Log level gating (debug logs suppressed in production)

---

### Quality Agent

**Scope:** `tests/`, `apps/server/src/**/*.test.ts`, `apps/web/src/**/*.test.*`

**Categories and criteria:**

**Testing**
- Backend unit/integration test files present
- E2E test files present (Playwright or similar)
- Skipped tests: `test.skip`, `it.skip`, `xdescribe`, `.todo(`
- `test` script defined in `package.json` for each app
- Test coverage of critical paths: auth, article lifecycle, role management

**Error Handling**
- Error class hierarchy defined (custom `HttpError` subclasses)
- Global error handler registered on the server
- Frontend pages surface errors to users (not swallowed silently)
- Catch blocks that do something meaningful vs empty `catch (e) {}`
- React `ErrorBoundary` present or absent at the app level

---

### Discovery Agent

**Scope:** Entire repository

**Brief:** Read broadly across the codebase — `package.json` files, `docs/`, CI config, root config files, all workspaces. Identify issues that fall outside the 14 mandatory categories. Examples of things to surface:

- Dead or conflicting dependencies
- Missing or incomplete documentation
- TODO/FIXME comments in runtime code
- Circular dependencies or import issues
- Misconfigured Turbo pipeline tasks
- Accessibility issues in UI components
- Missing `aria-*` attributes on interactive elements
- Inconsistent naming conventions across the codebase
- Unused exports or dead code modules
- Any other concern a code reviewer would flag

The Discovery agent produces its own section(s) in the report with the same status format. If it finds nothing noteworthy, it reports N/A.

---

## Report Format

The assembled report matches the examiner's format exactly:

```markdown
# Project Review: pb138

**Date:** YYYY-MM-DD

---

## Project Orientation

[1-2 paragraph summary of tech stack, architecture, and tooling — auto-generated by coordinator]

---

## Review Summary

| Category              | Status         |
| --------------------- | -------------- |
| Component Library     | ✅/⚠️/❌/N/A  |
| Styling               | ...            |
| Loading Data          | ...            |
| Environment Variables | ...            |
| REST API Design       | ...            |
| Database              | ...            |
| BE Design Patterns    | ...            |
| Auth                  | ...            |
| Testing               | ...            |
| Logging & Monitoring  | ...            |
| Error Handling        | ...            |
| Security              | ...            |
| Forms                 | ...            |
| Frontend Structure    | ...            |
| [Extra categories]    | ...            |

Status legend: ✅ Good | ⚠️ Concerns | ❌ Issues | N/A

---

## Detailed Review

### 1. Category Name

**Status:** ✅/⚠️/❌ — one-line verdict

[Evidence: file paths with line numbers, code quotes demonstrating the issue]

**Recommendations:**
1. ...
2. ...

---

## Overall Summary

[3-5 sentence synthesis: strengths, main weaknesses, priority improvements]
```

---

## Output

- Printed to terminal in markdown
- Saved to `docs/reviews/YYYY-MM-DD-review.md` (overwrites same-day runs)
- The `docs/reviews/` directory is created if it does not exist

---

## Skill File Location

```
.claude/skills/exam-review/
└── exam-review.md    ← skill instructions loaded when user types /exam-review
```

The skill file contains the coordinator instructions: spawn 5 agents in parallel with their specific briefs, wait for results, assemble report, save file, print output.
