# Project Review: pb138 — Newspaper Platform

**Date:** 2026-06-08

---

## Project Orientation

The project is a Turborepo monorepo with two applications: `apps/server` (Elysia v1.4 backend) and `apps/web` (React 19 frontend), plus a `packages/shared` shared-types package and a separate `tests/` workspace for Playwright e2e tests. The backend is a REST API over PostgreSQL 17 via Drizzle ORM with Row-Level Security policies enforced at the database layer; images are stored in MinIO (S3-compatible). The frontend uses React Router v7, TanStack Query v5, shadcn/ui components (Base UI primitives), and Tailwind CSS v4 with the Bun bundler serving the SPA. Authentication is JWT-based (`@elysiajs/jwt`) with Bun's built-in argon2 password hashing, a JTI blocklist in Redis for logout, and a two-tier `requireAuth`/`requireRole` middleware. The codebase is well-documented: API contract in `docs/API.md`, ERD in `docs/erd.dbml`, functional requirements in `docs/FUNCTIONAL_REQUIREMENTS.md`, and detailed seed data supporting the full user-role hierarchy (Visitor → Director).

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
| Logging & Monitoring  | ✅ Good |
| Error Handling        | ✅ Good |
| Security              | ✅ Good |
| Forms                 | ⚠️ Concerns |
| Frontend Structure    | ⚠️ Concerns |

Status legend: ✅ Good | ⚠️ Concerns | ❌ Issues | N/A

---

## Detailed Review

### 1. Component Library

**Status:** ✅ Good

The project uses shadcn/ui built on top of `@base-ui/react` primitives (`@base-ui-components/react: ^1.0.0-rc.0`, `@base-ui/react: ^1.2.0`). The `components/ui/` directory contains the project's local wrappers: `button.tsx`, `input.tsx`, `select.tsx`, `textarea.tsx`, `dialog.tsx`, `badge.tsx`, `card.tsx`, `table.tsx`, `toast.tsx`. These are imported consistently throughout all page and component files (e.g., `apps/web/src/pages/LoginPage.tsx:9-11`, `apps/web/src/pages/dashboard/ReviewQueueSection.tsx:15-16`, `apps/web/src/components/Navbar.tsx:19-20`).

Raw HTML elements appear in only two justified locations: `apps/web/src/components/RichTextEditor.tsx:204` (a hidden file `<input>` for image upload, which has no shadcn equivalent) and `apps/web/src/components/EditorSidebar.tsx:176` (likewise a file picker inside the Lexical editor toolbar). The `<textarea>` in `apps/web/src/components/ui/textarea.tsx:7` is the shadcn wrapper itself and is expected.

**Recommendations:**

1. No action required — the library is being used correctly and consistently.

---

### 2. Styling

**Status:** ⚠️ Concerns

Tailwind CSS v4 is used throughout with no BEM CSS (appropriate). However, two patterns should be addressed:

**Arbitrary pixel sizes.** Multiple files use Tailwind arbitrary value syntax for font sizes: `text-[11px]`, `text-[13px]`, `text-[14px]`, `text-[15px]`, `text-[18px]`, `text-[24px]` appear in `apps/web/src/pages/AuthorDashboardPage.tsx` (lines 125, 133, 150, 168, 173, 210, 213, 217, 222, 226, 233, 254), `apps/web/src/pages/profile/PasswordCard.tsx` (lines 54, 59, 94, 97), and `apps/web/src/pages/dashboard/CategoriesSection.tsx` (lines 60, 175). These should use Tailwind's design-token scale (`text-xs`, `text-sm`, `text-base`, etc.) or CSS custom properties — arbitrary pixel values bypass the design system and make global font-size changes difficult.

**Inline style attributes.** Seven uses of `style={{}}` exist:
- `apps/web/src/components/stats/HorizBar.tsx:18` and `Timeline.tsx:25` — dynamic percentage widths for chart bars. These are legitimately hard to express with Tailwind and are acceptable.
- `apps/web/src/pages/ArticlePage.tsx:212` — a sentinel div with `height: 1`. This could be `className="h-px"`.
- `apps/web/src/components/stats/GlobalStatsDashboard.tsx:59` and `NewspaperStatsDashboard.tsx:79` — dynamic bar widths, same rationale as HorizBar.
- `apps/web/src/pages/profile/PasswordCard.tsx:55` and `apps/web/src/pages/profile/ProfileInfoCard.tsx:131` — both set `fontFamily: "Outfit, Inter, sans-serif"`. This is a hardcoded font override that belongs in the global CSS or a Tailwind utility class.

The one `!important` in `apps/web/src/index.css:35` targets animation overrides and has an explanatory comment — this is acceptable.

**Recommendations:**

1. Replace all `text-[Npx]` arbitrary sizes in `AuthorDashboardPage.tsx`, `PasswordCard.tsx`, and `CategoriesSection.tsx` with Tailwind's semantic text-size tokens. Define custom tokens in your CSS if the design requires non-standard sizes.
2. Remove `style={{ fontFamily: "…" }}` from `PasswordCard.tsx:55` and `ProfileInfoCard.tsx:131`. Either apply the font via `className` (define a utility in your CSS) or rely on the existing `@fontsource` configuration already imported in the project.
3. Replace `style={{ height: 1 }}` in `ArticlePage.tsx:212` with `className="h-px"`.

---

### 3. Loading Data

**Status:** ⚠️ Concerns

TanStack Query v5 is correctly configured: a singleton `queryClient` is created in `apps/web/src/lib/queryClient.ts` and provided via `QueryClientProvider` in `apps/web/src/frontend.tsx`. A solid set of custom hooks wraps `useQuery`/`useMutation` properly — `useUser`, `useNewspaper`, `useHomepageArticles`, `useEditorialQueue`, `useCategory`, `useSubscriptionStatus`, `useArticleEditor`, `useNewspaperUsers` all follow the correct pattern. Query keys are stable arrays (`["me"]`, `["newspaper", newspaperName]`, `["editorial-queue", newspaperId, currentPage]`).

However, a significant portion of the codebase bypasses TanStack Query entirely and uses raw `fetch` inside `useEffect` or `useCallback`:

- `apps/web/src/pages/AdminDashboardPage.tsx:18-32` — two `useEffect` blocks with raw `fetch` for auth check and newspaper listing.
- `apps/web/src/pages/director/ApprovalQueue.tsx:26-50` — raw `fetch` in a `useCallback` + `useEffect`, with local `useState` for loading state.
- `apps/web/src/pages/director/PublicationQueue.tsx:21-55` — same pattern.
- `apps/web/src/pages/DashboardPage.tsx:37` — raw `fetch` in `useEffect`.
- `apps/web/src/pages/CategoryPage.tsx:44` — raw `fetch` in `useEffect`.
- `apps/web/src/pages/SearchResultsPage.tsx:43` — raw `fetch` in `useEffect`.
- `apps/web/src/components/StatisticsSection.tsx:30-47` — raw `fetch` with manual error/loading state.
- `apps/web/src/pages/director/BrandingSection.tsx:30` — raw `fetch` for a PATCH mutation.
- `apps/web/src/pages/profile/ProfileInfoCard.tsx:80` — raw `fetch` for a PUT mutation.

This inconsistency means these components have no caching, no deduplication, and require manual loading/error state management — the exact problems TanStack Query solves.

**Recommendations:**

1. Migrate the data-loading `useEffect` patterns in `ApprovalQueue.tsx`, `PublicationQueue.tsx`, `CategoryPage.tsx`, and `SearchResultsPage.tsx` to `useQuery` hooks, either inline or extracted into custom hooks in `src/hooks/`.
2. Convert the mutation calls in `BrandingSection.tsx` and `ProfileInfoCard.tsx` to `useMutation` from TanStack Query so errors and loading states are handled consistently.
3. The auth-guard pattern in `AdminDashboardPage.tsx` (fetch `/api/users/me` → redirect if not admin) can be consolidated with the existing `useUser` hook; avoid duplicating the auth fetch.
4. For `StatisticsSection.tsx`, use `useQuery` with a stable key so the statistics data is cached and doesn't reload on every render.

---

### 4. Environment Variables

**Status:** ✅ Good

`.env` is listed in `.gitignore`. An `.env.example` is committed to the repository with placeholder values for all required variables: `DATABASE_URL`, `JWT_SECRET`, `SMTP_*`, `REDIS_URL`, `MINIO_*`, `FRONTEND_URL`, `LOG_LEVEL`, and test credentials. There are no hardcoded connection strings or API keys in source files. CORS origin is read from `process.env.FRONTEND_URL` (`apps/server/src/server.ts:37`). The `DATABASE_URL` is validated at startup with a `process.exit(1)` guard (`server.ts:23-27`). The only URLs present in source are in `apps/web/src/lib/sampleData.ts` (picsum.photos) which is placeholder UI data — appropriate.

Minor: `.env.example` has duplicate `TEST_BASE_URL` and `TEST_NEWSPAPER` entries (they appear twice at the bottom of the file). This is cosmetic but worth cleaning up.

**Recommendations:**

1. Remove the duplicate `TEST_BASE_URL` and `TEST_NEWSPAPER` entries from `.env.example`.

---

### 5. REST API Design

**Status:** ✅ Good

Routes are resource-oriented with plural nouns: `/api/newspapers`, `/api/newspapers/:newspaper_id/articles`, `/api/newspapers/:newspaper_id/categories`, `/api/users/me`. No verbs appear in paths (action endpoints like `/submit`, `/assign-editor`, `/approve` represent state transitions — acceptable for domain actions). HTTP verbs are used correctly: GET for reads, POST for creates, PATCH for partial updates, DELETE for deletes.

TypeBox (`t.*`) request/response schemas are defined in a dedicated `apps/server/src/schemas/` directory and applied to all routes for `params`, `body`, and `query` validation. The custom error hierarchy (`BadRequestError` → 400, `UnauthorizedError` → 401, `ForbiddenError` → 403, `NotFoundError` → 404, `ConflictError` → 409) maps semantically to HTTP status codes. Article creation returns 201 (`apps/server/src/routes/articles.ts` sets `set.status = 201`), deletes return 204 (same file, set `set.status = 204`).

PATCH handlers accept partial bodies — correct PATCH semantics. The `PUT /api/admin/config` (`apps/server/src/routes/admin.ts:97`) replaces the whole configuration object — correct PUT semantics. Query parameters are used appropriately for filtering and pagination (`page`, `limit`, `status`, `category`, `q`).

**Recommendations:**

1. No major concerns. Consider verifying that every endpoint accepting query parameters has a declared `query:` TypeBox schema — a few endpoints may be missing query validation (check the routes directory for `.get(` calls without an explicit `query:` key).

---

### 6. Database

**Status:** ✅ Good

The schema in `apps/server/src/db/schema.ts` is well-structured: 13 tables with proper relational design — UUIDs used consistently as primary keys, foreign keys with appropriate cascade rules (`onDelete: "cascade"` on dependent tables). No `bytea`/`blob` columns exist; images are stored as URLs pointing to MinIO (`articleImages.url: text`, `newspaperAuthors.profilePictureUrl: text`).

Six versioned SQL migration files exist in `apps/server/drizzle/` (0001 through 0006), managed through Drizzle Kit with a `meta/_journal.json` tracking applied migrations. The RLS policies (`0002_enable_rls.sql`) are a notable security investment, enforcing tenant isolation at the database level.

Drizzle ORM is used for all application queries. Raw `sql` tagged templates appear only in `apps/server/scripts/db-setup.ts` (setup/init scripts) and `apps/server/src/db/rls.ts` (session GUC configuration) — not in application request paths.

One design note: `globalRoles` has `unique("global_roles_role_unique").on(table.role)` in `apps/server/src/db/schema.ts`, which enforces at most one holder of each global role. If multiple System Administrators should be permitted, this constraint needs to be removed.

**Recommendations:**

1. Verify whether `global_roles_role_unique` is intentional. If multiple System Administrators should be allowed, remove the unique index on `role` and generate a migration.
2. Consider adding a composite DB index on `(newspaper_id, state)` in the `articles` table to support queue queries that filter by both fields — this will become important as article counts grow.

---

### 7. BE Design Patterns

**Status:** ✅ Good

A clean three-layer separation is maintained:

- **`apps/server/src/routes/`** — HTTP request/response handling and TypeBox schema validation; delegates entirely to services. No database access.
- **`apps/server/src/services/`** — Business logic, authorization checks, multi-step operations. Receives a `withDb` function (RLS-scoped transaction) from route context.
- **`apps/server/src/db/`** — Schema definitions, seed scripts, RLS session setup.

Route files import only schemas and service modules — no direct DB calls in any `routes/*.ts` file (confirmed). The `withDb` abstraction in `apps/server/src/middleware/auth.ts` cleanly injects the RLS session into every transaction.

`apps/server/src/services/articles.ts` at 1064 lines and `admin.ts` at 824 lines are large. The article service's size reflects a non-trivial state machine (DRAFT → SUBMITTED → IN_REVIEW → APPROVED/REJECTED → PUBLISHED). Individual functions within both services are focused and single-purpose, which partially mitigates the size concern.

**Recommendations:**

1. Consider extracting the article state-transition functions from `apps/server/src/services/articles.ts` (submit, assign-editor, review, approve, schedule, publish) into a dedicated `apps/server/src/services/articleLifecycle.ts` module to keep the main service under ~500 lines.
2. The `admin.ts` service mixes user management, statistics, and configuration operations — separating these into `adminUsers.ts` and `adminStats.ts` would improve navigability.

---

### 8. Auth

**Status:** ✅ Good

Authentication uses `@elysiajs/jwt` for token signing/verification with a secret from `process.env.JWT_SECRET`. Passwords are hashed with `Bun.password.hash` (argon2 by default) and verified with `Bun.password.verify` (`apps/server/src/services/auth.ts:71`, `apps/server/src/services/auth.ts:125`) — no raw bcrypt or manual crypto. JWT payloads are verified on every request in `apps/server/src/middleware/auth.ts:23`, and a JTI blocklist in Redis invalidates tokens on logout.

The `requireAuth` middleware gates unauthenticated access (401) and `requireRole(role)` gates role-restricted endpoints (403). Authorization is enforced in services: ownership checks (`articles.ts:575-576` throws `ForbiddenError` when the requester is neither the owner nor an admin), cross-newspaper access checks, and role-based guards. RLS at the database layer provides a second enforcement line.

No roll-your-own auth vulnerabilities found. JWT expiration is set in the payload (`exp: JWT_EXPIRATION.session`).

**Recommendations:**

1. No critical issues. Consider documenting the JWT expiry duration (currently defined as `JWT_EXPIRATION.session` in `apps/server/src/utils/jwt.ts`) in the project README or `.env.example` so operators know the default session lifetime.

---

### 9. Testing

**Status:** ✅ Good

29 test files are present across three levels with no skipped or todo tests:

**Backend unit/integration tests** (`apps/server/tests/`):
- Schema validation tests for all TypeBox input schemas (`tests/schemas/*.test.ts`) — 7 files covering admin, articles, auth, categories, comments, subscriptions, and users.
- RLS policy tests (`tests/rls/policies.test.ts`) — directly test PostgreSQL access control by simulating different user sessions and verifying article/comment/like/user-role visibility rules. This is an excellent and uncommon investment.
- Utility tests for audit logging, email, the custom logger, and file storage.

**Playwright e2e tests** (`tests/e2e/`):
- Comprehensive workflow coverage organized by role: visitor (homepage, registration, search), registered user (article view, likes, comments, profile), author (dashboard, create article, edit article), admin (role management), plus cross-role workflows (article approval, article rejection, subscription).
- No tests are marked skip or todo.

The Bun built-in test runner handles backend tests (`"test": "bun --env-file=../../.env test"` in `apps/server/package.json`). Playwright handles e2e.

**Recommendations:**

1. The `apps/server/tests/utils/email.test.ts` likely depends on SMTP connectivity — consider mocking the email transport to make the test suite fully self-contained without external credentials.
2. Consider adding service-level integration tests (e.g., calling `articleService.createArticle` against a test transaction) in addition to the schema tests, to catch business-rule regressions independently of the e2e layer.

---

### 10. Logging & Monitoring

**Status:** ✅ Good

A custom structured logger is implemented in `apps/server/src/utils/logger.ts`. It emits NDJSON with `level`, `timestamp`, `message`, and arbitrary metadata. Log level is controlled by `LOG_LEVEL` env var (defaults to `debug` in development, `info` in production). An optional `LOG_FILE` env var mirrors every line to a file for production use. Error/warn go to stderr; info/debug go to stdout.

The logger is used consistently throughout services: `logger.warn` for authorization failures and not-found cases, `logger.info` for successful mutations, `logger.error` for unexpected failures. The server startup log redacts the database password (`server.ts:122`). No sensitive values (passwords, tokens) appear in any log statement.

Of the 48 `console.log` calls found, the vast majority are in seed scripts (`apps/server/src/db/seeds/*.ts`) and the build script (`apps/web/build.ts`) — appropriate for those contexts. The one `console.log` in `apps/web/src/index.ts:42` (server startup URL) uses `console.log` rather than the structured logger — minor inconsistency.

**Recommendations:**

1. Replace `console.log` in `apps/web/src/index.ts:42` with the structured logger (or accept it as a startup message — both are defensible).
2. Consider adding HTTP request logging middleware to Elysia (log method, path, status code, duration per request) to improve production observability.

---

### 11. Error Handling

**Status:** ✅ Good

A well-designed custom error hierarchy in `apps/server/src/errors/index.ts` provides typed subclasses mapping to 400, 401, 403, 404, 409, and 422 HTTP status codes. The global `onError` handler in `apps/server/src/server.ts:94` catches `HttpError` instances and returns structured JSON (`{ error: errorCode, ...details }`); unhandled exceptions fall back to 500 with full server-side logging.

Frontend error states are surfaced in most components: `isError` flags from `useQuery` drive `<ErrorState>` components (e.g., `AuthorDashboardPage.tsx:180`, `AuthorPage.tsx:56`, `EditorialQueueSection.tsx:132`, `UserProfilePage.tsx:25`). Optimistic update rollback is implemented in `ArticleActions.tsx:43` (like state reverts on error).

Two silent catch blocks exist:
- `apps/web/src/pages/admin/GlobalUsersSection.tsx:61-63`: `catch { /* empty */ }` around data load — user sees stale/empty data with no error message.
- `apps/web/src/pages/AdminDashboardPage.tsx:33`: `.catch(() => { /* empty */ })` on the newspaper list fetch — sidebar silently shows no newspapers on network failure.

**Recommendations:**

1. Replace the empty `catch` in `GlobalUsersSection.tsx:61` with an error state that informs the user the data failed to load, consistent with how `EditorialQueueSection` and `AuthorDashboardPage` handle errors.
2. Add error feedback in `AdminDashboardPage.tsx` for the newspaper list fetch failure so the sidebar communicates the failure rather than staying blank.

---

### 12. Security

**Status:** ✅ Good

CORS is explicitly configured in `apps/server/src/server.ts:36-42` via `@elysiajs/cors`. The `origin` is read from `process.env.FRONTEND_URL` (not a wildcard `*`), with an explicit allowlist of HTTP methods and headers plus `credentials: true`. No wildcard origin found.

No hardcoded API keys, passwords, or tokens were found in source code. `.gitignore` covers `.env` and all `.env.*` variants. Database queries use Drizzle ORM's parameterized query builder for all application request paths — no raw string interpolation creating SQL injection risk. The `sql` tagged template literals in `apps/server/src/db/rls.ts` pass values as parameters (safe). RLS policies provide database-level defense-in-depth.

**Recommendations:**

1. No critical issues. Consider adding a `Content-Security-Policy` header to the frontend server response to mitigate XSS risk, especially given the Lexical rich-text editor which renders user-authored HTML.

---

### 13. Forms

**Status:** ⚠️ Concerns

`react-hook-form: ^7.77.0` is present and correctly used in the majority of forms: `LoginPage.tsx`, `GlobalLoginPage.tsx`, `PasswordCard.tsx`, `PasswordResetPage.tsx`, `CommentsSection.tsx`, `DecisionForm.tsx`, `NewspaperUsersSection.tsx`, `CategoriesSection.tsx`, `GlobalUsersSection.tsx`. These forms use `useForm`, `handleSubmit`, `register`, and `Controller` appropriately.

Two significant gaps exist:

**`SignUpPage.tsx` — form-as-useState anti-pattern.** This file (`apps/web/src/pages/SignUpPage.tsx:14-22`) implements the registration form with 9 `useState` calls (`fullName`, `username`, `email`, `password`, `confirmPassword`, `error`, `fieldErrors`, `loading`, `success`), a manual `handleSubmit`, and manual password-match validation. This is the canonical form-as-useState anti-pattern. `react-hook-form` is already a project dependency — this form should use it.

**Zod not wired to react-hook-form.** `zod: ^3.25.0` is in workspace dependencies but `@hookform/resolvers` is absent. Zod schemas exist for backend validation (`apps/server/src/schemas/`) but the frontend forms perform no schema validation — client-side validation relies on HTML `required` attributes and manual `if` checks. Without `zodResolver`, validation logic is duplicated between client and server.

Error messages are rendered to users in all react-hook-form-based forms. The `SearchResultsPage.tsx` search form is a simple one-field form — its stateful approach is acceptable.

**Recommendations:**

1. Refactor `apps/web/src/pages/SignUpPage.tsx` to use `react-hook-form` with a Zod schema and `zodResolver` from `@hookform/resolvers`. This eliminates all 9 `useState` calls and the manual password-match check.
2. Install `@hookform/resolvers` and define a shared Zod schema for the login form (reusable between `LoginPage.tsx` and `GlobalLoginPage.tsx`). This enables typed validation with error messages without manual `if` checks.

---

### 14. Frontend Structure

**Status:** ⚠️ Concerns

The project has strong structural foundations: 11 custom hooks in `apps/web/src/hooks/` extract non-trivial logic from components, and pages are decomposed into purpose-built sections (`DashboardPage` → `EditorialQueueSection`, `MyArticlesSection`, `ReviewQueueSection`, `CategoriesSection`; `DirectorDashboardPage` → `ApprovalQueue`, `PublicationQueue`, `BrandingSection`). No file exceeds 300 lines.

Largest page files:
- `AuthorDashboardPage.tsx` — 285 lines
- `GlobalUsersSection.tsx` — 268 lines
- `ProfileInfoCard.tsx` — 252 lines
- `CategoriesSection.tsx` — 248 lines
- `EditorialQueueSection.tsx` — 244 lines

These are at the threshold but manageable. `AuthorDashboardPage.tsx` is the most likely candidate for further decomposition — it renders inline sidebar navigation, article list rows with inline status badge logic, and pagination, rather than delegating to sub-components.

The primary structural concern is **inconsistent data fetching strategy**. React Router v7 is used (not TanStack Router), so route loaders are not the expected pattern — but even within the component model, some pages use custom `useQuery` hooks while others use raw `fetch` + `useEffect`:

Pages using hooks correctly: `ArticlePage.tsx`, `AuthorPage.tsx`, `NewspaperHomepage.tsx`, `DirectorDashboardPage.tsx` (partially).

Pages using raw `fetch` + `useEffect`: `AdminDashboardPage.tsx`, `ApprovalQueue.tsx`, `PublicationQueue.tsx`, `DashboardPage.tsx`, `CategoryPage.tsx`, `SearchResultsPage.tsx`, `StatisticsSection.tsx`, `BrandingSection.tsx`. These components reinvent manual loading/error state that TanStack Query handles automatically. (This directly overlaps with the Loading Data concerns above.)

**Recommendations:**

1. Migrate `ApprovalQueue.tsx` and `PublicationQueue.tsx` to custom hooks (`useApprovalQueue`, `usePublicationQueue`) using `useQuery`/`useMutation`. This removes the local `useState` boilerplate and aligns them with the established hook pattern.
2. Extract the sidebar navigation from `AuthorDashboardPage.tsx` into a dedicated `AuthorSidebar.tsx` component to bring the file under 200 lines and separate navigation concern from content rendering.
3. Replace the manual fetch/loading/error state in `StatisticsSection.tsx` with a `useStatistics` custom hook backed by `useQuery`.
4. Document in `CLAUDE.md` or a developer guide that all server data fetching must go through TanStack Query (directly or via custom hooks) to prevent future drift back to raw-fetch patterns.
