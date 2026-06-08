# Project Review: pb138 — Newspaper Platform

**Date:** 2026-06-08

---

## Project Orientation

The project is a Turborepo monorepo with two applications: `apps/server` (Elysia 1.4 on Bun, Drizzle ORM, PostgreSQL 17) and `apps/web` (React 19, React Router v7, TailwindCSS v4, shadcn/ui via Base UI, TanStack Query v5). Infrastructure services — PostgreSQL, Redis, and MinIO (S3-compatible image storage) — run in Docker Compose. Authentication uses `@elysiajs/jwt` (JWT) with `Bun.password` (argon2) for hashing and a Redis-based JWT blocklist for logout. The backend is structured into `routes/`, `services/`, `schemas/`, and `utils/` layers, with Row-Level Security enforced at the PostgreSQL level for fine-grained data isolation. Testing comprises 14 server-side unit/integration tests (bun test) and 15 Playwright E2E test files covering multi-role workflows.

---

## Review Summary

| Category              | Status |
| --------------------- | ------ |
| Component Library     | ✅ Good |
| Styling               | ⚠️ Concerns |
| Loading Data          | ⚠️ Concerns |
| Environment Variables | ✅ Good |
| REST API Design       | ✅ Good |
| Database              | ✅ Good |
| BE Design Patterns    | ✅ Good |
| Auth                  | ✅ Good |
| Testing               | ✅ Good |
| Logging & Monitoring  | ⚠️ Concerns |
| Error Handling        | ⚠️ Concerns |
| Security              | ✅ Good |
| Forms                 | ⚠️ Concerns |
| Frontend Structure    | ⚠️ Concerns |

Status legend: ✅ Good | ⚠️ Concerns | ❌ Issues | N/A

---

## Detailed Review

### 1. Component Library

**Status:** ✅ Good

shadcn/ui (via `@base-ui/react`) is declared in `apps/web/package.json` and adopted broadly across the codebase. `Button`, `Input`, `Label`, `Textarea`, `Select`, `Badge`, `Table`, `Dialog`, and `Toaster` are imported and used in pages and components. The `FormField` wrapper component (`src/components/FormField.tsx`) correctly delegates to `<Input>` and `<Textarea>` from `components/ui/`, and `<Label>` was recently added. A grep for raw interactive elements finds only two remaining `<input type="file" className="hidden">` elements — one in `components/RichTextEditor.tsx:204` and one in `components/EditorSidebar.tsx:175`. Both are intentional invisible file-picker triggers that work in tandem with a `useRef`; they do not represent a library bypass. The `<textarea>` element found by grep is the internal implementation inside `components/ui/textarea.tsx:7`, not a usage site.

**Recommendations:**

1. The two hidden file inputs could also be replaced with the shadcn `Input` component (passing `className="hidden"`) for complete consistency, though this is a minor cosmetic point.
2. Consider extracting the file-picker trigger pattern into a reusable `FilePickerButton` component to avoid duplicating the `ref + hidden input + Button` triad.

---

### 2. Styling

**Status:** ⚠️ Concerns

**Inline styles:** Six `style={}` usages exist. Three are legitimate dynamic calculations that cannot be expressed as static Tailwind classes — progress-bar widths in `GlobalStatsDashboard.tsx:59`, `HorizBar.tsx:18`, `Timeline.tsx:25`, and a 1px sentinel div in `ArticlePage.tsx:212`. Two are problematic: `ProfileInfoCard.tsx:154` and `PasswordCard.tsx:55` both set `style={{ fontFamily: "Outfit, Inter, sans-serif" }}` inline on `<h2>` elements. This font is already loaded via `@fontsource/outfit` and should be applied through a Tailwind utility class or a CSS variable, not an inline style.

**Arbitrary value abuse:** `AuthorDashboardPage.tsx` contains 14+ hardcoded hex color values in the `STATUS_STYLES` and `STATUS_DOT` maps (`bg-[#2563eb18]`, `text-[#dc2626]`, etc.). These bypass the design token system entirely. Additionally, arbitrary pixel sizes for typography (`text-[11px]`, `text-[12px]`, `text-[13px]`) appear in many files. The project defines CSS custom properties and Tailwind tokens — article status colors should be defined as design tokens, not magic hex strings scattered through a data file.

**`!important`:** The single `!important` in `src/index.css:35` is intentional and documented with a comment explaining why it is needed for the animation API. This is acceptable.

**Recommendations:**

1. Remove the two `style={{ fontFamily: ... }}` inline styles from `ProfileInfoCard.tsx:154` and `PasswordCard.tsx:55`; apply via a Tailwind class or extend the theme config.
2. Move the `STATUS_STYLES` hex color map in `AuthorDashboardPage.tsx` to Tailwind theme tokens or CSS custom properties, eliminating the arbitrary hex values.
3. Replace `text-[11px]` / `text-[12px]` / `text-[13px]` with named Tailwind text-size tokens — the project already defines custom sizes like `text-2xs` and `text-xs-plus` in the theme config; use those consistently.

---

### 3. Loading Data

**Status:** ⚠️ Concerns

TanStack Query is correctly set up with a shared `queryClient` in `src/lib/queryClient.ts` and a `QueryClientProvider` wrapping the app in `frontend.tsx`. Query keys are stable arrays throughout: `["article", newspaper?.id, articleId]`, `["categories", newspaperId]`, `["editorial-queue", newspaperId, currentPage]`, etc. Logic is correctly extracted into custom hooks (`useNewspaper`, `useArticleEditor`, `useEditorialQueue`, `useUser`, `useCategory`) that house the `useQuery`/`useMutation` calls.

However, several components bypass TanStack Query entirely with raw `fetch` + `useEffect` + `useState`:

- `NewspaperHomepage.tsx:16–24` — raw `fetch` inside `useEffect`, no loading state, errors silently swallowed.
- `GlobalUsersSection.tsx:51–56` — `useCallback` + `useEffect` + manual loading state instead of `useQuery`.
- `CategoriesSection.tsx:97–116` — same pattern for the categories list.
- `director/PublicationQueue.tsx:21–31` — raw `fetch` with `useEffect`.
- `NewspaperUsersSection.tsx` — raw `fetch` for all CRUD operations (lines 70, 144, 172).

These bypasses mean those data fetches get no caching, no deduplication, no background refetch, and no retry logic.

**Recommendations:**

1. Migrate `NewspaperHomepage.tsx` to `useQuery` (or a `useHomepageArticles` hook) — this is the most visible page and currently has a silent error path with no user feedback.
2. Migrate `GlobalUsersSection.tsx`, `CategoriesSection.tsx`, and `director/PublicationQueue.tsx` to `useQuery`/`useMutation` — the manual `useCallback`/`useEffect` + `setLoading` boilerplate is significantly longer than the equivalent `useQuery` call.
3. Migrate `NewspaperUsersSection.tsx` fully to TanStack Query — it has the most raw `fetch` calls of any file.
4. Establish a team rule: all server data fetching must go through TanStack Query hooks. Raw `fetch` in a component body should fail code review.

---

### 4. Environment Variables

**Status:** ✅ Good

`.env` is present in `.gitignore` along with `.env.development.local`, `.env.test.local`, `.env.production.local`, and `.env.local`. A comprehensive `.env.example` is committed at the repo root covering all required variables (database, JWT, SMTP, MinIO, Redis, frontend URL, logging). There is also a `tests/.env.example` for E2E test credentials.

All env access in the backend uses `process.env.*` consistently (`apps/server/src/server.ts:22`, `apps/server/src/db/index.ts:5`, `apps/server/src/utils/storage.ts:5–9`). No secrets or connection strings are hardcoded in application source.

One minor observation: `apps/server/src/db/seeds/seedE2eUsers.ts:61` contains `"http://localhost:9000/pb138-images/profiles/e2e-placeholder.webp"` as a hardcoded URL. This is in a seed script used only for test setup, so it is low risk, but it could reference `process.env.PUBLIC_IMAGES_BASE_URL` instead.

**Recommendations:**

1. In `seedE2eUsers.ts:61`, replace the hardcoded `http://localhost:9000/...` URL with `${process.env.PUBLIC_IMAGES_BASE_URL}/pb138-images/profiles/e2e-placeholder.webp` for consistency.
2. Consider adding `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` as separate env vars rather than reusing `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` — in production these would be distinct IAM credentials, not the root account.

---

### 5. REST API Design

**Status:** ✅ Good

Routes are resource-oriented and use plural nouns: `/api/newspapers/:newspaper_id/articles`, `/api/newspapers/:newspaper_id/categories`, `/api/users/:user_id/roles`, etc. No verb-in-path anti-patterns were detected. HTTP verb usage is correct: GET for reads, POST for creates (returning 201), PATCH for partial updates, DELETE for removals (returning 204 per `articles.ts:97`).

State-transition actions — `/submit`, `/assign-editor`, `/review`, `/approve`, `/schedule`, `/publish` — use POST on action sub-resources. This is a pragmatic and widely-accepted pattern for modelling state machines in REST where there is no idiomatic alternative.

Request/response validation uses TypeBox (`t.Object`, `t.String`, etc.) from `@sinclair/typebox` via Elysia's schema integration. Schemas are properly separated into `apps/server/src/schemas/` files.

Custom error classes (`ForbiddenError`, `NotFoundError`, `UnprocessableError`) in `src/errors/` are thrown from services and handled by the global `onError` hook in `server.ts:94`, which maps them to the correct HTTP status codes. The `set.status = 201` / `set.status = 204` pattern is used correctly at the route level for non-default codes.

**Recommendations:**

1. The `GET /api` endpoint at `server.ts:78` makes a direct DB call (`db.select().from(newspapers)`) inside the route handler. This is the only instance of a DB call outside a service function — move it into a service for consistency.
2. Verify that `GET /api/newspapers/:id/articles/:article_id` returns 404 (not 200 with a null body) when an article does not exist — some service functions may return `null` and let Elysia serialize it silently.

---

### 6. Database

**Status:** ✅ Good

The schema in `apps/server/src/db/schema.ts` is well-structured with proper relational design. All tables use UUID primary keys with `.defaultRandom()`. Foreign keys are declared with cascade behaviour (`onDelete: "cascade"` or `onDelete: "set null"` as appropriate). Composite primary keys are used correctly for join tables (`likes`, `userRoles`, `globalRoles`). Unique constraints are defined where needed (e.g., `email_newspaper_idx`, `article_category_slug_newspaper_unique`).

Images are stored in MinIO (S3-compatible), not in the database — only the URL is stored as `text`. The `Blob` references in `services/articles.ts:671` and `services/users.ts:130` are runtime Blob objects used for type-checking and resizing before upload, not database columns.

Six versioned SQL migration files exist in `apps/server/drizzle/` (`0001` through `0006`), including a dedicated RLS migration (`0002_enable_rls.sql`). One TypeScript migration exists in `apps/server/src/db/migrations/addGlobalEmailUniqueIndex.ts`. Raw SQL (`sql\`...\``) is used only in `db/rls.ts` for setting PostgreSQL session GUCs (a legitimate necessity) and in setup/migration scripts.

**Recommendations:**

1. The `articles` table is missing an `updatedAt` timestamp column, yet the API response type in `AuthorDashboardPage.tsx:29` exposes `updated_at`. Verify this is populated correctly and not silently returning `null` or falling back to `created_at`.
2. The TypeScript migration in `src/db/migrations/addGlobalEmailUniqueIndex.ts` sits outside the Drizzle SQL migrations folder and is not part of the `drizzle-kit migrate` flow. Consolidate all migrations into the `drizzle/` SQL files with a matching `_journal.json` entry.
3. The `userRoles` table allows `null` for `userId` and `newspaperId` despite having foreign key references — add `.notNull()` to both columns to enforce referential integrity at the schema level.

---

### 7. Backend Design Patterns

**Status:** ✅ Good

The backend follows a clear two-layer separation: `routes/` files are thin — they validate inputs, call a service function, set the response status, and return. All business logic, ownership checks, role enforcement, and data access live in `services/`. The `withDb` / `withRls` abstraction passes a typed transaction (`Tx`) parameter through service calls, ensuring RLS session variables are set before any query executes.

The `authMiddleware` and `requireRole` factories in `src/middleware/auth.ts` cleanly encapsulate authentication and coarse-grained authorization as Elysia plugins, keeping routes free of auth boilerplate.

The only direct DB call outside a service is `server.ts:79` — a simple newspaper count in the `/api` health endpoint. This is acceptable.

One concern: `apps/server/src/services/articles.ts` is 1064 lines. It combines article CRUD, the multi-step approval state machine, image management, view tracking, and search — all in a single file.

**Recommendations:**

1. Split `services/articles.ts` into at least two files: `services/articlesCrud.ts` (list, get, create, update, delete) and `services/articlesWorkflow.ts` (submit, assign-editor, review, approve, schedule, publish).
2. Consider a third split: `services/articleImages.ts` for `uploadArticleImage` and `deleteArticleImage`, since these interact with external storage (MinIO) and have a distinct concern.
3. The auth middleware makes three sequential DB round-trips per authenticated request (user lookup, newspaper roles, global roles). Consider combining into a single query with joins to reduce per-request latency.

---

### 8. Auth

**Status:** ✅ Good

Authentication uses `@elysiajs/jwt` (the official Elysia JWT plugin) — not raw `jsonwebtoken`. JWT `sign`/`verify` calls in `services/auth.ts` go through the plugin's `jwt` context object. Password hashing uses `Bun.password` (argon2id), which is a secure modern choice and not a hand-rolled bcrypt implementation.

Logout is properly implemented with a JTI (JWT ID) blocklist in Redis (`isJtiBlocklisted` in `src/utils/redis.ts`), preventing reuse of revoked tokens. The auth middleware in `src/middleware/auth.ts` checks the blocklist on every request.

Authorization is layered at two levels: coarse-grained via `requireRole(role)` middleware at the route level (401/403 responses), and fine-grained via PostgreSQL Row-Level Security policies (`drizzle/0002_enable_rls.sql`). The RLS session GUCs (`app.user_id`, `app.newspaper_id`, `app.roles`) are set via `db/rls.ts` before every query, ensuring database-level data isolation between newspapers and users.

**Recommendations:**

1. Email verification tokens and password-reset tokens are signed JWTs (`services/auth.ts:92`, `227`). Confirm that using a reset token a second time is rejected — the token should be invalidated (e.g., via the JTI blocklist or a `used_at` column) after first use.
2. The auth middleware runs `derive({ as: "global" })` on every request. Consider caching the role lookup result in Redis keyed by JWT `jti` with the token's remaining TTL to reduce the per-request DB load.

---

### 9. Testing

**Status:** ✅ Good

The project has 29 test files with no skipped or `todo` tests. Testing splits into two tiers:

**Server unit/integration tests** (`apps/server/tests/`, run with `bun test`):
- `tests/rls/policies.test.ts` — tests data isolation between newspapers for the `articles`, `comments`, `likes`, and `user_roles` tables using real DB queries with different RLS sessions. This is an excellent and uncommon practice that verifies the security model directly.
- `tests/schemas/` — six schema validation test files covering request/response shapes for auth, articles, categories, comments, subscriptions, and users.
- `tests/utils/` — tests for `logger`, `email`, `storage`, and `audit` utilities.

**E2E tests** (`tests/e2e/`, run with Playwright):
- Full multi-role workflow tests: `article-approval-workflow.spec.ts` and `article-rejection-workflow.spec.ts` exercise the complete article lifecycle across author, editor, manager, and director roles.
- Auth, registration, search, comments, likes, profile, subscription, and admin role management are all covered.

**Recommendations:**

1. `services/articles.ts` (1064 lines, the most complex file) has no service-level unit tests. Add tests for state-machine transitions (e.g., `submitArticle` rejects non-DRAFT articles, `approveArticle` enforces role requirements) without going through the HTTP stack.
2. There are no React component or hook unit tests — the frontend is tested only via E2E. Consider adding tests for the most critical hooks (`useArticleEditor`, `useEditorialQueue`) using `@testing-library/react`.
3. Verify that `apps/server/src/db/seeds/helpers.test.ts` is intentionally included in the `bun test` run and not a test file that accidentally ended up in the seeds directory.

---

### 10. Logging & Monitoring

**Status:** ⚠️ Concerns

The project has a custom structured logger in `apps/server/src/utils/logger.ts` that emits JSON lines with `level`, `timestamp`, and `message` fields. It respects a `LOG_LEVEL` env variable, supports optional file mirroring via `LOG_FILE`, and correctly routes `error`/`warn` to `stderr` and `info`/`debug` to `stdout`. Production server code uses `logger.*` consistently throughout `server.ts`, `services/subscriptions.ts`, and `services/articles.ts`.

The 48 `console.log` calls in non-test source are mostly in seed scripts and `build.ts`, which is acceptable. No sensitive data (`password`, `token`, `secret`) appears in any log call.

Two gaps stand out: (1) there is no per-request correlation ID, making it impossible to trace all log lines belonging to a single request in production; and (2) `apps/web/src/index.ts:42` uses a bare `console.log` for the server startup message rather than the structured logger.

**Recommendations:**

1. Add a request-scoped correlation ID (e.g., a UUID generated per request in Elysia's `derive` middleware) and include it in every log line. This is essential for production debugging.
2. Replace `console.log` in `apps/web/src/index.ts:42` with a structured log call for consistency.
3. For future-proofing: consider replacing the custom logger with `pino` (minimal overhead, JSON by default, wide ecosystem support) if structured log ingestion (Datadog, Loki, etc.) becomes a requirement.

---

### 11. Error Handling

**Status:** ⚠️ Concerns

The backend has good foundations: a global `onError` hook at `server.ts:94` catches all unhandled errors, custom error classes are thrown from services and mapped to appropriate HTTP status codes, and route handlers use `set.status = 201/204` correctly.

However, several silent catches exist in the frontend:

- `NewspaperHomepage.tsx:24`: `.catch(() => {})` — fetch errors are silently swallowed; the user sees an empty homepage with no explanation.
- `director/PublicationQueue.tsx:28–30`: `catch { /* empty */ }` — load errors produce no visible error state.
- `GlobalUsersSection.tsx:61–63`: `catch { /* empty */ }` — user list load failures are invisible to the user.

These cases leave users staring at an empty or perpetual loading state. The `ErrorState` component (`src/components/ErrorState.tsx`) exists and is used in `EditorialQueueSection`, `CategoriesSection`, and others — it is simply not being applied consistently.

Additionally, several catch blocks use `alert(...)` for error feedback (e.g., `GlobalUsersSection.tsx:111`, `CategoriesSection.tsx`) — `alert()` is not appropriate for production UI; the `Toaster`/`useToast` pattern already used in `ReviewQueueSection.tsx` should be preferred.

**Recommendations:**

1. Fix the three silent `catch` blocks in `NewspaperHomepage.tsx`, `PublicationQueue.tsx`, and `GlobalUsersSection.tsx` — at minimum set an error boolean and render `<ErrorState />`.
2. Replace all `alert(...)` calls in catch blocks with `useToast` notifications — the infrastructure is already present.
3. Add a React `<ErrorBoundary>` at the router level to catch uncaught rendering errors and display a meaningful fallback UI rather than a blank page.

---

### 12. Security

**Status:** ✅ Good

CORS is configured in `server.ts:36–38` to allow requests only from `process.env.FRONTEND_URL` (defaulting to `http://localhost:5173`). Wildcard `*` origin is not used. No hardcoded API keys, passwords, or tokens were found in application source code. All credentials flow through environment variables.

All database queries use Drizzle ORM's query builder — no raw SQL string interpolation that would create an injection risk. The `sql\`...\`` tagged template literal is used only in `db/rls.ts` for setting PostgreSQL session variables using parameterised calls (`set_config('app.user_id', ${session.userId ?? ""}, true)`), which are safe.

`.gitignore` covers `.env`, `.env.local`, and `.env.*.local` variants. JWT blocklisting via Redis prevents token reuse after logout. PostgreSQL RLS provides defence-in-depth even if an application-layer authorization bug exists.

**Recommendations:**

1. The `JWT_SECRET` placeholder value in `.env.example` is the literal string `"newspaper"`. Add a prominent comment warning that this must be replaced with a cryptographically random value before any deployment. The startup check at `server.ts:29` (`if (!process.env.JWT_SECRET)`) is good — consider also warning if the value is too short (under 32 chars).
2. MinIO credentials in `.env.example` use `minioadmin`/`minioadmin` — the README should explicitly warn these must be changed in non-local environments.
3. Consider adding security response headers (Content-Security-Policy, X-Frame-Options, X-Content-Type-Options) via an Elysia middleware for the frontend server.

---

### 13. Forms

**Status:** ⚠️ Concerns

React Hook Form is used throughout the codebase for all forms except one. Most forms follow good patterns: `useForm<TypedValues>()`, `register()` or `Controller` for inputs, `handleSubmit` for submission, and `formState.errors` for displaying validation messages. `DecisionForm`, `LoginPage`, `PasswordCard`, `ProfileInfoCard`, `GlobalUsersSection`, `ArticleEditorPage`, and `CommentsSection` all use RHF correctly.

**The significant exception is `SignUpPage.tsx`** — the most visible public form in the application. It has 10 `useState` calls: five for form field values (`fullName`, `username`, `email`, `password`, `confirmPassword`), one for a general error, one for field-level errors, one for loading, and one for success. Submission is handled by a manual `handleSubmit(e: React.FormEvent)` that calls `e.preventDefault()`, performs a manual `if (password !== confirmPassword)` validation, and manages its own loading state with `try/finally`. This is a textbook hand-rolled form, inconsistent with every other form in the project.

**Zod is not wired to any frontend form.** The workspace has `"zod": "^3.25.0"` in the root `package.json`, and the backend uses TypeBox for schema validation, but the frontend does not use Zod with `@hookform/resolvers`. All frontend validation relies on RHF's inline `validate` callbacks, which are not reusable and cannot share validation logic with the backend.

**Recommendations:**

1. Rewrite `SignUpPage.tsx` using `useForm<SignUpFormValues>()` with `register()` and `handleSubmit()` — this eliminates all five field `useState` calls and the manual `e.preventDefault()`. Server-side field errors (lines 57–67) map cleanly to `setError("email", ...)` and `setError("username", ...)` which RHF supports natively.
2. Add `@hookform/resolvers` and wire a Zod schema to the registration form for client-side format validation before the server round-trip.
3. `SetNewPasswordPage.tsx` has 6 `useState` calls and also bypasses RHF — migrate it for consistency.

---

### 14. Frontend Structure

**Status:** ⚠️ Concerns

The project has made a genuine effort at separation of concerns. Ten custom hooks extract non-trivial logic from components: `useArticleEditor`, `useEditorialQueue`, `useNewspaper`, `useCategory`, `useUser`, `useImageUpload`, `useSubscriptionStatus`, `useArticleViewTracker`, `useAuthorProfile`, `useTheme`. This is the right architectural direction and results in lean page files in most cases.

The largest page file is `AuthorDashboardPage.tsx` at 331 lines. It contains three inline status maps (`STATUS_LABELS`, `STATUS_STYLES`, `STATUS_DOT`), two inline SVG icon components (`PencilIcon`, `PlusIcon`), and the sidebar filter rendered as an inline JSX variable. The status maps partially duplicate what is already in `src/lib/articleStatus.ts`; the icons duplicate `src/components/Icons.tsx`. These should be consolidated.

`ProfileInfoCard.tsx` (275 lines) mixes avatar upload logic, form state, and rendering in one place — the upload logic should move to a `useAvatarUpload` hook analogous to the existing `useImageUpload`. `NewspaperUsersSection.tsx` (272 lines) uses raw fetch throughout with no corresponding custom hook.

**`NewspaperHomepage.tsx`** is the most structurally inconsistent file: it uses raw `fetch` + `useEffect` + `useState` instead of `useQuery`, which is the pattern used on every other data-fetching page. It also silently swallows errors (see Category 11).

React Router v7 is used without loader functions — all data fetching happens inside component bodies via hooks. This is acceptable when using TanStack Query, as queries can run in parallel and cached results hydrate immediately.

**Recommendations:**

1. Consolidate the `STATUS_LABELS`, `STATUS_STYLES`, and `STATUS_DOT` maps in `AuthorDashboardPage.tsx` into `src/lib/articleStatus.ts`, which already has `STATUS_LABELS` and `statusToVariant` — remove the duplicates.
2. Extract the avatar upload logic in `ProfileInfoCard.tsx` into a `useAvatarUpload` hook, mirroring the `useImageUpload` hook that already handles article images.
3. Migrate `NewspaperHomepage.tsx` to `useQuery` with a `useHomepageArticles(newspaperId)` hook — this also resolves the silent error issue from Category 11.
4. The "New Article" link in `AuthorDashboardPage.tsx:219` is a raw `<Link>` styled with manual Tailwind button classes. Replace with `<Button asChild>` wrapping the `<Link>` for consistency with the rest of the UI.
5. For `NewspaperUsersSection.tsx`, create a `useNewspaperUsers` hook that migrates the raw fetch calls to TanStack Query, consistent with the rest of the codebase.
