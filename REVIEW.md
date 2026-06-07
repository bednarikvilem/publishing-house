# Project Review: pb138

**Date:** 2026-06-07

---

## Project Orientation

The project is a Turborepo monorepo with two apps: `apps/server` (Elysia 1.4 on Bun with Drizzle ORM + PostgreSQL 17, JWT via `@elysiajs/jwt` and `Bun.password` for argon2) and `apps/web` (React 19 + React Router v7 + TailwindCSS v4 + shadcn/ui). Supporting infrastructure includes Redis (session/cache), MinIO (S3-compatible image storage), and Nodemailer (Mailtrap sandbox). The backend uses a service-layer architecture under `apps/server/src/services/` with route files in `apps/server/src/routes/`. Row-Level Security (RLS) is enforced at the PostgreSQL level via GUC session variables, providing defence-in-depth for multi-tenant data isolation. A custom structured logger (`apps/server/src/utils/logger.ts`) emits NDJSON and replaces all `console.log` in production server code. The test suite covers schema validation (TypeBox), RLS policies, utility functions, and E2E flows (Playwright).

---

## Review Summary

| Category              | Status |
| --------------------- | ------ |
| Component Library     | ✅ Good |
| Styling               | ✅ Good |
| Loading Data          | ⚠️ Concerns |
| Environment Variables | ✅ Good |
| REST API Design       | ⚠️ Concerns |
| Database              | ✅ Good |
| BE Design Patterns    | ⚠️ Concerns |
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

**Status:** ✅ Good — shadcn/ui is present and used consistently

`shadcn` is listed in `apps/web/package.json` and the generated components are in `apps/web/src/components/ui/`. `Button`, `Input`, `Select`, `Textarea`, `Badge`, and `Table` are all library-based. The handful of raw HTML elements found are legitimate:

- `apps/web/src/components/ui/textarea.tsx:7` — this is the shadcn primitive itself.
- `apps/web/src/components/RichTextEditor.tsx:204` — a file-upload `<input type="file">` for image injection; no shadcn file-picker primitive exists.
- `apps/web/src/pages/ArticleEditorPage.tsx:171` — same file-upload pattern.
- `apps/web/src/pages/profile/ProfileInfoCard.tsx:158` — `<input type="file">` for profile picture upload.

None of these are bypasses; they are justified native-element uses where the library provides no equivalent.

**Recommendations:**

1. No action required. Continue using library components for all interactive elements.

---

### 2. Styling

**Status:** ✅ Good — Tailwind used with design tokens, no arbitrary value abuse

The project uses Tailwind CSS v4 with a `@theme inline` token approach defined in `apps/web/styles/globals.css`. All custom font sizes use `rem` (e.g. `--text-2xs: 0.8125rem`) so they scale with browser font size preferences. Letter-spacing tokens use `em` so they scale proportionally with font size at any zoom level:

```css
--tracking-snug: -0.019em;
--tracking-tight-px: -0.031em;
--tracking-tighter-px: -0.063em;
--tracking-wide-sm: 0.031em;
```

**Inline `style={}`** appears only in stats/chart components for dynamic percentage widths that cannot be expressed as static Tailwind classes:
- `apps/web/src/components/stats/HorizBar.tsx:18` — `style={{ width: \`${pct}%\` }}`
- `apps/web/src/components/stats/Timeline.tsx:25` — `style={{ height: ... }}`
- `apps/web/src/pages/ArticlePage.tsx:358` — `style={{ height: 1 }}` for an IntersectionObserver sentinel

**Arbitrary values** in production code are limited to shadcn-generated UI primitives (`button.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, `table.tsx`) which use `[3px]` for focus rings and `[2px]` for checkbox alignment. These are vendor-generated. `apps/web/src/APITester.tsx` has `w-[100px]` and `min-h-[140px]` — this is a dev-only testing utility.

**`!important`** — `apps/web/src/index.css:35` uses `animation: none !important` for `prefers-reduced-motion`. Intentional and documented in a comment at `:29`.

**Recommendations:**

1. No immediate action required. Maintain the convention that arbitrary `[#hex]` and `[Npx]` values in application code are prohibited; all values must map to tokens in `globals.css`.
2. Consider `eslint-plugin-tailwindcss` with a `no-arbitrary-value` rule to enforce this automatically.

---

### 3. Loading Data

**Status:** ⚠️ Concerns — TanStack Query installed and used in some places, bypassed with raw `fetch()` in the majority

TanStack Query is correctly set up (`apps/web/src/lib/queryClient.ts`, `<QueryClientProvider>` in `apps/web/src/frontend.tsx`) and used well in:
- `apps/web/src/pages/dashboard/EditorialQueueSection.tsx` — `useQuery` + `useMutation` with proper invalidation
- `apps/web/src/hooks/useNewspaper.ts`, `apps/web/src/hooks/useCategory.ts`
- `apps/web/src/components/Navbar.tsx`

However, the majority of pages fetch with raw `fetch().then()` chains inside `useEffect`:
- `apps/web/src/pages/AdminDashboardPage.tsx:19–31`
- `apps/web/src/pages/CategoryPage.tsx:47–55`
- `apps/web/src/pages/SearchResultsPage.tsx:40–48`
- `apps/web/src/pages/AuthorPage.tsx:49–55`
- `apps/web/src/pages/DashboardPage.tsx:38–41`
- `apps/web/src/components/Sidebar.tsx:244–247`
- `apps/web/src/components/StatisticsSection.tsx:38–47`
- `apps/web/src/pages/dashboard/ReviewQueueSection.tsx` and `MyArticlesSection.tsx` — manual `useCallback` + `setLoading`/`setError`

This pattern provides no caching, no background refetch, no deduplication, and forces every component to re-implement boilerplate loading/error state. Query keys, where used, are correctly stable arrays: `["newspaper", name]`, `["category", id, slug]`.

**Recommendations:**

1. Migrate all direct `fetch()` calls in component files to `useQuery` hooks. Each `useEffect` fetch can be replaced with a `useQuery` call.
2. Create a shared `useCurrentUser` hook backed by `useQuery` and use it in `Sidebar.tsx` to cache the result globally across mounts.
3. The `ReviewQueueSection` and `MyArticlesSection` `useCallback`-based patterns are exactly what `useQuery` replaces — migrate these first as they are the most verbose examples.

---

### 4. Environment Variables

**Status:** ✅ Good — env properly guarded and templated

`.env` is in `.gitignore`. `.env.example` is committed with placeholder values covering all required variables (DB, JWT, SMTP, Redis, MinIO, frontend URL, log level). The server validates required vars at startup:

```ts
// apps/server/src/server.ts:24–31
if (!DATABASE_URL) { logger.error("Missing DATABASE_URL..."); process.exit(1); }
if (!process.env.JWT_SECRET) { logger.error("Missing JWT_SECRET..."); process.exit(1); }
```

The only hardcoded URL in source is `apps/server/src/db/seeds/seedE2eUsers.ts:61` — `http://localhost:9000/pb138-images/...` for a seed profile picture URL. Acceptable in seed/fixture code, not a production path.

**Recommendations:**

1. No action required.

---

### 5. REST API Design

**Status:** ⚠️ Concerns — resource-oriented routes with good verb usage, but some status codes need attention

Routes are resource-oriented under `/api/newspapers/:id/articles`, `/api/newspapers/:id/categories`, etc. HTTP verbs are used correctly: `POST` for create, `PATCH` for partial update, `DELETE` for delete. Workflow state transitions (`/submit`, `/approve`, `/review`, `/publish`, `/assign-editor`) are expressed as POST sub-resources — a legitimate REST pattern.

Status codes are mostly correct: `201` on article create, `204` on article delete and image delete, `401`/`403` from middleware, `409` for conflicts. Request validation uses TypeBox via Elysia's native schema validation (`apps/server/src/schemas/articles.ts`).

Concerns:
- `POST /api/newspapers/:id/articles/:id/views` (`apps/server/src/routes/views_route.ts:22`) — should return `201` (created), not `200`.
- DELETE handlers on comments were not confirmed to return `204`.
- `updateArticleBody` in `apps/server/src/schemas/articles.ts` should mark all fields `Optional` to enforce correct PATCH semantics (partial update only).

**Recommendations:**

1. Verify `views_route.ts` sets `set.status = 201` on the POST handler.
2. Audit all DELETE handlers (comments, categories, likes) to confirm they return `204` with no response body.
3. Confirm `updateArticleBody` marks all fields as `t.Optional(...)` — a PATCH body that requires all fields is a PUT in disguise.

---

### 6. Database

**Status:** ✅ Good — well-designed schema, versioned migrations, ORM used throughout

The schema in `apps/server/src/db/schema.ts` is well-structured: normalised relational tables with UUID PKs, appropriate foreign keys with `CASCADE` and `SET NULL` delete behaviours, composite primary keys on join tables (`likes`, `userRoles`), and unique constraints (`email_newspaper_idx`, `global_roles_role_unique`). No `bytea`/`blob` columns — images are stored in MinIO with URLs in the DB.

Migrations are versioned: 6 SQL files in `apps/server/drizzle/` (`0001_add_article_views.sql` through `0006_add_subscriptions_rls.sql`). One TypeScript migration (`apps/server/src/db/migrations/addGlobalEmailUniqueIndex.ts`) exists alongside the SQL files — a minor format inconsistency.

DB queries use Drizzle ORM throughout the service layer. The `withRls()` wrapper (`apps/server/src/db/rls.ts`) sets PostgreSQL session GUCs before every query, enforcing RLS per-request. One `db.select().from(newspapers)` appears directly in `apps/server/src/server.ts:79` (the `/api` health endpoint) — a minor layer violation.

**Recommendations:**

1. Move the `db.select()` in `server.ts:79` into a service or query function.
2. Consolidate the TypeScript migration into the SQL migration format for consistency.

---

### 7. Backend Design Patterns

**Status:** ⚠️ Concerns — service layer exists but `articles.ts` is severely oversized

The project has a clear two-layer structure: thin Elysia route handlers in `apps/server/src/routes/` that delegate to service functions in `apps/server/src/services/`. Route handlers contain no direct DB calls.

However, `apps/server/src/services/articles.ts` is **1057 lines** — well beyond the ~200–300 line guideline. It handles article CRUD, submission workflow, image upload, review, approval, scheduling, publication, and search. This is a god-service that mixes multiple distinct concerns. No repository layer exists; services call Drizzle directly, which is acceptable at this project size.

**Recommendations:**

1. Split `apps/server/src/services/articles.ts` into at least three files: `articleQueries.ts` (reads/search/listing), `articleWorkflow.ts` (submit/review/approve/publish state machine), and `articleImages.ts` (upload/delete).
2. Consider a thin repository layer for complex Drizzle queries to keep service functions focused on business rules.

---

### 8. Auth

**Status:** ✅ Good — JWT-based auth with Elysia middleware, authorization enforced via RLS + service checks

Authentication uses `@elysiajs/jwt` (not manual `jsonwebtoken`). `Bun.password` handles argon2 hashing — no raw `bcrypt` wiring. The `authMiddleware` (`apps/server/src/middleware/auth.ts`) decodes the JWT, checks the JTI blocklist in Redis (logout support), loads user + roles from DB, and exposes a `withDb()` closure that wraps every query in RLS session context.

Authorization is enforced at two levels:
1. **Route level** — `requireAuth` and `requireRole(role)` Elysia middleware guards.
2. **Database level** — PostgreSQL RLS policies filter rows based on `app.user_id`, `app.newspaper_id`, `app.roles` GUCs set by `withRls()`.

Service-level authorization checks also exist (e.g. `apps/server/src/services/categories.ts:81` logs `"Category create failed: forbidden"` before throwing). No 403 bypasses were found.

**Recommendations:**

1. No action required. The layered auth approach (middleware + RLS + service checks) is a strong security posture.

---

### 9. Testing

**Status:** ✅ Good — 29 test files across schema validation, RLS policies, utilities, and E2E

Test files:
- **Schema tests** (`apps/server/tests/schemas/`) — TypeBox schema validation for all routes (articles, auth, categories, comments, subscriptions, users, admin). 176 tests pass.
- **RLS policy tests** (`apps/server/tests/rls/policies.test.ts`) — tests multi-tenant data isolation (requires live PostgreSQL).
- **Utility tests** (`apps/server/tests/utils/`) — logger, email, audit, storage.
- **Seed verification** (`apps/server/tests/seeds/e2e-users.test.ts`) — verifies e2e seed users are present.
- **E2E tests** (`tests/e2e/`) — Playwright covering visitor, auth, author, registered user, admin, article approval/rejection workflow, and subscription workflow.

No skipped or TODO tests found. Runner is `bun test` (server) and `bunx playwright test` (e2e).

**Recommendations:**

1. Add a CI step that spins up PostgreSQL (Docker) so the RLS tests always run in CI — currently they fail when PostgreSQL is not available.
2. Consider unit tests for the article workflow state machine in `articles.ts` (submit → review → approve → publish transitions).

---

### 10. Logging & Monitoring

**Status:** ✅ Good — custom structured NDJSON logger, no `console.log` in production server paths

`apps/server/src/utils/logger.ts` implements a structured JSON logger with level filtering (`LOG_LEVEL` env var), optional file mirroring (`LOG_FILE` env var), and separate stdout/stderr routing. Used consistently throughout `apps/server/src/services/` and `apps/server/src/server.ts`.

Production server code has zero `console.log` calls. `console.log` appears only in scripts (`apps/server/scripts/`), seed files (`apps/server/src/db/seed*.ts`), and `apps/web/src/index.ts:42` (startup banner). No passwords, tokens, or secrets are logged.

`apps/web/src/components/RichTextEditor.tsx` has `console.error("Lexical error:", error)` inside Lexical's `onError` callback — acceptable framework boundary.

**Recommendations:**

1. No action required for core paths. Optionally replace `console.log` in `addGlobalEmailUniqueIndex.ts` with the structured logger for consistency.

---

### 11. Error Handling

**Status:** ⚠️ Concerns — backend is excellent; frontend error states are inconsistent

**Backend:** Global `onError` handler in `apps/server/src/server.ts:94` catches all `HttpError` instances, returns structured JSON with the correct status, and logs unhandled errors with full context. Custom `HttpError` classes in `apps/server/src/errors/` cover 400, 401, 403, 404, 409, 422, 500. Catch blocks in services rethrow typed errors.

**Frontend:**
- `apps/web/src/pages/CategoryPage.tsx`, `SearchResultsPage.tsx`, `AuthorPage.tsx`, `AdminDashboardPage.tsx` — all use `.catch(() => setError(...))`, surfacing generic messages but losing API error detail.
- `apps/web/src/pages/dashboard/ReviewQueueSection.tsx:54` — `setError(true)` boolean, only shows generic `<ErrorState />`.
- `apps/web/src/components/Sidebar.tsx:244–247` — `.then(setUser).then(...)` chain — the catch branch was not visible in the audit; if the fetch fails, the sidebar may silently show nothing.

**Recommendations:**

1. Adopt `useQuery` throughout (per Loading Data recommendation) — error states come for free via `isError` and `error`.
2. For the sidebar user fetch, ensure a visible fallback if the fetch fails.
3. Where API error bodies contain structured field errors, surface them per-field rather than collapsing to a single generic message.

---

### 12. Security

**Status:** ✅ Good — CORS configured, no secrets in source, ORM prevents injection

CORS is explicitly configured in `apps/server/src/server.ts:36–42` with `origin: process.env.FRONTEND_URL` (not wildcard), allowed methods list, and credentials. `.env` is in `.gitignore`. No API keys or secrets were found in source files. Database queries use Drizzle ORM parameterised queries — no raw SQL string interpolation outside of migration files (where it is correct). The RLS approach provides defence-in-depth even against service-layer authorization bugs.

**Recommendations:**

1. No action required.

---

### 13. Forms

**Status:** ❌ Issues — no form library; all forms are hand-rolled with `useState` and manual validation

No form library (React Hook Form, TanStack Form, Formik) is in `apps/web/package.json`. No validation library (Zod, Yup, Valibot) is wired to forms. All forms are hand-rolled:

- `apps/web/src/pages/SignUpPage.tsx` — 10 `useState` calls, manual `handleSubmit`, manual field error state via `setFieldErrors({})`, server validation errors mapped manually from API responses.
- `apps/web/src/pages/profile/ProfileInfoCard.tsx` — 12 `useState` calls including form fields, loading, and errors.
- `apps/web/src/pages/profile/PasswordCard.tsx` — manual `setError("Passwords do not match")` and `setError("Password must be at least 8 characters")`.
- `apps/web/src/pages/LoginPage.tsx`, `GlobalLoginPage.tsx` — manual fetch + `useState` for error.

Every form re-implements the same boilerplate: `setLoading(true)` → `try { await fetch(...) } catch { setError(...) } finally { setLoading(false) }`. This is the form-as-useState anti-pattern at scale. `apps/web/src/components/FormField.tsx` wraps `<Input>` with label and error display but without a form library driving it, state management is still entirely manual.

**Recommendations:**

1. Adopt React Hook Form + `@hookform/resolvers` + Zod for all forms.
2. Define Zod schemas for each form (registration, login, password change, profile update).
3. Migrate `SignUpPage.tsx` first — it has the most complexity (field errors + server errors + loading) and can serve as a reference implementation for the rest.

---

### 14. Frontend Structure

**Status:** ⚠️ Concerns — two god components; most pages well-structured

Page line counts:
- `ArticleEditorPage.tsx` — **573 lines** — rich text editor wiring, image upload state, article CRUD state, and keyboard shortcuts all inline.
- `ArticlePage.tsx` — **438 lines** — article content, comments, likes, subscription gate, view tracking, and social sharing all inline.

Most other pages are within acceptable range: `EditorialQueueSection.tsx` (290 lines), `AuthorPage.tsx` (243 lines), `ProfileInfoCard.tsx` (232 lines), `CategoryPage.tsx` (214 lines).

React Router v7 is used (not TanStack Router), so no `loader` pattern applies. Data fetching inside component bodies via `useEffect` is the correct pattern for this router.

Custom hooks are limited to `useNewspaper.ts`, `useCategory.ts`, `useArticleViewTracker.ts`, `useTheme.ts`. The dashboard is well-decomposed (`EditorialQueueSection`, `ReviewQueueSection`, `MyArticlesSection`, `CategoriesSection` are separate files). No logic extraction hooks exist for the two large page components.

**Recommendations:**

1. Extract a `useArticleEditor` hook from `ArticleEditorPage.tsx` containing image upload state, keyboard shortcut registration, and save/submit logic — target ~200 lines for the component file.
2. Extract a `useArticlePageData` hook from `ArticlePage.tsx` holding comment/like/view-tracking state and fetches.
3. Extract a `<CommentsSection>` sub-component from `ArticlePage.tsx` — the comment list, comment form, and submit handler are large enough to be their own unit.
