# Project Review: pb138 — Newspaper Platform

**Date:** 2026-06-07

---

## Project Orientation

The project is a **Turborepo monorepo** with two apps (`apps/server`, `apps/web`) and a shared types package (`packages/shared`). The backend is an **Elysia** (Bun-native) REST API serving JSON over HTTP, backed by **PostgreSQL 17** via **Drizzle ORM**, with Redis for session state (JWT blocklist) and MinIO for image storage. The frontend is **React 19** with **React Router DOM v7**, **TanStack Query**, **TailwindCSS v4**, and **shadcn/ui** (components live as local copies under `apps/web/src/components/ui/`). Auth is implemented with `@elysiajs/jwt` + `Bun.password` (Argon2). Testing is split across `bun test` (unit/integration) and Playwright (e2e). The project includes an OpenAPI spec, an audit log, email verification, QR-code subscriptions, Row-Level Security policies, and structured logging — a notably feature-rich scope for a university project.

---

## Review Summary

| Category              | Status |
| --------------------- | ------ |
| Component Library     | ✅ Good |
| Styling               | ⚠️ Concerns |
| Loading Data          | ⚠️ Concerns |
| Environment Variables | ✅ Good |
| REST API Design       | ✅ Good |
| Database              | ⚠️ Concerns |
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

**Status:** ✅ Good

The project uses **shadcn/ui** (components vendored into `apps/web/src/components/ui/`) plus **Base UI** (`@base-ui/react`, `@base-ui-components/react`) for the toast system. Imports like `from "@/components/ui/button"` and `from "@/components/ui/select"` appear across virtually every page file, confirming consistent use.

Four raw HTML elements were found:

- `apps/web/src/components/ui/textarea.tsx:7` — This **is** the shadcn Textarea component definition; not a bypass.
- `apps/web/src/components/RichTextEditor.tsx:204` — A `<input type="file">` for image upload inside the Lexical editor. File inputs have no shadcn equivalent, so this is acceptable.
- `apps/web/src/pages/ArticleEditorPage.tsx:171` — Hidden `<input type="file">` for triggering image upload. Same justification.
- `apps/web/src/pages/profile/ProfileInfoCard.tsx:161` — `<input type="file">` for avatar upload. Acceptable.

All four raw elements are for file inputs that have no library counterpart. No interactive buttons, selects, or text fields bypass the component library.

**Recommendations:**

1. No immediate action needed. The hidden file-input pattern could optionally be wrapped in a small `<FileInput>` component to standardise the ref/change-handler boilerplate if it grows to more than 3 usages.

---

### 2. Styling

**Status:** ⚠️ Concerns

The project uses Tailwind CSS v4 with the shadcn/ui design-token system (CSS custom properties). This is used consistently. The `!important` override in `apps/web/src/index.css:35` is intentional and documented: it suppresses `animation` for users who prefer reduced motion, which is a legitimate accessibility pattern.

**Inline styles** appear in 12 places:

- Dynamic percentage widths for charts/progress bars (`style={{ width: \`${pct}%\` }}`) appear in `HorizBar.tsx:15`, `NewspaperStatsDashboard.tsx:79`, `Timeline.tsx:25`, `GlobalStatsDashboard.tsx:52`. These are acceptable — Tailwind cannot generate arbitrary runtime percentages.
- `style={{ backgroundColor: "var(--primary)" }}` in `BrandingSection.tsx:62` is reasonable for a CSS custom property that changes at runtime.
- **Smell:** `style={{ fontFamily: "Outfit, Inter, sans-serif" }}` is applied identically in five separate places: `PortalLayout.tsx:22`, `PortalLayout.tsx:50`, `PortalLayout.tsx:88`, `DangerZoneCard.tsx:8`, `ProfileInfoCard.tsx:132`, `PasswordCard.tsx:65`. This duplicated inline style should be a CSS utility class or a design-token variable.

**Arbitrary Tailwind values** are heavily concentrated in `apps/web/src/pages/AuthorPage.tsx`: `text-[13px]`, `text-[32px]`, `text-[28px]`, `max-w-[600px]`, `h-[360px]`, `w-[560px]`, etc. — more than 15 instances on that one page. Most other files use only a handful. Semantic tokens from the Tailwind theme (e.g., `text-sm`, `max-w-lg`) should be preferred over arbitrary pixel values to keep the design consistent and maintainable.

**Recommendations:**

1. Extract the repeated `fontFamily` inline style into a Tailwind class or a CSS class in `globals.css` (e.g., `.font-portal { font-family: Outfit, Inter, sans-serif; }`), and replace all five occurrences.
2. Audit `apps/web/src/pages/AuthorPage.tsx` and replace arbitrary pixel values with the closest Tailwind scale token (e.g., `text-[13px]` → `text-sm`, `text-[32px]` → `text-4xl`, `max-w-[600px]` → `max-w-2xl`).

---

### 3. Loading Data

**Status:** ⚠️ Concerns

TanStack Query (`@tanstack/react-query`) is installed and configured via a `queryClient` singleton (`apps/web/src/lib/queryClient.ts`) with a `QueryClientProvider` in `apps/web/src/frontend.tsx`. However, it is used in only a **small fraction** of the codebase:

- `apps/web/src/pages/dashboard/EditorialQueueSection.tsx` — `useQuery` + `useMutation` ✅
- `apps/web/src/hooks/useNewspaper.ts` — `useQuery` ✅
- `apps/web/src/hooks/useCategory.ts` — `useQuery` ✅
- `apps/web/src/components/Navbar.tsx` — `useQuery` for categories ✅

The **majority** of pages bypass TanStack Query entirely and use manual `fetch()` inside `useEffect` with local `useState` for loading, error, and data:

- `apps/web/src/pages/NewspaperHomepage.tsx:18` — `.then()` chain, no query hook
- `apps/web/src/pages/ArticlePage.tsx:110,156,180` — three separate `useEffect` fetches
- `apps/web/src/pages/DirectorDashboardPage.tsx:25,36` — chained `.then()` calls
- `apps/web/src/pages/CategoryPage.tsx:44` — raw `fetch` in `useEffect`
- `apps/web/src/pages/dashboard/CategoriesSection.tsx:29,52,74,96` — four raw fetches
- `apps/web/src/pages/admin/GlobalUsersSection.tsx:48,65,94` — three raw fetches
- `apps/web/src/components/Sidebar.tsx:243` — raw fetch with `.then(setUser)`

This inconsistency means: no automatic request deduplication, no shared cache, no stale-while-revalidate for most pages, and error handling must be manually re-implemented each time.

Where TanStack Query *is* used, query keys are well-structured stable arrays: `["editorial-queue", newspaperId, currentPage]`, `["category", newspaperId, categorySlug]`. That pattern is correct.

**Recommendations:**

1. Migrate all `useEffect` + `fetch` + `useState` data fetching to `useQuery` from TanStack Query. Each fetch site in a page component should become a `useQuery` call (or a custom hook wrapping one).
2. Migrate all mutation-style fetches (POST/PATCH/DELETE in event handlers) to `useMutation`, which gives you `isPending`, `onSuccess`/`onError` callbacks, and automatic query invalidation.
3. Use stable array query keys everywhere: `["article", newspaperId, articleId]`, `["user", "me"]`, etc.
4. The Eden treaty client (`apps/web/src/lib/api.ts`) is already set up — consider wiring it into TanStack Query fetcher functions for full type-safety.

---

### 4. Environment Variables

**Status:** ✅ Good

- `.env` is in `.gitignore` with explicit entries for all variants (`.env`, `.env.development.local`, etc.) ✅
- `.env.example` is committed with clear placeholder values for all required variables ✅
- No DB connection strings or API secrets hardcoded in application source ✅
- `apps/server/src/server.ts` guards startup on missing `DATABASE_URL` and `JWT_SECRET` with `process.exit(1)` ✅
- `API_BASE_URL` in `apps/web/src/lib/api.ts` defaults to `"http://localhost:3000"` when `PUBLIC_API_BASE_URL` is absent — acceptable for development, but this default will silently misfire in production if the env var is not set.
- One minor issue: `apps/server/src/db/seeds/seedE2eUsers.ts:61` hardcodes `http://localhost:9000/pb138-images/profiles/e2e-placeholder.webp`. This is a seed script not production code, but it would fail in CI against a different MinIO endpoint.

**Recommendations:**

1. In `apps/web/src/lib/api.ts`, consider logging a warning (or throwing) if `PUBLIC_API_BASE_URL` is not set in a production build, to avoid silently pointing at `localhost:3000`.
2. Replace the hardcoded `localhost:9000` URL in `seedE2eUsers.ts:61` with `process.env.MINIO_ENDPOINT` (or accept any placeholder string and later update via admin).

---

### 5. REST API Design

**Status:** ✅ Good

Routes are **resource-oriented with plural nouns** throughout: `/api/newspapers`, `/api/newspapers/:newspaper_id/articles`, `/api/users/me`, `/api/newspapers/:newspaper_id/categories`. No verb-in-path anti-patterns were found.

**HTTP verbs** are used correctly:
- `GET` for all reads ✅
- `POST` for creates (201 returned) ✅
- `PATCH` for partial updates (articles, newspapers) ✅
- `DELETE` for removals (204 returned) ✅
- State-transition sub-resources (`/submit`, `/approve`, `/publish`, `/review`, `/assign-editor`, `/schedule`) use `POST` — the standard pattern for actions that are not idempotent, which is correct ✅

**Status codes** are accurate: `201` on article create (`set.status = 201`), `204` on delete, typed `HttpError` subclasses map to 400/401/403/404/409/422 ✅

**PUT semantics**: `PUT /api/users/me` is used for profile update. The `updateMeBody` schema accepts optional fields, which is partial-update semantics — making this actually a PATCH in disguise. Using `PATCH` here would be more correct.

**Validation**: Elysia's TypeBox `t.Object(...)` schemas are declared on every route handler's `body`, `params`, and `query` properties (`apps/server/src/schemas/articles.ts`, `apps/server/src/schemas/auth.ts`, etc.) ✅

**OpenAPI** documentation is auto-generated via `@elysiajs/openapi` ✅

**Recommendations:**

1. Change `PUT /api/users/me` to `PATCH /api/users/me` in `apps/server/src/routes/users.ts:12`, since the body (`updateMeBody`) accepts optional fields and does not replace the full resource — that is PATCH semantics, not PUT.

---

### 6. Database

**Status:** ⚠️ Concerns

**Schema design** is solid: UUID primary keys throughout, proper foreign key references with `onDelete: "cascade"` where appropriate, unique indexes on `(email, newspaper_id)` and category slugs, enum types for article state and user roles. Images are stored as URLs in MinIO (`apps/server/src/db/schema.ts` `articleImages.url`) — **not as blobs** in the database ✅

**Migrations**: Six versioned `.sql` files exist in `apps/server/drizzle/` (0001–0006), each with a matching entry in `meta/_journal.json`. The setup/migration split is well-documented ✅

**ORM usage**: Drizzle is used for all application queries. Raw SQL (`sql\`...\``) appears only in `apps/server/src/db/rls.ts` (setting PostgreSQL session GUCs for RLS) and in `apps/server/scripts/db-setup.ts` (schema bootstrapping). Both are appropriate uses.

**Performance concern — in-memory search**: `apps/server/src/services/articles.ts` in `searchArticles()` fetches **all published articles** for a newspaper, then filters them in JavaScript:

```ts
const all = await tx.query.articles.findMany({ where: and(eq(...), eq(...)), with: {...} });
const filtered = all.filter((a) => a.title?.toLowerCase().includes(lower) || ...);
```

This loads every article into memory on each search request. For a newspaper with thousands of articles this will be slow and memory-heavy. A `WHERE title ILIKE $1 OR content ILIKE $1` query (or PostgreSQL full-text search with `tsvector`) would be correct here.

**Recommendations:**

1. Rewrite `searchArticles` in `apps/server/src/services/articles.ts` to push the keyword filter to the database — either using Drizzle's `ilike()` helper or a raw `sql` template tag with parameterised input. Apply pagination (`LIMIT`/`OFFSET`) at the query level too, not after fetching all rows.
2. Consider adding a `tsvector` index on `articles(title, perex, content)` if full-text search performance becomes critical.

---

### 7. BE Design Patterns

**Status:** ✅ Good

The backend has a **clean two-layer separation** without conventional `*.controller.ts`/`*.service.ts` naming but with effective folder separation:

- `apps/server/src/routes/` — thin handlers that delegate immediately to service functions. Route files contain no business logic.
- `apps/server/src/services/` — all business logic, DB queries, authorisation checks.
- `apps/server/src/schemas/` — TypeBox validation schemas, decoupled from routes and services.
- `apps/server/src/middleware/` — auth and role guard plugins.
- `apps/server/src/errors/` — typed HTTP error hierarchy.

Route handlers are consistently 1–3 lines, e.g.:

```ts
.get("/api/newspapers/:newspaper_id/articles", ({ params, query, withDb }) =>
    withDb((tx) => articleService.listArticles(tx, params.newspaper_id, query)), { ... })
```

No DB imports appear in route files. Business logic (ownership checks, role enforcement, state machine transitions) lives entirely in services.

**Size concern**: `apps/server/src/services/articles.ts` is **1,057 lines** and `apps/server/src/services/admin.ts` is **824 lines**. While these files contain many distinct functions (not one monolithic function), they are difficult to navigate. Splitting by concern (`article-crud.ts`, `article-workflow.ts`, `article-search.ts`) would improve readability without changing architecture.

The `withRls` pattern (injecting the RLS session into every transaction) is a clever and secure approach to propagating user context to the database.

**Recommendations:**

1. Consider splitting `apps/server/src/services/articles.ts` into sub-files grouped by concern: CRUD operations, workflow/state transitions (submit/approve/publish), and image management.
2. Similarly, `apps/server/src/services/admin.ts` could be split into `admin-roles.ts`, `admin-users.ts`, `admin-statistics.ts`.

---

### 8. Auth

**Status:** ✅ Good

**Authentication** uses `@elysiajs/jwt` (an Elysia plugin wrapping standard JWT operations) and `Bun.password` (Argon2id under the hood) for password hashing — a strong choice. Token-based sessions include a JTI (JWT ID) that is blocklisted in Redis on logout (`apps/server/src/utils/redis.ts`), meaning logout properly invalidates tokens server-side ✅

**Email verification** and **password reset** flows are implemented with short-lived signed tokens ✅

**Authorization** is enforced at two levels:

1. **Database level**: Row-Level Security policies (`apps/server/drizzle/0002_enable_rls.sql`) restrict reads/writes at the PostgreSQL level. Session GUCs (`app.user_id`, `app.newspaper_id`, `app.roles`) are set per-transaction via `withRls()` in `apps/server/src/db/rls.ts`.
2. **Service level**: Every service function checks `user`, `roles`, and ownership before mutating data. Typed error classes (`ForbiddenError`, `UnauthorizedError`) are thrown and caught by the global `onError` handler.

`requireAuth` and `requireRole(role)` middleware plugins are available and used where needed.

The lack of a dedicated auth library (e.g., BetterAuth, Lucia) is not a red flag given the explicit JWT + Bun.password wiring and the RLS defence-in-depth.

**Recommendations:**

1. The `apps/server/src/utils/jwt.ts` file sets session expiry to `"2h"`. Consider making this configurable via an env var for production tuning.
2. Verify in a unit test that an expired or JTI-blocklisted token is correctly rejected by `apps/server/src/middleware/auth.ts` — this is a high-value security boundary worth explicit test coverage.

---

### 9. Testing

**Status:** ✅ Good

29 test files exist with no skipped tests.

**Unit / integration tests** (`bun test`):
- `apps/server/tests/schemas/` — TypeBox schema validation for every domain (articles, auth, categories, comments, subscriptions, users, admin). Good boundary coverage.
- `apps/server/tests/utils/` — logger, email builder, audit, storage utilities.
- `apps/server/tests/rls/policies.test.ts` — **RLS policy tests** that programmatically set session GUCs and assert which rows are visible per role (VISITOR, AUTHOR, EDITOR, MANAGER, ADMIN). This is sophisticated and uncommon for a university project. ✅
- `apps/server/tests/seeds/e2e-users.test.ts` — seed verification tests confirming correct DB state after seeding.

**E2e tests** (Playwright):
- Full workflow coverage: registration, login, article create/edit/approve/reject, comments, likes, profile, role management, subscription.
- Tests are structured, multi-page (author + editor + manager + director in one workflow), and use `waitForResponse` to synchronise with API calls.

**Gap**: There are no unit tests for the service-layer business logic (`apps/server/src/services/articles.ts`, `apps/server/src/services/auth.ts`, etc.). The schema tests verify *input shapes*, and the e2e tests verify *end-to-end flows*, but there is no middle layer testing individual service functions in isolation (e.g., "given a DRAFT article, `approveArticle` should throw `ForbiddenError` if the caller is not EDITOR").

**Recommendations:**

1. Add service-layer unit tests for the most critical business rules: article state-machine transitions (submit → review → approve → publish), role enforcement (`ForbiddenError` when unpermitted role calls a protected function).
2. The RLS test file is exemplary — extend it to cover the `article_category`, `newspaper_authors`, and `subscriptions` tables.

---

### 10. Logging & Monitoring

**Status:** ✅ Good

The project has a **custom structured logger** at `apps/server/src/utils/logger.ts` that:

- Emits NDJSON (one JSON object per line) with `level`, `timestamp`, `message`, and structured metadata ✅
- Respects a `LOG_LEVEL` env var (`error | warn | info | debug`) with a sensible production default (`info`) ✅
- Optionally mirrors to a file via `LOG_FILE` env var ✅
- Writes errors/warnings to `stderr` and info/debug to `stdout` ✅

The `logger` is used throughout service files with structured metadata (e.g., `logger.info("Article published", { articleId, userId })`).

48 `console.log` calls appear in non-test source, but the majority are in **seed scripts and the build pipeline** (`build.ts`, `seedComments.ts`, `seedArticles.ts`, etc.), not in production request paths. The `apps/server/src/utils/logger.ts` itself uses `console.log`/`console.error` internally (correct — it is the logger). The web server startup line `apps/web/src/index.ts:42` uses `console.log` which is acceptable.

No sensitive data (passwords, tokens, secrets) was found in any log call.

**Recommendations:**

1. Replace `console.log` calls in seed scripts with `logger.info(...)` for consistency, so seed output also gets structured timestamps and can be redirected to `LOG_FILE`.
2. Consider adding HTTP request/response logging middleware (method, path, status, duration) to the Elysia app — this is a standard observability primitive missing from the current setup.

---

### 11. Error Handling

**Status:** ⚠️ Concerns

**Backend** error handling is well-structured:

- A typed `HttpError` hierarchy in `apps/server/src/errors/index.ts` (400/401/403/404/409/422) is used throughout services ✅
- A global `onError` handler in `apps/server/src/server.ts:94` catches `HttpError` instances and serialises them to JSON with the correct status code ✅
- Service functions consistently throw typed errors rather than returning null or empty objects ✅

**Frontend** error handling is mixed:

- Toast notifications surface errors for mutations in `EditorialQueueSection.tsx` (`onError: () => toast(...)`) ✅
- `EditorialQueueSection.tsx:123` renders an `isError` state from TanStack Query ✅
- Lexical editor uses `LexicalErrorBoundary` ✅
- **Silent catch** in `apps/web/src/pages/director/ApprovalQueue.tsx:33`:
  ```ts
  } catch {
    /* empty */
  }
  ```
  This swallows a loading error entirely — the user sees nothing if the approval queue fails to load.
- Many pages using raw `fetch` in `useEffect` lack visible error states. If the fetch rejects (network error), the loading spinner often just disappears with no message.

**Recommendations:**

1. Replace the silent `catch { /* empty */ }` in `apps/web/src/pages/director/ApprovalQueue.tsx:33` with a state update that renders an error message to the user.
2. All pages that load data via raw `useEffect` + `fetch` should handle the rejection case and render a visible error message or retry option.
3. Add a React error boundary at the router root level so uncaught render errors don't result in a blank page.

---

### 12. Security

**Status:** ✅ Good

- **CORS**: Explicitly configured in `apps/server/src/server.ts:36` using `process.env.FRONTEND_URL` — no wildcard `*`. Allowed methods and headers are explicitly enumerated ✅
- **No hardcoded secrets**: No API keys, passwords, or tokens were found in source code ✅
- **SQL injection**: All queries use Drizzle ORM parameterised builders. The only raw `sql\`...\`` calls are for RLS GUC-setting commands that do not interpolate untrusted input into SQL keywords ✅
- **Password hashing**: `Bun.password.hash()` uses Argon2id, a modern memory-hard algorithm ✅
- **JWT logout**: JTI blocklist in Redis prevents replay of invalidated tokens ✅
- **Row-Level Security**: PostgreSQL RLS policies provide defence-in-depth so even a compromised query cannot leak cross-newspaper data ✅
- **`.env` in `.gitignore`**: Confirmed ✅

One observation: `apps/web/src/lib/api.ts` stores the JWT in `localStorage.getItem("token")`. `localStorage` is accessible to any JavaScript on the page (XSS risk). A `httpOnly` cookie would be more secure, but this is a common trade-off in SPA architectures and not a blocker for a university project.

**Recommendations:**

1. Consider migrating token storage from `localStorage` to a `httpOnly` cookie to remove the XSS attack surface. This requires backend cookie-handling changes in the auth service.
2. Add a `Content-Security-Policy` header to the frontend server response to mitigate XSS injection vectors.

---

### 13. Forms

**Status:** ❌ Issues

No form library is present. The `zod` workspace dependency is declared in the root `package.json` (via `overrides`) but is used only on the server (for TypeBox compatibility); it is **not** wired to any frontend form validation.

**Form-as-useState anti-pattern** is pervasive. Every form in the app is built from a collection of `useState` calls with manual `handleSubmit` and manual field-level validation:

| File | `useState` calls | Pattern |
|------|-----------------|---------|
| `apps/web/src/pages/ArticleEditorPage.tsx` | 18 | Manual state per field |
| `apps/web/src/pages/profile/ProfileInfoCard.tsx` | 12 | Manual state per field |
| `apps/web/src/pages/SignUpPage.tsx` | 10 | Manual state per field |
| `apps/web/src/pages/profile/PasswordCard.tsx` | 7 | Manual state + manual validation |
| `apps/web/src/pages/dashboard/CategoriesSection.tsx` | 8 | Manual state |

`SignUpPage.tsx` is a textbook example of the anti-pattern:
```ts
const [fullName, setFullName] = useState("");
const [username, setUsername] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [error, setError] = useState<string | null>(null);
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
const [loading, setLoading] = useState(false);
// ... manual if-checks for validation
if (password !== confirmPassword) { setFieldErrors({ confirmPassword: "..." }); return; }
```

`PasswordCard.tsx` manually validates minimum length and match:
```ts
if (newPassword !== confirmPassword) { setError("New passwords do not match."); return; }
if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
```

None of these validations are schema-driven. Adding a new field means updating `useState`, the submit handler, the error display, and the field render — in four separate places.

**Recommendations:**

1. Introduce **React Hook Form** (`react-hook-form`) + **Zod** (`@hookform/resolvers`) across all form pages. This eliminates the manual `useState`-per-field pattern, gives schema-driven validation, and reduces each form to a `useForm<Schema>()` call with a `resolver`.
2. Start with `SignUpPage.tsx`, `LoginPage.tsx`, and `PasswordCard.tsx` as they are self-contained and have clear validation rules. Then move to `ProfileInfoCard.tsx` and `CategoriesSection.tsx`.
3. Define a shared Zod schema for each form (e.g., `registerSchema`, `loginSchema`) in `apps/web/src/schemas/` and validate against it on the frontend, aligned with the existing TypeBox schemas on the backend.
4. Surface validation errors inline next to each field using React Hook Form's `formState.errors`, rather than a single top-level error string.

---

### 14. Frontend Structure

**Status:** ⚠️ Concerns

**Page decomposition** is generally good — the dashboard is split into `MyArticlesSection`, `EditorialQueueSection`, `ReviewQueueSection`, `CategoriesSection` rather than one monolithic file. The admin dashboard uses `GlobalUsersSection` and `NewspaperUsersSection`. This is the right instinct.

**Large files**:

- `apps/web/src/pages/ArticleEditorPage.tsx` — **573 lines**. It contains a declared sub-component (`EditorSidebar`) and manages 18 `useState` calls, 4 `useEffect` calls, image upload logic, article create/update/delete, and category fetching. The editor page is doing too much in one file.
- `apps/web/src/pages/ArticlePage.tsx` — **438 lines**. It manages article loading, likes, comments (fetch + submit + delete), subscription gating, and the Lexical viewer config all in one component with 10 `useState` calls.

**Data fetching inconsistency**: TanStack Query is used in `EditorialQueueSection.tsx` but not in `ArticlePage.tsx`, `CategoryPage.tsx`, `NewspaperHomepage.tsx`, `DirectorDashboardPage.tsx`, `CategoriesSection.tsx`, or `admin/GlobalUsersSection.tsx`. The pattern of `useEffect(() => { fetch(...).then(setData) }, [dep])` is repeated across many files without the caching, deduplication, or background-refetch benefits of TanStack Query.

**Custom hooks** are sparse given the codebase size: only `useArticleViewTracker`, `useCategory`, `useNewspaper`, `useTheme`. There is no `useArticle`, `useComments`, `useCategories`, `useArticleEditor` — logic that is currently embedded in component bodies.

**No TanStack Router**: React Router DOM v7 is used, which does not provide file-based route loaders in the same way as TanStack Router. This is a reasonable choice and not penalised; however, the lack of loaders means all data fetching happens inside component bodies via `useEffect`, contributing to loading waterfalls.

**Recommendations:**

1. Extract a `useArticle(articleId)` custom hook from `ArticlePage.tsx` that wraps the article fetch (and optionally comments) in a `useQuery`. This would cut the component by ~100 lines and make the data layer testable.
2. Decompose `ArticleEditorPage.tsx`: extract image upload into an `EditorImageSection` component and the article fetch/save logic into a `useArticleEditor(articleId)` custom hook.
3. Migrate `CategoryPage.tsx`, `NewspaperHomepage.tsx`, and `DirectorDashboardPage.tsx` fetch calls to `useQuery` — see Loading Data recommendations.
4. Create a `useComments(articleId)` hook encapsulating the comment list fetch, submit, and delete so `ArticlePage.tsx` delegates to it rather than managing comment state inline.
