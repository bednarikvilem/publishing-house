# Project Review: pb138 — Newspaper Platform

**Date:** 2026-06-07

---

## Project Orientation

The project is a monorepo (Turborepo + Bun workspaces) containing an Elysia/Drizzle backend (`apps/server`) and a React 19 / React Router / Tailwind frontend (`apps/web`), backed by PostgreSQL 17, Redis, and MinIO for object storage. Authentication is custom JWT via `@elysiajs/jwt` + `Bun.password` (argon2). The backend follows a `routes → services → db` layering pattern with a `withRls` middleware that sets PostgreSQL session variables to enforce Row-Level Security policies. The frontend uses a custom shadcn-style component library built on `@base-ui/react`. Testing uses `bun:test` for unit/integration tests and Playwright for E2E. Full Dockerised dev setup with a `.env.example` is provided.

---

## Review Summary

| Category              | Status |
| --------------------- | ------ |
| Component Library     | ⚠️ Concerns |
| Styling               | ⚠️ Concerns |
| Loading Data          | ❌ Issues |
| Environment Variables | ✅ Good |
| REST API Design       | ✅ Good |
| Database              | ✅ Good |
| BE Design Patterns    | ✅ Good |
| Auth                  | ✅ Good |
| Testing               | ✅ Good |
| Logging & Monitoring  | ✅ Good |
| Error Handling        | ✅ Good |
| Security              | ✅ Good |
| Forms                 | ❌ Issues |
| Frontend Structure    | ⚠️ Concerns |

Status legend: ✅ Good | ⚠️ Concerns | ❌ Issues | N/A

---

## Detailed Review

### 1. Component Library

**Status:** ⚠️ Concerns — library present and largely used, but bypassed in key places

The project uses `@base-ui/react` wrapped with custom shadcn-style components in `apps/web/src/components/ui/`. The wrappers for `Button`, `Input`, `Select`, `Textarea`, `Dialog`, and `Toast` correctly delegate to the library primitives (`apps/web/src/components/ui/button.tsx:1`, `apps/web/src/components/ui/input.tsx:2`, etc.). This is a solid pattern.

However, there are direct raw HTML bypasses:

- `apps/web/src/pages/ArticleEditorPage.tsx:171` — a raw `<input type="file" ... />` is used directly instead of the wrapped `<Input>` component.
- `apps/web/src/pages/profile/ProfileInfoCard.tsx:158` — another raw `<input type="file" />`.
- `apps/web/src/components/RichTextEditor.tsx:204` — raw `<input type="file" />` inside the editor for inline image upload.

**Recommendations:**

1. For the three raw `<input type="file" />` occurrences, either extend the `<Input>` wrapper to support `type="file"` and apply consistent styling, or extract a dedicated `<FileInput>` component in `components/ui/` that is used wherever file upload is needed.
2. Add an ESLint rule to flag raw `<button>` and `<input>` elements in page/component files to prevent future bypasses.

---

### 2. Styling

**Status:** ⚠️ Concerns — Tailwind used correctly overall, with a few minor issues

The project uses Tailwind v4 consistently across all components and pages. The single `!important` in `apps/web/src/index.css:35` (`animation: none !important`) is correctly commented as intentional for the Motion API, so it is not a concern.

Inline `style={{}}` attributes appear only in stats/chart components:
- `apps/web/src/components/stats/HorizBar.tsx:15` — `style={{ width: \`${pct}%\` }}`
- `apps/web/src/components/stats/Timeline.tsx:25` — `style={{ height: ... }}`
- `apps/web/src/pages/ArticlePage.tsx:358` — `style={{ height: 1 }}` for an IntersectionObserver sentinel

These are legitimate: dynamic percentage widths cannot be expressed with static Tailwind classes.

The real concern is hardcoded hex colours leaking into a page file:
- `apps/web/src/pages/ArticleEditorPage.tsx:492` — `border-[#dc2626]/20 bg-[#dc262608]`
- `apps/web/src/pages/ArticleEditorPage.tsx:566` — same values repeated

`#dc2626` is Tailwind's `red-600`, which maps to the `destructive` design token already configured in the theme. This bypasses the design system unnecessarily.

**Recommendations:**

1. Replace `border-[#dc2626]/20` and `bg-[#dc262608]` in `ArticleEditorPage.tsx:492` and `:566` with `border-destructive/20` and `bg-destructive/5` (or the nearest configured token).
2. Establish a team convention: arbitrary hex values `[#...]` in Tailwind classes are a code smell; all colours must map to a CSS variable/token defined in `globals.css`.

---

### 3. Loading Data

**Status:** ❌ Issues — TanStack Query is installed but bypassed by raw `fetch()` in the majority of components

TanStack Query is correctly set up: `queryClient` is created in `apps/web/src/lib/queryClient.ts`, `<QueryClientProvider>` wraps the app in `apps/web/src/frontend.tsx`, and query keys are well-formed arrays where used. It is used properly in:
- `apps/web/src/hooks/useNewspaper.ts` and `useCategory.ts`
- `apps/web/src/components/Navbar.tsx:64` — categories
- `apps/web/src/pages/dashboard/EditorialQueueSection.tsx` — `useQuery` + `useMutation` correctly

But the overwhelming majority of data loading is raw `fetch()` inside `useEffect` hooks with manual `useState` for data, loading, and error:

- `apps/web/src/pages/ArticleEditorPage.tsx:252–276` — three separate `fetch` calls in `useEffect`
- `apps/web/src/pages/NewspaperHomepage.tsx:18`
- `apps/web/src/pages/CategoryPage.tsx:44`
- `apps/web/src/pages/AuthorPage.tsx:48`
- `apps/web/src/pages/AdminDashboardPage.tsx:18,29` — two raw fetches
- `apps/web/src/components/Sidebar.tsx:243`
- `apps/web/src/components/Navbar.tsx:85` — raw fetch for user data in the same file that already uses `useQuery` for categories
- `apps/web/src/pages/UserProfilePage.tsx:26`
- `apps/web/src/pages/DirectorDashboardPage.tsx:25,36`

This means automatic background refetch, deduplication, cache invalidation, and retry logic are absent for most of the app.

**Recommendations:**

1. Migrate all raw `fetch` + `useEffect` + `useState` data-loading patterns to `useQuery`. Each recurring fetch pattern (user profile, articles list, newspaper, author) should become a named custom hook in `apps/web/src/hooks/`.
2. Migrate mutation-like fetches (comment submit, like toggle, etc.) to `useMutation`, which provides `isPending`, `onSuccess`/`onError` callbacks and automatic cache invalidation.
3. Resolve the inconsistency in `Navbar.tsx`: the user fetch should be migrated to `useQuery` with key `["me"]` to match the pattern already used for categories in the same file.

---

### 4. Environment Variables

**Status:** ✅ Good

`.env` is listed in `.gitignore` and a fully populated `.env.example` is committed at the root. All server environment variables are read via `process.env.*`. `DATABASE_URL` and `JWT_SECRET` are validated on startup with a `process.exit(1)` if missing (`apps/server/src/server.ts:22–32`). `FRONTEND_URL` drives CORS configuration rather than a hardcoded string.

Minor issues:
- `apps/server/src/db/seeds/seedE2eUsers.ts:61` contains a hardcoded `http://localhost:9000/pb138-images/...` URL. This is a dev seed file so the risk is low, but it could fail in CI with a different MinIO address.
- The `.env.example` file has duplicate entries for `TEST_BASE_URL`, `TEST_NEWSPAPER`, `TEST_EMAIL`, and `TEST_PASSWORD`.

**Recommendations:**

1. Replace the hardcoded MinIO URL in `seedE2eUsers.ts:61` with `` `${process.env.PUBLIC_IMAGES_BASE_URL ?? "http://localhost:9000"}/...` ``.
2. Deduplicate the repeated test variable entries in `.env.example`.

---

### 5. REST API Design

**Status:** ✅ Good

Routes are resource-oriented with plural nouns and no verbs in paths. The article state-machine operations (`/submit`, `/review`, `/approve`, `/publish`, `/schedule`, `/assign-editor`) are implemented as POST to sub-resources, which is an accepted pattern for actions that are not simple CRUD.

Status codes are correct: 201 for creates (`apps/server/src/routes/articles.ts:74,118`, `auth.ts:21`, `likes.ts:16`), 204 for deletes (`articles.ts:97,131`), 401/403/404/409 from the typed `HttpError` hierarchy. All route handlers validate input via TypeBox/Elysia schemas (parameters, query, body), which also drives OpenAPI documentation via `@elysiajs/openapi`.

PUT `/me` (`apps/server/src/routes/users.ts:14`) accepts a full user body — correct PUT semantics. PATCH is used for partial updates (article content, newspaper branding, subscriber-only flag). The distinction is maintained correctly. No verb-in-path anti-patterns found.

**Recommendations:**

1. Consider merging the `/search` endpoint into `/articles` with a `?q=` query parameter (adding it to `articlesListQuery`) to reduce the number of distinct routes and align with standard REST collection filtering.
2. The `/api` diagnostic endpoint (`apps/server/src/server.ts:77`) does a live DB query on every request. Consider removing the DB query and returning only static metadata, or protecting it behind auth so it is not exploitable as a DB health oracle by unauthenticated callers.

---

### 6. Database

**Status:** ✅ Good

The schema (`apps/server/src/db/schema.ts`) is well-designed: proper foreign keys with cascade deletes, UUID primary keys throughout, composite primary keys where appropriate (`user_roles`, `likes`, `global_roles`), and unique constraints enforced at the DB level. Images are stored as URLs pointing to MinIO, not as blobs in the database. The `blob` references in service code refer to uploaded file handling in memory before forwarding to MinIO, not to DB columns.

Migration management is healthy: 7 versioned SQL migration files in `apps/server/drizzle/` plus one TypeScript migration. The `drizzle/meta/_journal.json` tracks applied migrations. There is a clear distinction between Drizzle-generated migrations and hand-written migrations for RLS policies and role grants.

The search implementation in `apps/server/src/services/articles.ts:56–95` loads all published articles into memory and filters them client-side, which will degrade at scale.

**Recommendations:**

1. Replace the in-memory search in `searchArticles` with a database-level query using Drizzle's `ilike` conditions, or a PostgreSQL full-text search index on `articles.title`, `articles.perex`, and `articles.content`.
2. The `any` type casts throughout `articles.ts` (e.g., `(a: any)` in `articleSummary`) should be replaced with proper types derived from Drizzle's `InferSelectModel` joined with relations.

---

### 7. Backend Design Patterns

**Status:** ✅ Good

The backend follows a clean three-layer architecture: `src/routes/` contains only HTTP wiring (no business logic), `src/services/` contains all business logic, and `src/db/` handles schema and data access via Drizzle ORM. Route handlers delegate immediately to service functions:

```ts
// apps/server/src/routes/articles.ts:16
.get(
    "/api/newspapers/:newspaper_id/articles/search",
    ({ params, query, withDb }) =>
        withDb((tx) => articleService.searchArticles(tx, params.newspaper_id, query)),
```

There are no direct DB calls in route handlers — all access goes through `withDb(tx => ...)`, which wraps Drizzle in the per-request RLS context. Services receive a transaction handle `tx` and never import `db` directly.

`apps/server/src/services/articles.ts` at 1057 lines is large. It handles a complex multi-state workflow (draft → submitted → reviewed → approved → scheduled → published), but several concerns could be separated.

**Recommendations:**

1. Split `articles.ts` service into `articleCrud.ts` (CRUD), `articleWorkflow.ts` (state transitions), and `articleImages.ts` (image upload/delete). This would bring each module under 300 lines and improve navigability.
2. Define a typed `ArticleWithRelations` type from Drizzle's relational query return to eliminate the `any` casts scattered through the service.

---

### 8. Auth

**Status:** ✅ Good

Authentication uses `@elysiajs/jwt` (HMAC-based JWT) and `Bun.password` (argon2 via Bun's built-in). There is no hand-rolled `bcrypt.hash`/`bcrypt.compare` or `jsonwebtoken`. JWT tokens expire after 2 hours (`apps/server/src/utils/jwt.ts:2`). Logout is properly implemented via a Redis blocklist (checked in `apps/server/src/middleware/auth.ts:24`), preventing reuse of revoked tokens.

Authorization is enforced at three levels:
- **Middleware**: `requireAuth` (401) and `requireRole(role)` (403) in `apps/server/src/middleware/auth.ts:69–86`
- **Service layer**: services check `user.id === article.authorId` and role membership before mutating data
- **Database (RLS)**: PostgreSQL Row-Level Security policies in `apps/server/drizzle/0002_enable_rls.sql` enforce access at query time

Email verification is required before login. Password reset uses short-lived tokens. RLS policies are verified by dedicated tests in `apps/server/tests/rls/policies.test.ts`.

**Recommendations:**

1. Document in the README that JWT tokens are stored client-side as Bearer tokens (not `httpOnly` cookies). If the threat model changes, describe the tradeoffs of moving to cookies.
2. Add a comment to `.env.example` next to `JWT_SECRET=newspaper` explicitly stating it must be replaced with a long random value before production deployment.

---

### 9. Testing

**Status:** ✅ Good

29 test files across two layers with zero skipped or TODO tests:

**Backend (bun:test, 13 files):**
- Schema validation tests for every input schema (`tests/schemas/auth.test.ts`, `articles.test.ts`, `categories.test.ts`, etc.)
- RLS policy tests (`tests/rls/policies.test.ts`) that exercise all role combinations against a real database
- Utility tests for logger, email, storage, and audit modules
- Seed verification tests (`tests/seeds/e2e-users.test.ts`)

**Playwright E2E (16 spec files):**
- Full workflow coverage: article creation → submission → assignment → review → approval → publication
- All user roles: visitor, registered user, author, editor, manager, director, system administrator
- Auth flows: registration, login, password reset
- Feature flows: comments, likes, subscriptions, search, admin role management

The RLS tests are particularly strong — they verify database-level security policy, which is unusual and demonstrates depth.

**Recommendations:**

1. Add unit tests for the service layer (`services/articles.ts`, `services/auth.ts`). Currently only schema validation and RLS are tested at the unit level; the business logic state machine (article approval flow) has no direct test coverage outside E2E.
2. Add `bun test --coverage` to the CI pipeline to track coverage trends over time.

---

### 10. Logging & Monitoring

**Status:** ✅ Good

A custom structured JSON logger is implemented in `apps/server/src/utils/logger.ts` with:
- Configurable minimum level via `LOG_LEVEL` env var (defaults to `info` in production, `debug` elsewhere)
- Optional file mirroring via `LOG_FILE`
- NDJSON output with `level`, `timestamp`, `message`, and arbitrary metadata
- Correct stream routing: `error`/`warn` → `stderr`, `info`/`debug` → `stdout`

The logger is used in 109 places across the server source, covering startup, route errors, service operations, and DB failures. The startup log at `apps/server/src/server.ts:123` correctly redacts the database password from the URL string. No sensitive data appears in logged output.

Of the 48 `console.log` calls counted project-wide, 43 are in seed scripts and the build script (expected). In production server/frontend code only `apps/web/src/index.ts:42` (dev server startup) and a migration script remain.

The logger has comprehensive test coverage in `apps/server/tests/utils/logger.test.ts`.

**Recommendations:**

1. Add a request-scoped log entry (method, path, status, duration) via an Elysia `onAfterHandle` hook so every API request is traceable without manual log calls per service.
2. Replace the two `console.log` / `console.error` calls in `apps/server/scripts/subscription-renewal.ts:9,11` with `logger.info`/`logger.error` for consistency.

---

### 11. Error Handling

**Status:** ✅ Good

The backend has a typed error hierarchy in `apps/server/src/errors/index.ts`: `BadRequestError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ConflictError` (409), `UnprocessableError` (422). Services throw these typed errors; the global `onError` handler in `apps/server/src/server.ts:94` maps them to correct HTTP responses with machine-readable `error` codes. A catch-all returns 500 with structured logging.

On the frontend, TanStack Query mutations in `EditorialQueueSection.tsx` use `onError` to show toast notifications. Most catch blocks in page components surface errors to users. Lexical editor errors are caught by `LexicalErrorBoundary` in both `RichTextEditor.tsx` and `ArticlePage.tsx`.

One silent swallow:
- `apps/web/src/pages/director/ApprovalQueue.tsx:33–35` — the initial data-fetch catch block is `/* empty */`, so if the approval queue fails to load, the component renders nothing with no user-visible feedback.

**Recommendations:**

1. Replace the empty catch in `ApprovalQueue.tsx:33–35` with a visible error state: set an error flag in the catch and render an error message or toast.
2. Several pages using raw `fetch` + `useEffect` have no error handling at all on fetch failure (e.g., `NewspaperHomepage.tsx`, `CategoryPage.tsx`). These should show a visible error state on failure.

---

### 12. Security

**Status:** ✅ Good

CORS is explicitly configured in `apps/server/src/server.ts:36–41` to the `FRONTEND_URL` environment variable with no wildcard origin, explicit allowed methods and headers, and credentials enabled.

No hardcoded API keys, passwords, or tokens were found in source. All database queries go through Drizzle ORM with parameterized queries — no raw SQL string interpolation exists outside migration scripts. The one raw SQL usage (`apps/server/src/db/rls.ts:17–19`) uses Drizzle's `sql` tagged template, which parameterizes correctly. `.gitignore` covers `.env` and all common variants.

Image uploads validate content type and file size before processing. The RLS policies provide database-level defense-in-depth even if service-layer auth were bypassed.

**Recommendations:**

1. Add a comment to `.env.example` next to `JWT_SECRET=newspaper` stating it must be replaced with a long random value for production.
2. Consider adding a `Content-Security-Policy` header to frontend server responses to protect against XSS in Lexical editor content rendering.

---

### 13. Forms

**Status:** ❌ Issues — no form library; form-as-useState anti-pattern is pervasive

No form library (`react-hook-form`, `@tanstack/react-form`, `formik`) is present in `apps/web/package.json`. Zod is a workspace-level dependency but is only used server-side — it is not wired to any frontend form.

Every form in the application uses a manual `useState`-per-field + `handleSubmit` + `fetch` pattern:

| File | useState count | Notes |
|---|---|---|
| `apps/web/src/pages/ArticleEditorPage.tsx` | 18 | title, perex, keywords, category, images, status, multiple loading flags |
| `apps/web/src/pages/profile/ProfileInfoCard.tsx` | 12 | fullname, username, bio, picture, edit mode, etc. |
| `apps/web/src/pages/SignUpPage.tsx` | 10 | email, password, fullname, username, newspaper, loading, per-field errors |
| `apps/web/src/pages/dashboard/CategoriesSection.tsx` | 8 | name, slug, editing, selected item |
| `apps/web/src/pages/profile/PasswordCard.tsx` | 7 | currentPassword, newPassword, confirm, saving, error |

Validation is imperative `if` checks (e.g., `SignUpPage.tsx:44–55` checks field lengths and characters manually). Error messages are stored in per-field `useState` variables. This is the "form-as-useState" anti-pattern throughout the entire frontend.

**Recommendations:**

1. Adopt `react-hook-form` with `@hookform/resolvers` and `zod` for all forms. Zod schemas can serve as the source of truth for both frontend validation and server input schemas.
2. Start migration with the simplest forms: `PasswordCard.tsx` and `LoginPage.tsx`, then `SignUpPage.tsx`. `ArticleEditorPage.tsx` is the most complex and should come last (alongside the god-component decomposition).
3. Consolidate field-level error display into a reusable `<FieldError>` component to ensure consistent styling and reduce repetition.

---

### 14. Frontend Structure

**Status:** ⚠️ Concerns — two god components; limited custom hook extraction

The project uses React Router v7 (not TanStack Router), so there is no route `loader` convention. Data fetching inside component bodies via `useEffect` is the only available approach — this is not a violation, but fetches are inherently waterfall by default (trigger after render).

**God components:**

`apps/web/src/pages/ArticleEditorPage.tsx` at 573 lines is the most problematic file. It mixes:
- Multiple `fetch` calls in `useEffect` for article, categories, and user data
- 18 `useState` calls managing form state, loading flags, upload state, and status transitions
- Complex event handlers for save, submit, delete, image upload/reorder/caption editing
- Rendering a full editor UI with a metadata sidebar

`apps/web/src/pages/ArticlePage.tsx` at 438 lines similarly handles article display, Lexical editor rendering, comment list, like toggle, subscription state, and view tracking.

**What is done well:** The dashboard is properly decomposed — `DashboardPage.tsx` delegates to `EditorialQueueSection.tsx`, `ReviewQueueSection.tsx`, `CategoriesSection.tsx`, and `MyArticlesSection.tsx`, each self-contained with its own queries and state. This pattern should be replicated for the article editor and article view pages.

**Custom hooks:** Only 4 custom hooks exist (`useNewspaper`, `useCategory`, `useArticleViewTracker`, `useTheme`). The logic in `ArticleEditorPage.tsx` and `ArticlePage.tsx` is a natural candidate for extraction.

**Recommendations:**

1. Decompose `ArticleEditorPage.tsx`: extract a `useArticleEditor` hook to encapsulate fetches, mutations, and form state; extract `ImageManager` and `ArticleStatusBar` as sub-components. Target: page file ≤ 150 lines as a pure orchestrator.
2. Decompose `ArticlePage.tsx`: the Lexical reader, comment section, and like/subscribe actions are natural sub-components. Extract `useArticle` for data fetching and `useComments` for comment state.
3. Once `react-hook-form` is adopted, `ArticleEditorPage.tsx`'s 18 `useState` calls will collapse significantly, making decomposition easier — do both changes together.
4. Migrate raw `fetch`+`useEffect` data loading in `NewspaperHomepage.tsx`, `CategoryPage.tsx`, and `AuthorPage.tsx` to `useQuery` custom hooks, eliminating the loading/error `useState` boilerplate from those files.
