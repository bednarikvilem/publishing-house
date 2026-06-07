# Project Review: pb138 — Newspaper Platform

**Date:** 2026-06-07

---

## Project Orientation

The project is a monorepo (Turborepo + Bun workspaces) with two main applications: `apps/server` (Elysia backend on Bun) and `apps/web` (React 19 frontend with Bun's HTML-import bundler). The backend uses Drizzle ORM against PostgreSQL 17 with Row-Level Security policies enforced at the database level; images are stored in MinIO (S3-compatible). Authentication is JWT-based via `@elysiajs/jwt` with argon2 password hashing (`Bun.password`), a JTI blocklist in Redis, and role-based middleware guards. The frontend uses React Router v7 (BrowserRouter mode), TailwindCSS v4, shadcn/ui built on `@base-ui/react`, and TanStack React Query v5 — though data fetching is mixed between React Query hooks and bare `useEffect + fetch`. Infrastructure (database, Redis, MinIO) is fully Dockerised with a clear first-time setup script. Documentation (API contract, ERD, use-case diagrams, functional requirements) is well-maintained in `docs/`.

---

## Review Summary

| Category              | Status |
| --------------------- | ------ |
| Component Library     | ✅ Good |
| Styling               | ⚠️ Concerns |
| Loading Data          | ⚠️ Concerns |
| Environment Variables | ✅ Good |
| REST API Design       | ⚠️ Concerns |
| Database              | ✅ Good |
| BE Design Patterns    | ⚠️ Concerns |
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

**Status:** ✅ Good

The project uses shadcn/ui built on `@base-ui/react` primitives (`@base-ui/react` and `@base-ui-components/react` in `apps/web/package.json`). Wrapper components live in `apps/web/src/components/ui/` (button, input, textarea, select, dialog, toaster). Library components are imported consistently across the codebase:

```
apps/web/src/components/Navbar.tsx        → Button, Input
apps/web/src/components/Sidebar.tsx       → Button
apps/web/src/pages/dashboard/EditorialQueueSection.tsx → toast, Button
```

Raw HTML interactive elements appear in only two places:
- `apps/web/src/components/RichTextEditor.tsx:204` — `<input type="file">` for image upload (file inputs have no library equivalent)
- `apps/web/src/pages/profile/ProfileInfoCard.tsx:158` — `<input type="file" ref={fileInputRef}>` for avatar upload (same justification)

Both raw `<input>` usages are for `type="file"`, which is legitimately excluded from component libraries. No library bypasses detected for text inputs, buttons, or selects.

**Recommendations:**

1. No action required — library usage is consistent and the two raw `<input type="file">` elements are appropriate exceptions.

---

### 2. Styling

**Status:** ⚠️ Concerns

The project uses TailwindCSS v4 with the shadcn/ui design token system. A few concerns:

**Inline styles** appear in chart/bar components where a runtime percentage width is needed — this is the correct pattern for truly dynamic values:
```tsx
// apps/web/src/components/stats/Timeline.tsx:25
style={{ height: `${Math.max(pct, val > 0 ? 4 : 0)}%` }}
```
These are acceptable. Less justified is `apps/web/src/pages/director/BrandingSection.tsx:62` which uses `style={{ backgroundColor: "var(--primary)" }}` — a Tailwind class (`bg-primary`) would suffice here.

**Arbitrary value abuse** is frequent. The Sidebar alone has at least six instances of pixel-value arbitrary sizes:
```tsx
// apps/web/src/components/Sidebar.tsx
text-[13px]   text-[11px]   w-[225px]
```
These repeat across many files (`text-[13px]` appears in Pagination, GlobalUsersSection, NewspaperHomepage) and suggest missing Tailwind custom tokens. A handful of hardcoded pixel dimensions are also scattered through pages (`h-[500px]`, `w-[540px]`, `h-[200px]`, `h-[360px]`, `h-[280px]`).

**`!important`** appears once in `apps/web/src/index.css:35` for a Motion API animation override — the comment explains the intent and this is acceptable.

**Recommendations:**

1. Define custom font-size tokens in the Tailwind config (e.g., `text-ui-sm` for 13px, `text-ui-xs` for 11px) instead of repeating `text-[13px]` and `text-[11px]` across components.
2. Replace `style={{ backgroundColor: "var(--primary)" }}` in `BrandingSection.tsx:62` with the Tailwind class `bg-primary`.
3. Audit fixed-height arbitrary values (`h-[500px]`, `w-[540px]`, etc.) in page layouts — extract into named layout tokens or CSS variables for consistency.

---

### 3. Loading Data

**Status:** ⚠️ Concerns

TanStack React Query v5 is configured (`apps/web/src/lib/queryClient.ts`) and used correctly in several places:
```ts
// apps/web/src/hooks/useNewspaper.ts
useQuery({ queryKey: ["newspaper", newspaperName], ... })

// apps/web/src/hooks/useCategory.ts
useQuery({ queryKey: ["category", newspaperId, categorySlug], ... })

// apps/web/src/pages/dashboard/EditorialQueueSection.tsx
useQuery / useMutation with stable array keys and cache invalidation
```
Query keys are stable arrays (e.g., `["editorial-queue", newspaperId, currentPage]`) — good practice.

However, large portions of the frontend bypass React Query and fetch data directly in `useEffect`:
```tsx
// apps/web/src/components/Sidebar.tsx:244
fetch(...).then(res => ...).then(setUser)

// apps/web/src/pages/CategoryPage.tsx:47
useEffect(() => {
  fetch(`${API_BASE_URL}/api/newspapers/...`)
    .then(...)
    .then(data => setArticles(data.data))
    .catch(() => {}); // silently swallows errors
}, [newspaper, category]);

// apps/web/src/components/Navbar.tsx:85
// apps/web/src/pages/AuthorPage.tsx:49
// apps/web/src/pages/NewspaperHomepage.tsx:19
// same pattern
```

These bypasses mean no caching, no automatic refetching, no consistent loading/error states, and no request deduplication. The `CategoryPage` silently swallows fetch errors.

**Recommendations:**

1. Replace all `useEffect + fetch` patterns in page components with `useQuery` calls. Start with the highest-traffic components: `Navbar.tsx`, `Sidebar.tsx`, `CategoryPage.tsx`, `NewspaperHomepage.tsx`.
2. Extract the Sidebar user fetch into a `useCurrentUser` hook backed by React Query to enable cache sharing with the Navbar (both currently fetch `/api/users/me` independently).
3. Remove the empty `.catch(() => {})` in `CategoryPage.tsx:47` — React Query's `isError` state handles this cleanly and can surface an error message to the user.

---

### 4. Environment Variables

**Status:** ✅ Good

`.env` is correctly listed in `.gitignore`. An `.env.example` is committed with clear placeholder values for all required variables (database, JWT secret, SMTP, Redis, MinIO, frontend URL, log level). All config is read through `process.env` / `Bun.env`:

```ts
// apps/server/src/server.ts
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { logger.error("Missing DATABASE_URL"); process.exit(1); }
```

The frontend's `API_BASE_URL` is environment-driven:
```ts
// apps/web/src/lib/api.ts
export const API_BASE_URL = import.meta.env?.PUBLIC_API_BASE_URL ?? "http://localhost:3000";
```

The only hardcoded URLs are in seed scripts:
- `apps/server/src/db/seeds/seedE2eUsers.ts:61` — `http://localhost:9000/pb138-images/...` (acceptable test fixture)
- `apps/server/src/db/seeds/seedArticles.ts:10` — `https://loremflickr.com/800/600/...` (acceptable seeding helper)

**Recommendations:**

1. Consider moving the `localhost:9000` URL in `seedE2eUsers.ts:61` to use the `MINIO_ENDPOINT` env variable to keep seeds portable across environments.

---

### 5. REST API Design

**Status:** ⚠️ Concerns

**Positives:** All routes use plural-noun resource paths with no verbs in URLs. HTTP methods are correctly assigned. Creates return 201, deletes return 204:
```ts
// apps/server/src/routes/articles.ts:74
set.status = 201; // POST /articles

// apps/server/src/routes/articles.ts:97
set.status = 204; // DELETE /articles/:id
```
Request and response schemas are validated with TypeBox throughout. State transitions use POST to sub-resources (`/submit`, `/approve`, `/review`, `/publish`) — an acceptable REST pattern for workflow actions.

**PUT semantics violation:** `PUT /api/users/me` (`apps/server/src/routes/users.ts`) performs a partial update — only touching fields that are present in the body:
```ts
// apps/server/src/services/users.ts
const updateData: Partial<typeof users.$inferInsert> = {};
if (username !== undefined) updateData.username = username;
if (full_name !== undefined) updateData.fullname = full_name;
```
This is PATCH semantics. PUT should accept and store the full resource representation. A PUT with missing fields should set those fields to null/default — not leave them unchanged.

**Recommendations:**

1. Rename `PUT /api/users/me` to `PATCH /api/users/me` in `apps/server/src/routes/users.ts`. Update the corresponding client call in `apps/web/src/pages/profile/ProfileInfoCard.tsx` (currently sends `method: "PUT"`).
2. Consider returning 201 from `/submit` — it creates a new `articleReview` record. Currently returns 200.

---

### 6. Database

**Status:** ✅ Good

The schema (`apps/server/src/db/schema.ts`) is well-structured with proper relational design:
- UUID primary keys throughout ✅
- Foreign keys with appropriate `onDelete` cascades ✅
- `articleCategory` has a composite unique constraint on `(slug, newspaper_id)` ✅
- `likes` uses a composite primary key `(userId, articleId)` ✅
- No `bytea`/`blob` columns — images are stored in MinIO, only URLs in the DB ✅
- 7 versioned migration files (`apps/server/drizzle/0001` through `0006`) ✅

Row-Level Security is implemented at the database level with session GUCs set per-request via `withRls()` — an advanced and correct pattern. Raw SQL only appears where unavoidable (setting Postgres `SET LOCAL` config for RLS sessions).

One non-obvious schema constraint: `globalRoles` has `unique("global_roles_role_unique").on(table.role)` which enforces only one user per global role system-wide (one DIRECTOR, one SYSTEM_ADMINISTRATOR). This may be intentional but will surprise future maintainers.

**Recommendations:**

1. Document the one-user-per-global-role constraint in a comment on the `globalRoles` table definition, since it's a non-obvious business rule.
2. The initial schema was applied via `db:setup` (not drizzle-kit `generate`). Add a note clarifying this in the database tooling section of the README to prevent confusion when the migration journal starts at `0001`.

---

### 7. Backend Design Patterns

**Status:** ⚠️ Concerns

The backend has a clear two-layer separation: `routes/` (thin Elysia handlers) and `services/` (all business logic and DB access). Routes only parse request params and delegate:
```ts
// apps/server/src/routes/articles.ts
.get("/api/newspapers/:newspaper_id/articles",
    ({ params, query, withDb }) =>
        withDb((tx) => articleService.listArticles(tx, params.newspaper_id, query)))
```
No DB calls appear in route files ✅. The `withDb` pattern cleanly injects RLS-scoped transactions.

The concern is **service file size**:
- `apps/server/src/services/articles.ts` — **1,057 lines**
- `apps/server/src/services/admin.ts` — **824 lines**
- `apps/server/src/services/auth.ts` — **359 lines**

`articles.ts` spans the entire article lifecycle: CRUD, submission, editorial review, approval workflow, scheduling, publishing, image upload, and subscriber-only toggling. These distinct sub-domains are loosely coupled and could be separated.

**Recommendations:**

1. Split `apps/server/src/services/articles.ts` into at least two files: `articleContent.ts` (CRUD: create, read, update, delete) and `articleWorkflow.ts` (submit, assign-editor, review, approve, schedule, publish).
2. Extract `uploadArticleImage` and `deleteArticleImage` into a dedicated `articleImages.ts` service, as image handling has distinct infrastructure concerns (MinIO).
3. Apply the same split to `apps/server/src/services/admin.ts` — user-role management, newspaper config, and global user operations are distinct sub-domains within that single file.

---

### 8. Auth

**Status:** ✅ Good

The project uses `@elysiajs/jwt` (a framework-level JWT integration, not raw `jsonwebtoken`) and `Bun.password` for argon2 hashing — no hand-rolled crypto. JWT tokens include a `jti` claim and a Redis blocklist (`isJtiBlocklisted`) so logout genuinely invalidates tokens:

```ts
// apps/server/src/middleware/auth.ts
if (payload.jti && (await isJtiBlocklisted(payload.jti as string))) return anonymous;
```

The auth middleware derives `user`, `roles`, and a `withDb` RLS context for every request. Role enforcement is layered: `requireAuth` → `requireRole(role)` → RLS policies at the database level. Password reset flows use short-lived JWT tokens with separate expiry (`JWT_EXPIRATION.passwordReset`). Authorization (not just authentication) is present — service methods check ownership and roles before mutations.

**Recommendations:**

1. Email verification tokens and password-reset tokens share the same JWT secret as session tokens. The code checks `type` claims to distinguish them (`apps/server/src/services/auth.ts:191`), but consider making this check more explicit and adding a test that a session token cannot be used as a password-reset token.

---

### 9. Testing

**Status:** ✅ Good

29 test files with no skipped or todo tests. The suite splits into:

**Unit/Integration (14 files in `apps/server/tests/`):**
- `tests/rls/policies.test.ts` — real database tests for RLS policies (cross-newspaper isolation, role-based visibility). These are the most valuable tests in the project.
- `tests/schemas/*.test.ts` — TypeBox schema validation tests for all major input types (admin, articles, auth, categories, comments, subscriptions, users)
- `tests/utils/` — audit, logger, storage, email utility coverage
- `tests/seeds/e2e-users.test.ts` — seed script verification

**End-to-end (15 files via Playwright):**
Full workflow coverage: login, registration, article creation/editing, approval workflow, rejection workflow, subscription workflow, admin role management, comments, likes, and profile editing.

Tests run with `bun test` (configured via `package.json` "test" script). E2e tests use `process.env.TEST_*` variables with a committed `.env.example`.

**Recommendations:**

1. The RLS tests hit a real database. Add a note to the CI/README confirming these require the `db` Docker service to be running (`docker compose up db -d`).
2. Consider adding service-level integration tests for the article workflow state machine (submit → assign-editor → review → approve → publish) to complement e2e tests — currently only RLS policies have dedicated integration tests; the workflow business rules are only exercised end-to-end.

---

### 10. Logging & Monitoring

**Status:** ✅ Good

A structured JSON logger is implemented in `apps/server/src/utils/logger.ts` — not a third-party library, but a clean custom implementation with level filtering, NDJSON output, and optional file mirroring:

```ts
// apps/server/src/utils/logger.ts
const line = JSON.stringify({ level, timestamp: new Date().toISOString(), message, ...meta });
```

`LOG_LEVEL` and `LOG_FILE` environment variables allow production tuning without code changes. The logger is used throughout services (`logger.info`, `logger.warn`, `logger.error`). No sensitive values (passwords, tokens, secrets) appear in any log call.

48 `console.log` calls appear in non-test source, but the majority are in seed scripts and the build pipeline — acceptable CLI output contexts. The logger itself uses `console.log(line)` for non-error levels (one call, intentional).

**Recommendations:**

1. Replace `console.log("🚀 Server running...")` in `apps/web/src/index.ts:42` with `logger.info(...)` for consistency with the backend's startup logging.
2. The frontend currently has no error logging. Consider adding `console.error` calls in the empty catch blocks identified in the Error Handling section.

---

### 11. Error Handling

**Status:** ✅ Good

The backend has a typed `HttpError` hierarchy (`apps/server/src/errors/index.ts`): `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `UnprocessableError`. A global `onError` handler in `apps/server/src/server.ts` catches all `HttpError` instances and returns the correct status code with a structured JSON body. Unhandled errors return 500 with full logging.

Frontend error handling is generally good — TanStack Query mutations use `onError` callbacks that display toast notifications:
```tsx
// apps/web/src/pages/dashboard/EditorialQueueSection.tsx:78
onError: () => toast({ title: "Error", description: "Failed to assign editor.", variant: "error" })
```

However, two silent swallow patterns exist:

```tsx
// apps/web/src/pages/director/ApprovalQueue.tsx:33
} catch {
  /* empty */
}

// apps/web/src/pages/CategoryPage.tsx (inside useEffect)
.catch(() => {});
```

The `ApprovalQueue.tsx` empty catch wraps an initial data load — if it fails, the user sees a loading spinner that never resolves with no error message.

**Recommendations:**

1. Replace the empty catch in `apps/web/src/pages/director/ApprovalQueue.tsx:33` with an error state: `setError("Failed to load queue.")` rendered in the UI.
2. Replace `.catch(() => {})` in `apps/web/src/pages/CategoryPage.tsx` with a proper error state so users are not left with a blank category page.

---

### 12. Security

**Status:** ✅ Good

**CORS:** Explicitly configured with the `FRONTEND_URL` environment variable — no wildcard:
```ts
// apps/server/src/server.ts:37
origin: process.env.FRONTEND_URL ?? "http://localhost:5173"
```

**Secrets:** No API keys, database passwords, or JWT secrets hardcoded in source. `.env` is gitignored.

**SQL injection:** All queries use Drizzle ORM's parameterised query builder. The only raw SQL is for setting Postgres session variables via `set_config()` with parameterised values (not string interpolation).

**Additional security measures:** JTI blocklisting on logout, argon2 password hashing, RLS at database level, email verification required before login.

**Recommendations:**

1. The `FRONTEND_URL` fallback to `http://localhost:5173` would be a security misconfiguration in production (allowing localhost CORS). Add a startup assertion similar to the existing `DATABASE_URL` check: if `NODE_ENV === "production"` and `FRONTEND_URL` is not explicitly set, refuse to start.

---

### 13. Forms

**Status:** ❌ Issues

No form library (React Hook Form, TanStack Form, Formik) is present. All forms are hand-rolled with `useState` + manual `handleSubmit`. Zod is listed in `package.json` but no `z.object` calls appear in frontend code — it is used only on the backend.

The anti-pattern: form-as-useState. `useState` call counts per form component:

| File | useState calls |
|------|---------------|
| `apps/web/src/pages/ArticleEditorPage.tsx` | 18 |
| `apps/web/src/pages/profile/ProfileInfoCard.tsx` | 12 |
| `apps/web/src/pages/SignUpPage.tsx` | 10 |
| `apps/web/src/pages/profile/PasswordCard.tsx` | 7 |

`ProfileInfoCard.tsx` has 12 `useState` calls managing a single form: `firstName`, `lastName`, `username`, `bio`, `avatarUrl`, `saving`, `success`, `error`, `fieldErrors`, `avatarUploading`, `avatarError`. This is precisely what React Hook Form's `formState` and `useForm` replace.

Client-side validation is manual and inconsistent. `SignUpPage.tsx` manually parses response status codes to set field errors; other forms have no client-side validation at all. Error messages are sometimes shown, sometimes silently ignored.

**Recommendations:**

1. Adopt React Hook Form + Zod resolvers (`@hookform/resolvers/zod`) for all form components. Start with the highest-complexity forms: `ProfileInfoCard.tsx`, `SignUpPage.tsx`, `PasswordCard.tsx`, `ArticleEditorPage.tsx`.
2. Define Zod schemas for registration, login, profile update, and article create/edit. These can reuse or mirror the TypeBox schemas already defined on the backend, reducing duplication of validation logic.
3. Replace scattered `useState` error state (`fieldErrors`, `error`, `success`, `saving`) with React Hook Form's `formState.errors`, `formState.isSubmitting`, and `formState.isSubmitSuccessful`.

---

### 14. Frontend Structure

**Status:** ⚠️ Concerns

The project uses React Router v7 in `BrowserRouter` mode (`apps/web/src/frontend.tsx`). This means no route-level loader functions — all data fetching happens inside component bodies.

**God components** — the two largest page files mix data fetching, state management, and rendering:

- `apps/web/src/pages/ArticleEditorPage.tsx` — **573 lines**, 18 useState calls. Handles article CRUD via raw fetch, image upload (with its own upload-state tracking), Lexical rich-text editor integration, category selection, keyword management, and scheduling. Each sub-concern is inlined rather than delegated.

- `apps/web/src/pages/ArticlePage.tsx` — **438 lines**, 10 useState calls. Handles full article display, comment submission, like toggling, subscriber paywall logic, and view tracking — all in a single component.

**Custom hooks** — only 4 exist (`useArticleViewTracker`, `useCategory`, `useNewspaper`, `useTheme`). Given ~15 pages perform data fetching, the absence of purpose-built query hooks means duplicated fetching logic across components.

**Mixed data-fetching approach** is the core structural issue: `EditorialQueueSection` uses React Query with cache invalidation; `NewspaperHomepage`, `CategoryPage`, `AuthorPage`, `Navbar`, and `Sidebar` use raw `useEffect + fetch`. This inconsistency makes the codebase difficult to reason about uniformly.

**Recommendations:**

1. Break `ArticleEditorPage.tsx` into sub-components: `ArticleForm` (title/perex/content/category/keywords), `ImageUploadSection`, and `PublishControls` (scheduling/submission). Extract an `useArticleEditor` hook to own save/submit/delete mutations.
2. Extract the comment form in `ArticlePage.tsx` into a `CommentForm` component and the like button into a `LikeButton` component, each owning their own TanStack Query mutations.
3. Create a `useCurrentUser` hook backed by React Query, shared between `Sidebar.tsx` and `Navbar.tsx`, to eliminate the duplicate `/api/users/me` fetches.
4. Adopt React Query consistently for all data fetching. The `QueryClientProvider` and `queryClient` are already configured — migrate the remaining `useEffect + fetch` patterns to `useQuery`.
