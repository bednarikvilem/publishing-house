# Project Review: pb138 — Newspaper Platform

**Date:** 2026-06-07

---

## Project Orientation

The project is a multi-newspaper publication-house platform built as a Turborepo monorepo with two apps: `apps/server` (Elysia + Drizzle + PostgreSQL 17) and `apps/web` (React 19 + React Router DOM v7 + Tailwind + shadcn/ui). Infrastructure runs in Docker (PostgreSQL, Redis, MinIO, Mailtrap). The backend uses JWT auth via `@elysiajs/jwt` with `Bun.password` (argon2), row-level security policies enforced at the database layer, and a custom NDJSON structured logger. The frontend uses TanStack Query for server state in some places but mixes in raw `fetch`/`useEffect` patterns elsewhere. A Playwright E2E suite in the `tests/` workspace covers major user workflows, and backend unit tests cover RLS policies, schema validation, and utilities.

---

## Review Summary

| Category              | Status         |
| --------------------- | -------------- |
| Component Library     | ⚠️ Concerns   |
| Styling               | ⚠️ Concerns   |
| Loading Data          | ⚠️ Concerns   |
| Environment Variables | ✅ Good        |
| REST API Design       | ⚠️ Concerns   |
| Database              | ✅ Good        |
| BE Design Patterns    | ✅ Good        |
| Auth                  | ✅ Good        |
| Testing               | ✅ Good        |
| Logging & Monitoring  | ✅ Good        |
| Error Handling        | ⚠️ Concerns   |
| Security              | ✅ Good        |
| Forms                 | ⚠️ Concerns   |
| Frontend Structure    | ⚠️ Concerns   |

Status legend: ✅ Good | ⚠️ Concerns | ❌ Issues | N/A

---

## Detailed Review

### 1. Component Library

**Status:** ⚠️ Concerns — shadcn/ui is present and partially used, but bypassed inconsistently across the codebase.

**Findings:**

`apps/web/package.json` lists `shadcn` and `@base-ui-components/react`, and `apps/web/src/components/ui/` provides Button, Input, Select, Textarea, Badge, Card, Dialog, Label, Table, Toast, and Toaster. However, raw HTML interactive elements appear in many files even where the shadcn equivalents exist:

- `apps/web/src/components/DecisionForm.tsx:54,74,95,102` — raw `<input>`, `<textarea>`, and two `<button>` elements where the `Input`, `Textarea`, and `Button` shadcn components are available.
- `apps/web/src/pages/AuthorDashboardPage.tsx:195,331,338` — raw `<button>` in three locations.
- `apps/web/src/pages/profile/ProfileInfoCard.tsx:177,185,227,261` — raw `<button>` and `<input>` elements.
- `apps/web/src/pages/dashboard/CategoriesSection.tsx:55,62,69,168,174,217,224` — raw `<input>` and `<button>` elements.
- `apps/web/src/pages/admin/GlobalUsersSection.tsx:110,166,181,191,229` — raw `<button>` and `<select>`.
- `apps/web/src/pages/profile/PasswordCard.tsx:100` — raw `<button>`.

File-upload `<input type="file">` in `RichTextEditor.tsx:204` and `ArticleEditorPage.tsx:197` is acceptable since there is no shadcn file-input component.

**Recommendations:**

1. Replace raw `<button>` elements in `AuthorDashboardPage.tsx`, `ProfileInfoCard.tsx`, `CategoriesSection.tsx`, `GlobalUsersSection.tsx`, and `PasswordCard.tsx` with the shadcn `<Button>` component.
2. Replace raw `<input>` and `<textarea>` in `DecisionForm.tsx` with the shadcn `<Input>` and `<Textarea>` components, and use shadcn `<Button>` for the action buttons.
3. Replace the raw `<select>` in `GlobalUsersSection.tsx:166` with the shadcn `<Select>` component.

---

### 2. Styling

**Status:** ⚠️ Concerns — Tailwind is used correctly in most places, but there is meaningful arbitrary-value abuse for status badge colors and font sizes, plus two unnecessary inline style attributes for font-family.

**Findings:**

**Inline `style={{}}`:** Four files use inline styles for legitimate reasons (dynamic percentage widths in chart bar components `stats/HorizBar.tsx`, `stats/Timeline.tsx`, `stats/NewspaperStatsDashboard.tsx`, `stats/GlobalStatsDashboard.tsx`). These are valid because Tailwind cannot express runtime-computed values. However, `apps/web/src/pages/profile/ProfileInfoCard.tsx:151` and `apps/web/src/pages/profile/PasswordCard.tsx:54` both apply `style={{ fontFamily: "Outfit, Inter, sans-serif" }}` — this could be a global Tailwind font class override instead.

**Arbitrary hex colors:** `apps/web/src/pages/AuthorDashboardPage.tsx:55–70` defines status badge colors as Tailwind arbitrary values: `bg-[#2563eb18]`, `text-[#2563eb]`, `bg-[#ea580c18]`, `bg-[#7c3aed]`, etc. These hard-coded hex values bypass the theme system and are difficult to maintain or retheme. They should become semantic CSS custom properties or design-token Tailwind classes.

**Arbitrary font sizes:** `apps/web/src/pages/profile/PasswordCard.tsx:53,58,93,96,103` uses `text-[18px]`, `text-[14px]`, `text-[13px]` instead of standard Tailwind scale classes (`text-lg`, `text-sm`, `text-xs`).

**`!important`:** `apps/web/src/index.css:35` contains `animation: none !important` with an explanatory comment that it is intentional for the Motion API. This is acceptable.

**Recommendations:**

1. Replace the status-color arbitrary values in `AuthorDashboardPage.tsx:55–70` with CSS custom properties (e.g., `--status-submitted-bg`) or a dedicated `articleStatus.ts` mapping to semantic Tailwind tokens that use the theme palette.
2. Remove `style={{ fontFamily: ... }}` from `ProfileInfoCard.tsx:151` and `PasswordCard.tsx:54`; configure a `font-outfit` Tailwind class instead.
3. Replace `text-[18px]`, `text-[14px]`, `text-[13px]` in `PasswordCard.tsx` with standard scale utilities (`text-lg`, `text-sm`, `text-xs`).

---

### 3. Loading Data

**Status:** ⚠️ Concerns — TanStack Query is configured and used correctly in some places, but a large portion of the frontend bypasses it with raw `fetch().then()` chains in `useEffect`, resulting in inconsistent patterns and manual loading/error state management.

**Findings:**

TanStack Query is configured in `apps/web/src/lib/queryClient.ts`, mounted via `QueryClientProvider` in `frontend.tsx`, and correctly used in:
- `apps/web/src/hooks/useNewspaper.ts` and `useCategory.ts` — stable query keys, enabled guards.
- `apps/web/src/pages/dashboard/EditorialQueueSection.tsx` — `useQuery` + `useMutation` with `queryClient.invalidateQueries`.
- `apps/web/src/components/Navbar.tsx` — `useQuery` for categories.

However, the same `Navbar.tsx` also fetches user info and subscription status with raw `fetch().then()` inside `useEffect` (lines 84–93) and does not route those through TanStack Query. The following files fetch data entirely outside TanStack Query:

- `apps/web/src/components/StatisticsSection.tsx:38–43`
- `apps/web/src/pages/AuthorPage.tsx:49–54`
- `apps/web/src/pages/DirectorDashboardPage.tsx:26–38`
- `apps/web/src/pages/UserProfilePage.tsx:27–31`
- `apps/web/src/pages/ArticleEditorPage.tsx` — three separate `useEffect` fetches for categories, user profile, and article data.

These manual patterns require separate `useState` variables for `loading` and `error`, and produce no caching or deduplication.

Query keys in places that do use TanStack Query follow the recommended stable-array pattern: `["newspaper", newspaperName]`, `["categories", newspaper?.id]`, `["editorial-queue", newspaperId, currentPage]`.

**Recommendations:**

1. Create custom hooks (`useUser`, `useSubscriptionStatus`, `useStatistics`, `useAuthor`, `useDirectorData`) that wrap TanStack `useQuery`, then replace the raw `useEffect` + `fetch` patterns across the listed files with these hooks.
2. Migrate the three `useEffect` fetches in `ArticleEditorPage.tsx` to TanStack Query so that loading and error states are handled uniformly.
3. Remove the manual `loading`/`error` `useState` pairs wherever they duplicate TanStack Query state.

---

### 4. Environment Variables

**Status:** ✅ Good

**Findings:**

`.gitignore` covers `.env`, `.env.development.local`, `.env.test.local`, `.env.production.local`, and `.env.local`. A well-documented `.env.example` exists at the repo root with placeholder values for all required secrets (DB credentials, JWT secret, SMTP, MinIO, Redis).

All runtime configuration is accessed via `process.env.` in the server (e.g., `apps/server/src/utils/email.ts:5–14`, `apps/server/drizzle.config.ts:11`, `apps/server/src/server.ts:21`). The server startup code validates that `DATABASE_URL` and `JWT_SECRET` are present and exits with an error if not (`server.ts:23–31`).

The one visible `http://localhost:5173` reference in `apps/server/src/utils/email.ts:21` is a fallback default behind `?? "http://localhost:5173"`, not a hardcoded value used without an env check.

`apps/web/src/lib/sampleData.ts` contains `https://picsum.photos` URLs, but this file is clearly static demo/sample content, not an application-path configuration.

**Recommendations:**

1. Add `tests/.env` to `.gitignore` (currently `tests/.env.example` exists but only the root `.gitignore` is checked — confirm test env files are also excluded).
2. Consider documenting the `LOG_LEVEL` and `LOG_FILE` env variables more prominently in `.env.example`; they are present but described only with inline comments.

---

### 5. REST API Design

**Status:** ⚠️ Concerns — URL design, verbs, and status codes are generally correct, but `PUT /me` applies PATCH semantics (all-optional body), and several state-transition action endpoints could be refined.

**Findings:**

**Resource-oriented URLs:** Routes follow noun/plural conventions: `/api/newspapers`, `/api/newspapers/:newspaper_id/articles`, `/api/newspapers/:newspaper_id/categories`. No verbs found in path segments.

**HTTP verbs and status codes:** GET for reads, POST for creates (returning 201 via `set.status = 201`), PATCH for partial updates, DELETE with 204. Image creation also returns 201 (`articles.ts` route). The delete handlers return 204 with `null` body — correct.

**`PUT /me` semantics issue:** `apps/server/src/routes/users.ts:14` defines `PUT /me` with the schema `updateMeBody` (`apps/server/src/schemas/users.ts`) where every field is `t.Optional(...)`. A PUT by convention should accept and replace the complete resource representation; partial updates belong to PATCH. When all fields are optional, a client can legally send an empty body and the handler must decide what to update. This should be changed to `PATCH /me`.

**State-transition sub-resources:** `/articles/:id/submit`, `/articles/:id/assign-editor`, `/articles/:id/review`, `/articles/:id/approve`, `/articles/:id/schedule`, `/articles/:id/publish` all use POST. This is a widely accepted pattern for state-machine transitions (action resources), not a RESTful violation, but should be noted.

**Request validation:** TypeBox (`t.Object`) schemas are defined in `apps/server/src/schemas/` and wired to Elysia routes for all request bodies, params, and query strings. This is thorough and consistent.

**Recommendations:**

1. Change `PUT /me` to `PATCH /me` in `apps/server/src/routes/users.ts:14` and rename the schema to `patchMeBody`; update `docs/API.md` accordingly.
2. Verify `PUT /api/admin/config` (`admin.ts:97`) and `PUT /api/newspapers/:newspaper_id/categories/:category_id` (`categories.ts:32`) — check whether their bodies require the complete representation or are also partial (if partial, change to PATCH).

---

### 6. Database

**Status:** ✅ Good

**Findings:**

`apps/server/src/db/schema.ts` defines a clean relational model: `users`, `newspapers`, `userRoles`, `globalRoles`, `newspaperAuthors`, `articles`, `articleCategory`, `articleImages`, `comments`, `likes`, `articleReviews`, `articleViews`, `auditLogs`, `subscriptions`, `subscriptionTokens`. All tables use UUID primary keys consistently. Foreign keys, cascade deletes, and unique constraints are applied correctly (e.g., `unique().on(table.userId, table.newspaperId)` for subscriptions).

Images are stored as URLs in `articleImages.url` and `newspaperAuthors.profilePictureUrl`, pointing to MinIO — no `bytea`/`blob` columns in the database.

Six versioned SQL migration files exist in `apps/server/drizzle/` (0001–0006), covering view tracking, RLS policies, newspaper primary color, author visibility, subscription tables, and subscription RLS. The journal at `drizzle/meta/_journal.json` tracks their application.

Raw SQL is only used in `apps/server/src/db/rls.ts:17–19` for `SET CONFIG` GUC calls (necessary — Drizzle has no ORM abstraction for `set_config`) and in the setup script. All application queries go through Drizzle's query builder.

The RLS policy suite is comprehensive: `0002_enable_rls.sql` and `0006_add_subscriptions_rls.sql` implement per-role access control enforced at the database level, tested in `apps/server/tests/rls/policies.test.ts`.

**Recommendations:**

1. The `globalRoles` table has `unique("global_roles_role_unique").on(table.role)` — this enforces only one global holder per role system-wide. Confirm this is the intended business rule (one Director, one System Admin globally) rather than an unintended constraint.
2. `articles.keywords` is stored as `text` and treated as a comma-separated or JSON string; consider using `text[]` (PostgreSQL array) or a separate `articleKeywords` junction table for cleaner querying and indexing.

---

### 7. Backend Design Patterns

**Status:** ✅ Good

**Findings:**

The backend has a clear three-layer separation:

- **`apps/server/src/routes/`** — thin Elysia route handlers that validate inputs (via TypeBox schemas) and delegate to services. Route handlers contain no business logic.
- **`apps/server/src/services/`** — business logic: `articles.ts` (1057 lines — large but expected for the article state machine), `auth.ts`, `users.ts`, `admin.ts`, `categories.ts`, `comments.ts`, `likes.ts`, `subscriptions.ts`, `authors.ts`.
- **`apps/server/src/db/`** — Drizzle ORM queries, RLS session setup, schema.

The `withDb` helper (`rls.ts`) wraps every DB operation in an RLS-scoped transaction, passed from route to service as a callback. This cleanly decouples the DB session from request handling:

```ts
// routes/articles.ts
.get("/api/newspapers/:newspaper_id/articles",
    ({ params, query, withDb }) =>
        withDb((tx) => articleService.listArticles(tx, params.newspaper_id, query)))
```

The only direct `db` call outside the service layer is in `apps/server/src/server.ts:79` (`db.select().from(newspapers)`) inside the `/api` health-check endpoint — this bypasses RLS but is a read-only diagnostic endpoint, not a user-facing data path.

**Recommendations:**

1. Move the `db.select().from(newspapers)` in `server.ts:79` into a service function to keep the route layer consistent.
2. `apps/server/src/services/articles.ts` at 1057 lines is large. Consider extracting the image-management logic (`uploadArticleImage`, `deleteArticleImage`) into a dedicated `articleImages.ts` service module.

---

### 8. Auth

**Status:** ✅ Good

**Findings:**

Authentication uses `@elysiajs/jwt` (framework-managed JWT) and `Bun.password` (built-in argon2id hashing) — no roll-your-own crypto. There is no `jsonwebtoken` or raw `bcrypt` in the dependencies.

The `authMiddleware` in `apps/server/src/middleware/auth.ts` is a reusable Elysia plugin that: extracts the Bearer token, verifies the JWT, checks if the JTI is blocklisted in Redis (logout invalidation), loads the user and their roles from the DB, and exposes `user`, `roles`, and a `withDb` RLS-scoped DB accessor to all routes.

`requireAuth` and `requireRole(role)` guard plugins are derived from this middleware. Authorization checks appear in services: cross-newspaper validation in `likes.ts:21` and `comments.ts:40,92–100`, ownership checks on article operations in `articles.ts`. The RLS policies provide a defense-in-depth layer that enforces these rules at the database level independently of application code.

JWT session tokens expire after 2 hours (`apps/server/src/utils/jwt.ts`). Logout writes the JTI to Redis to prevent replay.

**Recommendations:**

1. The auth middleware re-reads user and roles from the DB on every request. For a production deployment under load, caching in Redis (keyed by JTI, TTL matching token expiry) would reduce DB round-trips — appropriate for the university scope as-is.
2. Email-verification tokens and password-reset tokens are also signed JWTs (`auth.ts:92,227`) — confirm their expiry is set to a shorter window than the 2-hour session token. Currently `JWT_EXPIRATION` only exports `session: "2h"`.

---

### 9. Testing

**Status:** ✅ Good

**Findings:**

29 test files are present across two test suites.

**Backend unit/integration tests** (`apps/server/tests/`, run with `bun test`):
- `tests/rls/policies.test.ts` — integration tests hitting a real DB for RLS policy correctness across roles (visitor, author, editor, manager, admin). Structured with `beforeAll` setup and `afterAll` teardown.
- `tests/schemas/` — TypeBox schema validation tests for admin, articles, auth, categories, comments, subscriptions, users.
- `tests/utils/` — unit tests for audit logging, email, logger, storage.
- `tests/seeds/e2e-users.test.ts` — seed function integration test.

**E2E tests** (`tests/e2e/`, Playwright):
- Auth: login.
- Author: create-article, dashboard, edit-article.
- Editor/Manager: article approval and rejection workflows (full multi-actor scenarios).
- Registered user: article-view, comments, likes, profile.
- Visitor: homepage, registration, search.
- Admin: role management.
- Subscription workflow.

No `test.skip`, `it.skip`, `xit`, or `xdescribe` calls found. The RLS policy tests are particularly strong — they seed isolated data per test run and verify role-based visibility at the DB level, not just the API level.

**Recommendations:**

1. `tests/e2e/subscription-workflow.spec.ts:5–6` uses fallback credentials (`?? "jan.novak@claudedaily.cz"`) where other E2E tests use `!` assertions — consider enforcing `TEST_EMAIL` is always set to catch misconfigured CI environments early.
2. Add backend unit tests for service-layer business rules — e.g., that a `DRAFT` article cannot be approved, or that an `AUTHOR` cannot approve their own article — independent of the E2E suite.

---

### 10. Logging & Monitoring

**Status:** ✅ Good

**Findings:**

`apps/server/src/utils/logger.ts` is a hand-rolled NDJSON structured logger with level filtering (`LOG_LEVEL` env var), ISO timestamps, and optional file mirroring (`LOG_FILE`). Errors and warnings emit to `console.error`; info/debug to `console.log`. The level defaults to `info` in production and `debug` elsewhere. The logger is used throughout services (e.g., `likes.ts:21`, `comments.ts:40,98`, `subscriptions.ts:91`).

The server startup log in `server.ts` redacts database credentials: `DATABASE_URL.replace(/:\/\/.*@/, "://<redacted>@")` — good practice.

Of the 48 `console.log` calls in non-test source, the vast majority are in seed scripts (`seedEmma.ts`, `seedE2eUsers.ts`, `seedNewspaper.ts`, etc.) and the build script (`build.ts`), which do not run in production. The only runtime `console.log` is `apps/web/src/index.ts:42` (frontend server startup). No `console.log` of passwords, tokens, or secrets was found.

**Recommendations:**

1. Replace `console.log` in `apps/web/src/index.ts:42` with the structured `logger` (or at minimum `process.stdout.write`) for consistency with the server's logging approach.
2. A `packages/shared/logger` module could expose the same logger to both the server and web server processes without duplication.

---

### 11. Error Handling

**Status:** ⚠️ Concerns — the backend error hierarchy and global handler are well-designed, but several frontend `catch` blocks silently swallow failures.

**Findings:**

**Backend:** `apps/server/src/errors/index.ts` defines a typed `HttpError` hierarchy (`BadRequestError` 400, `UnauthorizedError` 401, `ForbiddenError` 403, `NotFoundError` 404, `ConflictError` 409, `UnprocessableError` 422). The global `onError` handler in `server.ts:94` distinguishes `HttpError` instances (returning their code and status) from unknown errors (returning 500 and logging with stack trace). This is correct and complete.

**Frontend — silent catches:**
- `apps/web/src/pages/director/PublicationQueue.tsx:28–30`: `} catch { /* empty */ }` — a loading failure produces no user feedback.
- `apps/web/src/pages/ArticleEditorPage.tsx` — three `useEffect` fetch chains end in `.catch(() => {})`, silently ignoring all errors.
- `apps/web/src/components/StatisticsSection.tsx:38–43` — similar silent catch.
- `apps/web/src/components/Navbar.tsx` — user info and subscription fetch errors are silent.

**Frontend — good patterns:** Login, SignUp, PasswordReset, and SetNewPassword pages catch errors and surface them via `setError` or root error messages. `EditorialQueueSection.tsx` uses TanStack Query's `onError` callbacks to show toast notifications (lines 167, 179, 210). `LexicalErrorBoundary` is used in the rich text editor and article page.

**Recommendations:**

1. In `PublicationQueue.tsx:28–30`, replace `/* empty */` with a `setError(true)` state variable (or a toast) so load failures are visible to the user.
2. In `ArticleEditorPage.tsx`, convert the three `useEffect` fetches to TanStack Query — which exposes `isError` — and render an error message when loading fails.
3. In `Navbar.tsx`, add a fallback UI when user-info fetching fails (e.g., show a "Sign in" link) rather than silently leaving the navbar in an indeterminate state.

---

### 12. Security

**Status:** ✅ Good

**Findings:**

**CORS:** `apps/server/src/server.ts:36–41` configures CORS with `origin: process.env.FRONTEND_URL ?? "http://localhost:5173"` — not a wildcard. Allowed methods and headers are explicitly enumerated, and `credentials: true` is set.

**No hardcoded secrets:** A search for API keys, tokens, and connection strings in source files found none. The `.env.example` uses generic placeholder values, which are not real secrets.

**SQL injection:** All database queries go through Drizzle ORM's query builder. The only `sql` template literal calls are for `SET CONFIG` GUCs in `rls.ts:17–19`, where values are Drizzle-parameterized (not raw string concatenation).

**`.gitignore`:** Covers `.env*` patterns across the project.

**Defense-in-depth:** Row-Level Security policies at the PostgreSQL layer enforce access control independently of application code, tested by `apps/server/tests/rls/policies.test.ts`.

**JWT blocklisting:** Logout invalidates the session JTI in Redis, preventing token replay after logout.

**Recommendations:**

1. The `.env.example` JWT secret value is `newspaper` — a dictionary word. The README should note that production requires a long random value (e.g., `openssl rand -hex 64`).
2. Confirm MinIO bucket ACL intent: the `minio-init` container sets `pb138-images` to public. This is intentional for article images, but verify that profile pictures uploaded to the `profiles/` prefix are also acceptable to be publicly readable, or apply a more restrictive policy to that prefix.

---

### 13. Forms

**Status:** ⚠️ Concerns — React Hook Form is used in most forms, but no validation schema resolver is wired, and `SignUpPage.tsx` is a textbook form-as-useState anti-pattern.

**Findings:**

`react-hook-form` is in `apps/web/package.json`. Zod is present in the workspace root `package.json`. However, `@hookform/resolvers` is **not installed**, so no Zod schema is connected to any `useForm` call. All validation is either absent or manual.

**Forms using React Hook Form (without schema):** `LoginPage`, `PasswordCard`, `ArticleEditorPage` (with `Controller` for the Lexical editor), `DecisionForm`, `CategoriesSection`, `NewspaperUsersSection`, `EditorialQueueSection`, `PasswordResetPage`, `GlobalUsersSection`.

**Form-as-useState anti-pattern — `apps/web/src/pages/SignUpPage.tsx`:** This file has 10 `useState` calls corresponding to form fields and UI state (`fullName`, `username`, `email`, `password`, `confirmPassword`, `error`, `fieldErrors`, `loading`, `success`), a manual `handleSubmit` with `e.preventDefault()`, and manual validation (`if (password !== confirmPassword)`). Every other authenticated form in the app uses React Hook Form — `SignUpPage.tsx` does not, making it the clearest violation of consistency. This is exactly the pattern `useForm` is meant to replace.

**No validation schemas wired:** No `zodResolver(schema)` appears anywhere in the codebase. Validation relies on backend `422` responses and manual `if` guards, which means invalid input reaches the network before the user receives feedback.

**`DecisionForm.tsx` raw elements:** Despite using `useForm`, `DecisionForm.tsx:54,74,95,102` renders raw `<input>`, `<textarea>`, and `<button>` elements rather than the available shadcn components.

**Recommendations:**

1. Install `@hookform/resolvers` and define Zod schemas for at minimum `LoginPage`, `SignUpPage`, `PasswordCard`, and `ArticleEditorPage` forms to add client-side validation before network requests.
2. Rewrite `SignUpPage.tsx` using `useForm<SignUpFormValues>()` with a Zod schema (covering field length, email format, password match) to eliminate the 10 `useState` variables and the manual `handleSubmit`.
3. Replace raw elements in `DecisionForm.tsx` with shadcn `<Input>`, `<Textarea>`, and `<Button>`.

---

### 14. Frontend Structure

**Status:** ⚠️ Concerns — two page files significantly exceed the size guideline, custom hooks are sparse relative to the codebase's complexity, and several pages mix data fetching directly in component bodies.

**Findings:**

**God components:**

- `apps/web/src/pages/ArticleEditorPage.tsx` — **657 lines**. This file combines: React Hook Form setup, three separate `useEffect` fetches (categories, user profile, existing article data), image upload and deletion state and handlers, scheduling state and UI, rich text editor integration via `Controller`, status badge rendering, and form submission. It is clearly doing too much.
- `apps/web/src/pages/ArticlePage.tsx` — **438 lines**, mixing article rendering, comment listing, comment posting (with React Hook Form), view tracking, likes, and the Lexical read-only editor.
- `apps/web/src/pages/AuthorDashboardPage.tsx` — **354 lines** with article table, filtering, status mapping, and delete/submit actions.
- `apps/web/src/pages/dashboard/EditorialQueueSection.tsx` — **341 lines** mixing three TanStack Query hooks, mutations, and the editorial table UI.

**Insufficient custom hooks:** Only 4 custom hooks exist (`useArticleViewTracker`, `useCategory`, `useNewspaper`, `useTheme`). For a codebase of this complexity, the absence of hooks like `useUser`, `useArticles`, `useEditorQueue`, `useSubscriptionStatus` forces all fetching and transformation logic into component bodies.

**Data fetching in component bodies:** Several pages use raw `fetch + useEffect` directly in the component rather than delegated to hooks:
- `apps/web/src/pages/DirectorDashboardPage.tsx:26–38`
- `apps/web/src/pages/AuthorPage.tsx:49–54`
- `apps/web/src/pages/UserProfilePage.tsx:27–31`
- `apps/web/src/components/Navbar.tsx` (user/subscription fetch alongside the correct category `useQuery`)
- `apps/web/src/pages/ArticleEditorPage.tsx` (three separate fetches)

**Note on router:** The project uses React Router DOM v7, not TanStack Router, so there is no `loader` pattern — in-component `useQuery` is the idiomatic approach. The concern here is specifically about the raw `fetch/useEffect` bypasses, not about `useQuery` placement.

**Recommendations:**

1. Extract `ArticleEditorPage.tsx` into at minimum: an `ArticleFormSection` (form fields), an `ArticleImagesSection` (image management), a scheduling sub-component, and a `useArticleEditor` hook that owns data loading and submission logic.
2. Extract `ArticlePage.tsx` into `ArticleContent`, `CommentsSection`, and `ArticleActions` sub-components.
3. Create `useUser()`, `useSubscriptionStatus()`, `useAuthorProfile()` custom hooks wrapping TanStack Query to replace the raw `useEffect` fetch patterns in `Navbar.tsx`, `DirectorDashboardPage.tsx`, `AuthorPage.tsx`, `UserProfilePage.tsx`, and `ArticleEditorPage.tsx`.
4. In `EditorialQueueSection.tsx`, extract the three queries and mutations into a `useEditorialQueue(newspaperId)` hook to reduce the component to a rendering concern.
