# Project Review: pb138 — Newspaper Platform

**Date:** 2026-06-06

---

## Project Orientation

The project is a full-stack Turborepo monorepo with two apps (`apps/server` — Elysia backend, `apps/web` — React 19 frontend) and a shared types package. The backend uses Elysia v1.4 on Bun with Drizzle ORM + PostgreSQL, JWT auth via `@elysiajs/jwt`, Redis for token blocklisting, and MinIO for image storage. The frontend uses React Router DOM v7, TanStack Query v5, shadcn/ui via `@base-ui/react`, and Tailwind CSS v4. Infrastructure is containerised with Docker Compose, and the test suite combines `bun test` unit/integration tests (including a thorough RLS policy test) and Playwright end-to-end tests. A notable architectural highlight is the use of PostgreSQL Row-Level Security (RLS) policies to enforce multi-tenant data isolation at the database level.

---

## Review Summary

| Category              | Status |
| --------------------- | ------ |
| Component Library     | ⚠️ Concerns |
| Styling               | ⚠️ Concerns |
| Loading Data          | ⚠️ Concerns |
| Environment Variables | ✅ Good |
| REST API Design       | ✅ Good |
| Database              | ✅ Good |
| BE Design Patterns    | ✅ Good |
| Auth                  | ✅ Good |
| Testing               | ✅ Good |
| Logging & Monitoring  | ✅ Good |
| Error Handling        | ⚠️ Concerns |
| Security              | ✅ Good |
| Forms                 | ❌ Issues |
| Frontend Structure    | ⚠️ Concerns |

Status legend: ✅ Good | ⚠️ Concerns | ❌ Issues | N/A

---

## Detailed Review

### 1. Component Library

**Status:** ⚠️ Concerns — Library is configured but inconsistently adopted

**Findings:**

`components.json` confirms shadcn/ui is set up using `@base-ui/react` as the primitive layer. Six UI wrapper components exist in `apps/web/src/components/ui/`: `button.tsx`, `input.tsx`, `textarea.tsx`, `card.tsx`, `select.tsx`, `label.tsx`. These components are used in `APITester.tsx`, but page and dashboard components overwhelmingly bypass them in favour of raw HTML elements.

Raw `<button>` elements appear across at least a dozen page files:
- `apps/web/src/pages/director/DirectorDashboardPage.tsx` — 6 raw `<button>` elements
- `apps/web/src/pages/admin/GlobalUsersSection.tsx` — raw `<button>` and raw `<select>`
- `apps/web/src/pages/director/ApprovalQueue.tsx:84` — raw `<button className="border-border ...">` with hand-rolled Tailwind styles matching the design system tokens
- `apps/web/src/components/Navbar.tsx` — 12 raw `<button>` and `<input>` elements
- `apps/web/src/components/DecisionForm.tsx` — raw `<button>` and `<textarea>`

The UI component wrappers exist but are only used in the developer utility (`APITester.tsx`). Production pages hand-roll every interactive element.

**Recommendations:**

1. Replace raw `<button>` elements in page files with the `Button` component from `@/components/ui/button` to ensure consistent focus rings, disabled states, and hover behaviour.
2. Use `Input` and `Textarea` from `@/components/ui/` in all forms rather than bare `<input>` and `<textarea>` tags.
3. Replace the raw `<select>` in `GlobalUsersSection.tsx:113` with the `Select` UI component.

---

### 2. Styling

**Status:** ⚠️ Concerns — Tailwind used well overall, but inline styles and arbitrary values recur

**Findings:**

The project uses Tailwind CSS v4 with CSS variable-based design tokens (good). However, several issues appear:

**Repeated inline `style` for font family.** The string `style={{ fontFamily: "Outfit, Inter, sans-serif" }}` appears in at least six component and page files:
- `apps/web/src/components/PortalLayout.tsx:21,47,81`
- `apps/web/src/pages/profile/PasswordCard.tsx:64`
- `apps/web/src/components/AuthCard.tsx:14`
- `apps/web/src/pages/UserProfilePage.tsx:42`
- `apps/web/src/pages/profile/DangerZoneCard.tsx:6`
- `apps/web/src/pages/profile/ProfileInfoCard.tsx:129`

This should be a Tailwind utility class or a CSS variable on `:root` in `globals.css`.

**Justified dynamic inline styles** (acceptable): `GlobalStatsDashboard.tsx:52`, `HorizBar.tsx:15`, and `Timeline.tsx:25` use `style={{ width/height: \`${pct}%\` }}` for data-driven bar widths — correct usage.

**Arbitrary pixel values** are used extensively instead of Tailwind theme tokens:
- `text-[16px]`, `text-[15px]`, `text-[14px]`, `text-[13px]`, `text-[12px]`, `text-[11px]`, `text-[26px]`, `text-[24px]` appear across many files. Tailwind 4 encourages using the design-system scale (`text-sm`, `text-base`, etc.) or extending the theme.

One `!important` in `apps/web/src/index.css:31` overrides animation — acceptable for an animation reset utility.

**Recommendations:**

1. Define a `font-display` Tailwind utility in `globals.css` (e.g., `@utility font-display { font-family: Outfit, Inter, sans-serif; }`) and replace all six inline `style={{ fontFamily }}` occurrences.
2. Map the recurring pixel sizes to Tailwind theme tokens in the Tailwind v4 config rather than using arbitrary `[14px]` values — this makes type scale changes a one-line update.
3. Audit remaining `style={}` attributes; only data-driven dynamic values (percentages, pixels computed at runtime) are justified.

---

### 3. Loading Data

**Status:** ⚠️ Concerns — TanStack Query present but inconsistently adopted

**Findings:**

TanStack Query v5 is installed and correctly wired in `apps/web/src/frontend.tsx` via `QueryClientProvider`. It is used properly in:
- `apps/web/src/hooks/useNewspaper.ts` — `queryKey: ["newspaper", newspaperName]`
- `apps/web/src/hooks/useCategory.ts` — `queryKey: ["category", newspaperId, categorySlug]`
- `apps/web/src/components/Navbar.tsx:62` — `queryKey: ["categories", newspaper?.id]`
- `apps/web/src/pages/dashboard/EditorialQueueSection.tsx` — `useQuery` + `useMutation` with proper cache invalidation

However, several pages bypass TanStack Query entirely and call `fetch` directly inside `useEffect`:

- `apps/web/src/pages/ArticleEditorPage.tsx:241,248,260` — three raw `fetch` calls in `useEffect` hooks
- `apps/web/src/pages/director/ApprovalQueue.tsx:20–34` — fetch inside a `useCallback` + `useEffect`
- `apps/web/src/pages/director/PublicationQueue.tsx:18,38` — two direct fetch calls
- `apps/web/src/pages/AuthorPage.tsx:48–52` — direct fetch + `.then()` chaining
- `apps/web/src/pages/UserProfilePage.tsx:27–31` — direct fetch + `.then()` chaining
- `apps/web/src/components/StatisticsSection.tsx:37–41` — direct fetch + `.then()` chaining

These components miss out on caching, background refetch, loading/error state management, and deduplication that TanStack Query provides.

**Recommendations:**

1. Migrate `director/ApprovalQueue.tsx` and `director/PublicationQueue.tsx` to `useQuery` — these are read-heavy components where cache and background refresh would be immediately beneficial.
2. Move the three `useEffect` fetch calls in `ArticleEditorPage.tsx` to `useQuery` hooks with appropriate keys like `["categories", newspaperId]` and `["article", articleId]`.
3. Move the article data fetch in `AuthorPage.tsx` and `UserProfilePage.tsx` to `useQuery` hooks.

---

### 4. Environment Variables

**Status:** ✅ Good

**Findings:**

`.gitignore` explicitly lists `.env`, `.env.development.local`, `.env.test.local`, `.env.production.local`, and `.env.local`. An `.env.example` is committed at the repo root with placeholder values for all required variables (database, JWT secret, SMTP, Redis, MinIO, test credentials).

The only hardcoded URL in source is in a seed script — `apps/server/src/db/seeds/seedE2eUsers.ts:61` sets `profilePictureUrl: "http://localhost:9000/pb138-images/profiles/e2e-placeholder.webp"` — acceptable in a seed file. External image URLs in `seedArticles.ts` point to `loremflickr.com` for test data, also acceptable.

All production configuration is accessed via `process.env.*`. The server validates critical environment variables at startup (`DATABASE_URL`, `JWT_SECRET`) and exits with a structured log message if missing.

**Recommendations:**

1. The `tests/.env.example` duplicates some keys from the root `.env.example` with different placeholder names — consolidate into one `.env.example` at the repo root with a `TEST_*` section to reduce confusion.

---

### 5. REST API Design

**Status:** ✅ Good

**Findings:**

Routes in `apps/server/src/routes/` follow REST conventions correctly:

- Resource-oriented plural URLs: `/api/newspapers`, `/api/newspapers/:id/articles`, `/api/newspapers/:id/categories`
- Correct HTTP verbs: GET for reads, POST for create, PATCH for partial update, DELETE for delete
- Status codes: 201 on article/image creation (`set.status = 201`), 204 on delete (`set.status = 204`), 401/403 in middleware, typed HttpError hierarchy (400, 401, 403, 404, 409, 422)
- Input validation via TypeBox (`t.Object`, `t.String`, `t.Optional`) on all route bodies and query params — e.g., `createArticleBody`, `updateArticleBody`, `assignEditorBody`

Action sub-resources (`/submit`, `/review`, `/approve`, `/publish`, `/schedule`, `/assign-editor`) are POST endpoints representing workflow state transitions. This is an accepted pattern for state machines where PATCH would not be semantically clear.

PATCH is correctly used for partial updates: `/api/newspapers/:id` and `/api/newspapers/:id/articles/:id/subscriber-only` accept partial bodies.

No verb-in-path anti-patterns found. Query parameters are used for filtering, sorting, and pagination only.

One schema note: `apps/server/src/db/schema.ts:49` — `global_roles` has `unique("global_roles_role_unique").on(table.role)`, which means only one user can hold each global role (e.g., only one SYSTEM_ADMINISTRATOR). This is likely intentional given the domain model, but is a hard constraint worth documenting.

**Recommendations:**

1. Document the `unique` constraint on `global_roles.role` in a code comment or README — it is non-obvious that the system enforces singleton global roles and could surprise future maintainers.
2. Consider returning 201 for the `/submit` and `/review` endpoints if they create new review records — currently they return 200, which is also acceptable since they primarily update article state.

---

### 6. Database

**Status:** ✅ Good

**Findings:**

The schema in `apps/server/src/db/schema.ts` is well-structured:
- All tables use UUID primary keys consistently
- Foreign keys declared on all relationships
- No `bytea`/`blob` columns — images stored as `text` URLs pointing to MinIO (correct)
- Unique constraints where needed: `email_newspaper_idx`, `newspaper_slug_idx`, `article_category_slug_newspaper_unique`
- Correct use of `ON DELETE CASCADE` and `ON DELETE SET NULL` depending on relationship semantics

Six SQL migration files exist (`0001` through `0006`) in `apps/server/drizzle/`, covering schema evolution, RLS enablement, and policy additions. Migrations are versioned with a `meta/_journal.json` and follow the Drizzle convention for both auto-generated and hand-written migrations (RLS, role grant files).

RLS policies live in `apps/server/drizzle/0002_enable_rls.sql` and `0006_add_subscriptions_rls.sql`, enforcing multi-tenant isolation at the database level via `app.user_id`, `app.newspaper_id`, and `app.roles` session GUCs set by `apps/server/src/db/rls.ts`.

All queries use Drizzle ORM. No raw SQL string interpolation found in service code.

**Recommendations:**

1. The `articles` table has no index on `(newspaper_id, state)` — the most common query pattern (listing articles for a newspaper filtered by state) will do a full scan as data grows. Add a composite index.
2. `articleViews` will grow large quickly; consider a partial index on `(article_id)` or periodic archival strategy.

---

### 7. Backend Design Patterns

**Status:** ✅ Good

**Findings:**

The backend follows a clear three-layer pattern:

- **Routes** (`apps/server/src/routes/*.ts`): thin HTTP adapters. Each handler extracts params/body, calls a service function via `withDb`, and sets the status code. No business logic or DB access found in route files.
- **Services** (`apps/server/src/services/*.ts`): all business logic, access control checks, error throwing, and DB queries. Services accept a `Tx` (RLS-wrapped transaction client) from the route context.
- **Middleware** (`apps/server/src/middleware/auth.ts`): JWT verification, user/roles derivation, RLS context binding.
- **Utils** (`apps/server/src/utils/`): logger, audit, storage, Redis helpers — pure utilities with no route coupling.

The `withDb` / `withRls` pattern elegantly ensures every service call runs inside an RLS context. The `errors/index.ts` hierarchy (`BadRequestError`, `ForbiddenError`, etc.) produces consistent HTTP responses via the global `onError` handler.

`articles.ts` at 1057 lines is the largest service, but the size is warranted — it handles a complex multi-step state machine (DRAFT → SUBMITTED → IN_REVIEW → APPROVED → PUBLISHED) with role checks at each transition.

**Recommendations:**

1. `admin.ts` at 824 lines may benefit from splitting into `admin/roles.ts`, `admin/users.ts`, and `admin/config.ts` sub-services for readability.
2. Consider extracting the article state-machine transition rules into a dedicated `articleStateMachine.ts` utility to make allowed transitions explicit and testable in isolation.

---

### 8. Auth

**Status:** ✅ Good

**Findings:**

Authentication uses `@elysiajs/jwt` (not raw `jsonwebtoken`) and `Bun.password` (argon2) for hashing — no hand-rolled crypto found. The JWT contains a `jti` claim checked against a Redis blocklist on every request, enabling proper server-side logout (`apps/server/src/middleware/auth.ts:25`).

The `authMiddleware` derives `{ user, roles, withDb }` and injects them into every route handler. `requireAuth` and `requireRole(role)` middlewares reject unauthorised/unpermitted requests with 401/403 before the handler runs.

Authorization is enforced at two levels:
1. **Middleware**: `requireRole` checks the roles array before the handler executes.
2. **RLS policies**: PostgreSQL enforces row-level visibility and write permissions via session GUCs set per transaction.

Service-level checks additionally verify ownership (e.g., `apps/server/src/services/likes.ts:21` cross-newspaper forbidden check, article state-machine checks that the requesting user is the assigned editor/manager).

Password reset and email verification use short-lived JWT tokens.

**Recommendations:**

1. Document the token lifetime and blocklist TTL relationship (`JWT_EXPIRATION.session = "2h"` in `utils/jwt.ts`) to ensure Redis blocklist entries outlive the tokens they protect.
2. Ensure email verification token expiry is shorter than the session token expiry so old verification links cannot be replayed.

---

### 9. Testing

**Status:** ✅ Good

**Findings:**

The project has a two-tier test strategy:

**Unit/integration tests** (13 files, `bun test`):
- `apps/server/tests/rls/policies.test.ts`: comprehensive RLS visibility tests for all role combinations (visitor, author, editor, manager, admin, cross-newspaper). Uses a real DB connection with test fixtures — not mocked.
- `apps/server/tests/schemas/`: validates TypeBox schemas for all major request bodies (auth, articles, categories, comments, users, admin, subscriptions).
- `apps/server/tests/utils/`: covers audit logging, email, logger, and storage utilities.

**End-to-end tests** (16 Playwright spec files):
- Full workflow coverage: article approval workflow, rejection workflow, subscription workflow
- Role-specific flows: visitor (homepage, registration, search), author (create, edit, dashboard), registered user (article view, comments, likes, profile)
- Admin flows: role management

No skipped or todo-marked tests found. `bun test` is configured in `apps/server/package.json` with `--env-file`.

**Recommendations:**

1. The service layer (`apps/server/src/services/*.ts`) is not directly unit-tested — only RLS policies and schema validators are. Adding targeted service tests for the article state-machine transitions (e.g., "author cannot approve their own article") would catch regressions that RLS tests do not cover.
2. The e2e specs for article workflows share significant setup — consider a shared Playwright fixture to reduce duplication.

---

### 10. Logging & Monitoring

**Status:** ✅ Good

**Findings:**

A custom structured logger is implemented at `apps/server/src/utils/logger.ts`. It:
- Emits NDJSON (`JSON.stringify({ level, timestamp, message, ...meta })`) — machine-parseable
- Is level-filtered via `LOG_LEVEL` env var (defaults to `debug` in dev, `info` in production)
- Writes errors/warnings to stderr, info/debug to stdout
- Optionally mirrors all output to a file via `LOG_FILE` env var

The server uses `logger.info/error/warn/debug` throughout services. The global `onError` handler logs unhandled errors with method, URL, status, and stack trace.

The logger is covered by `apps/server/tests/utils/logger.test.ts`.

48 `console.log` calls exist in non-test source, but the majority are in seed scripts and the build script where CLI output is appropriate. Only `apps/web/src/index.ts:42` uses `console.log` in a runtime server path.

No sensitive data (passwords, tokens, secrets) found in log calls.

**Recommendations:**

1. Replace `apps/web/src/index.ts:42` `console.log` with the structured logger if the web server ever needs production log aggregation.
2. Consider adding Elysia request/response logging hooks to capture HTTP method, path, status, and duration for each request.

---

### 11. Error Handling

**Status:** ⚠️ Concerns — Backend is solid; frontend has gaps in some pages

**Findings:**

**Backend** is well-handled:
- `apps/server/src/errors/index.ts` defines `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `UnprocessableError` — each maps to the correct HTTP status.
- The global `onError` handler in `apps/server/src/server.ts:93–115` catches all unhandled errors, logs them with context, and returns a 500 with a safe message.

**Frontend** has some weak spots:

1. `apps/web/src/pages/director/ApprovalQueue.tsx:29` — the `load()` function has an empty catch block: `catch { /* empty */ }`. If the fetch fails, the loading spinner resolves with an empty list and no user feedback.
2. `apps/web/src/pages/director/PublicationQueue.tsx` — similar missing error state.
3. No global React `ErrorBoundary` wrapping the app (only the Lexical editor has its own error boundary). An unhandled render error will crash the entire UI.
4. Several components use `alert()` for mutation errors (`EditorialQueueSection.tsx:73,80,106`) — not ideal UX but at least errors are not silently swallowed.

**Recommendations:**

1. Replace the empty catch in `ApprovalQueue.tsx:29` with a visible error state rendered to the user.
2. Add a root-level `ErrorBoundary` component in `apps/web/src/frontend.tsx` wrapping the router to prevent full-page crashes on unexpected render errors.
3. Replace `alert()` calls in `EditorialQueueSection.tsx` with inline error messages or toast notifications.

---

### 12. Security

**Status:** ✅ Good

**Findings:**

- **CORS**: explicitly configured in `apps/server/src/server.ts:36–41` using `process.env.FRONTEND_URL` as the allowed origin. No wildcard `*` found.
- **Secrets in source**: none found. No API keys, tokens, or passwords hardcoded.
- **SQL injection**: all queries use Drizzle ORM's parameterised query builder. No raw SQL string interpolation found outside migration files.
- **`.gitignore`**: covers `.env` and all variant files.
- **Multi-tenant isolation**: PostgreSQL RLS policies enforce that users can only read/write data within their newspaper context.
- **Token revocation**: logout blocklists the JWT `jti` in Redis, preventing replay of revoked tokens.
- **Password hashing**: `Bun.password` (argon2) — appropriate modern algorithm.

**Recommendations:**

1. Verify that the `@elysiajs/openapi` plugin's schema endpoint (`/api/openapi`) is disabled or protected in production builds so internal API structure is not publicly browsable.
2. Consider adding rate limiting on auth endpoints (`/register`, `/login`, `/forgot-password`) to mitigate brute-force attacks.

---

### 13. Forms

**Status:** ❌ Issues — No form library; all forms are hand-rolled with useState

**Findings:**

No form library (`react-hook-form`, `@tanstack/react-form`, `formik`) is present in `apps/web/package.json`. Zod is present as a root workspace override but is only used server-side; the frontend does not use Zod for form validation.

The **form-as-useState** anti-pattern is pervasive:

- `apps/web/src/pages/SignUpPage.tsx:13–20` — five field states (`fullName`, `username`, `email`, `password`, `confirmPassword`) plus `error`, `fieldErrors`, `loading`, `success`, with a manual `handleSubmit` function performing ad-hoc validation by parsing HTTP status codes.
- `apps/web/src/pages/ArticleEditorPage.tsx:216–234` — five form-field states (`title`, `perex`, `content`, `categoryId`, `keywords`) plus separate loading, error, and status states, with five direct `fetch` calls for different save operations.
- `apps/web/src/pages/profile/ProfileInfoCard.tsx` — 12 `useState` calls for a profile edit form.
- `apps/web/src/pages/profile/PasswordCard.tsx` — 7 `useState` calls for a two-field password change form.
- `apps/web/src/pages/dashboard/CategoriesSection.tsx` — 8 `useState` calls.

None of these forms use schema validation — validation logic is absent or embedded in the submit handler as manual if-checks.

**Recommendations:**

1. Install `react-hook-form` and `@hookform/resolvers` in `apps/web`. Add `zod` as a direct frontend dependency. Replace the `SignUpPage` form with a `useForm` + `z.object` schema — this alone eliminates 8 `useState` calls and provides declarative field-level error messages.
2. Migrate the article editor form fields in `ArticleEditorPage.tsx` to a `useForm` instance to centralise field state and add validation.
3. Define Zod schemas for each form (registration, login, password change, article create/edit) and consider sharing validation logic with the backend via `packages/shared`.
4. Replace the `PasswordCard` (7 `useState` calls for two fields) with a form library instance as a minimal starting example.

---

### 14. Frontend Structure

**Status:** ⚠️ Concerns — Two god components; limited custom hook extraction

**Findings:**

The majority of page files are reasonably sized (under 280 lines). However, two files exceed the concern threshold:

**`apps/web/src/pages/ArticleEditorPage.tsx` — 561 lines, 18 `useState` calls, 5 direct `fetch` calls inside `useEffect`.**
This is a god component combining: category fetching, author profile fetching, article loading (edit mode), article save, article submit, article delete, image upload, and image delete — all in a single component body alongside dense rendering JSX.

**`apps/web/src/pages/ArticlePage.tsx` — 441 lines, 10 `useState` calls.**
This page handles article rendering, comment submission, likes, read-completion tracking, and subscriber-only gating. It is large but partially justified by the density of declarative Lexical editor markup.

**Custom hooks:** Only four exist (`useNewspaper`, `useCategory`, `useTheme`, `useArticleViewTracker`). Given the volume of repeated data-fetching logic across pages, more hooks are warranted.

**Pages that bypass TanStack Query** (fetching with raw `useEffect` + `fetch`):
- `apps/web/src/pages/director/ApprovalQueue.tsx`
- `apps/web/src/pages/director/PublicationQueue.tsx`
- `apps/web/src/pages/ArticleEditorPage.tsx`
- `apps/web/src/pages/AuthorPage.tsx`

**Recommendations:**

1. Extract `ArticleEditorPage.tsx` into at least three units: a `useArticleEditor` hook (state + fetch logic), an `ArticleForm` component (fields + submit), and an `ArticleImageManager` component (image upload/delete).
2. Create `useArticle(articleId)` and `useCategories(newspaperId)` hooks backed by `useQuery` to replace the `useEffect`/fetch pairs in `ArticleEditorPage.tsx`.
3. Create `useApprovalQueue(newspaperId)` and `usePublicationQueue(newspaperId)` hooks using `useQuery` to replace the `useCallback`/`useEffect`/fetch pattern in the director pages.
4. Extract the comments section of `ArticlePage.tsx` into a `<CommentsSection articleId={...} />` component to bring the main file under 300 lines.
