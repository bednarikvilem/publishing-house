# Project Review: pb138 — Newspaper Platform

**Date:** 2026-06-06

---

## Project Orientation

The project is a Bun-based monorepo managed by Turborepo with two applications: an Elysia backend (`apps/server`) and a React 19 frontend (`apps/web`), sharing types via a `packages/shared` workspace. The backend uses Drizzle ORM over PostgreSQL 17 with Row-Level Security policies for data access control, Redis for JWT blocklisting, and MinIO (S3-compatible) for image storage. The frontend uses React Router v7 (not TanStack Router), TailwindCSS v4, and a custom component layer over `@base-ui/react` primitives (shadcn-style). The server is structured cleanly into `routes/`, `services/`, and `schemas/` layers. Testing is two-pronged: `bun test` for unit/integration (including RLS policy tests against a real DB) and Playwright for e2e flows. The infrastructure is fully Dockerised with a `docker-compose.yml` covering all services.

---

## Review Summary

| Category              | Status |
| --------------------- | ------ |
| Component Library     | ✅ Good |
| Styling               | ⚠️ Concerns |
| Loading Data          | ❌ Issues |
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

**Status:** ✅ Good

The project uses `@base-ui/react` as its headless primitive layer and wraps it in a local shadcn-style component directory at `apps/web/src/components/ui/`. All major interactive elements — buttons, inputs, selects, dialogs, textareas, tables, badges, and toasts — are routed through these wrappers. For example, `apps/web/src/components/ui/button.tsx` wraps `Button` from `@base-ui/react/button`, and `apps/web/src/components/ui/select.tsx` wraps `@base-ui/react/select`.

The grep for raw `<button>`, `<input>`, `<select>`, and `<textarea>` turned up only four results:

- `apps/web/src/components/RichTextEditor.tsx:204` — `<input type="file">` for image uploads
- `apps/web/src/pages/ArticleEditorPage.tsx:171` — `<input type="file">` for cover image upload
- `apps/web/src/pages/profile/ProfileInfoCard.tsx:161` — `<input type="file">` for avatar upload
- `apps/web/src/components/ui/textarea.tsx:7` — the library wrapper itself

All three raw inputs are `type="file"` elements, for which `@base-ui/react` has no dedicated wrapper. This is an acceptable exception.

**Recommendations:**

1. No action required. The `type="file"` carve-out is intentional and correctly scoped.

---

### 2. Styling

**Status:** ⚠️ Concerns

The project uses TailwindCSS v4 and avoids BEM CSS. Two concerns were found:

**Repeated inline `fontFamily` style:** The string `style={{ fontFamily: "Outfit, Inter, sans-serif" }}` appears verbatim in at least seven places across unrelated components:

- `apps/web/src/components/PortalLayout.tsx:22`, `:50`, `:88`
- `apps/web/src/components/AuthCard.tsx:14`
- `apps/web/src/pages/profile/ProfileInfoCard.tsx:132`
- `apps/web/src/pages/profile/DangerZoneCard.tsx:8`
- `apps/web/src/pages/profile/PasswordCard.tsx:65`
- `apps/web/src/pages/UserProfilePage.tsx:42`

This is copy-pasted inline styling that should be a CSS variable or a Tailwind `font-sans` configuration pointing to the loaded `@fontsource-variable/inter`.

**Tailwind arbitrary px values:** The Navbar alone (`apps/web/src/components/Navbar.tsx`) contains over 25 uses of arbitrary pixel values like `text-[14px]`, `text-[13px]`, `text-[22px]`, `text-[12px]`, and `text-[15px]`. Tailwind's built-in type-scale (`text-sm`, `text-base`, `text-lg`) exists precisely to prevent this proliferation. Arbitrary values are appropriate for truly one-off measurements, not for a font-size system.

The data-driven inline styles (progress bar widths, chart heights) in the stats components are legitimate uses of `style={{}}` and are not a concern.

**Recommendations:**

1. Remove all `style={{ fontFamily: "Outfit, Inter, sans-serif" }}` instances. Instead, set `Outfit` as the default `fontFamily.sans` in your Tailwind config and rely on `font-sans` in the base `<html>` or `<body>` element.
2. Replace arbitrary `text-[14px]` / `text-[13px]` / etc. in `Navbar.tsx` and other files with Tailwind semantic scale classes (`text-xs`, `text-sm`, `text-base`). Define a project font-size convention and stick to it.

---

### 3. Loading Data

**Status:** ❌ Issues

`@tanstack/react-query` v5 is installed and a `QueryClientProvider` wraps the app in `apps/web/src/frontend.tsx`. However, it is used in only a handful of places while the majority of the codebase performs data fetching with raw `fetch` + `useEffect` + `useState` — exactly the pattern TanStack Query is designed to replace.

Pages using TanStack Query correctly:
- `apps/web/src/hooks/useNewspaper.ts` — `useQuery`
- `apps/web/src/hooks/useCategory.ts` — `useQuery`
- `apps/web/src/components/Navbar.tsx` — `useQuery` for categories
- `apps/web/src/pages/dashboard/EditorialQueueSection.tsx` — `useQuery` + `useMutation`

Pages bypassing it with raw `fetch`:
- `apps/web/src/pages/ArticleEditorPage.tsx:252, 260, 276` — three separate `fetch` calls inside `useEffect`
- `apps/web/src/pages/AuthorPage.tsx:48` — `fetch` + `useState`
- `apps/web/src/components/Sidebar.tsx:243` — `fetch` + `useState`
- `apps/web/src/pages/AdminDashboardPage.tsx:18, 29` — two `fetch` calls with manual state
- `apps/web/src/pages/DirectorDashboardPage.tsx:25, 36` — same pattern
- `apps/web/src/pages/NewspaperHomepage.tsx:18` — raw `fetch`
- `apps/web/src/pages/SearchResultsPage.tsx` — raw `fetch`
- `apps/web/src/components/StatisticsSection.tsx:37` — raw `fetch`

This means most pages lack automatic deduplication, background refresh, cache invalidation, and loading/error state management that TanStack Query provides.

**Recommendations:**

1. Convert all `useEffect + fetch + setState` patterns to `useQuery`. Each data-loading concern should become a query with a stable array key (e.g., `["articles", newspaperId, page]`).
2. Convert mutation side-effects (form submits, POST/DELETE actions) to `useMutation` with `onSuccess: () => queryClient.invalidateQueries(...)` so related queries refresh automatically. `EditorialQueueSection.tsx` already demonstrates this pattern — apply it everywhere.
3. Move repeated fetch logic (e.g., `fetch('/api/users/me')` called in Navbar, Sidebar, AdminDashboardPage, DirectorDashboardPage) into a single shared `useCurrentUser()` hook backed by a `useQuery`. TanStack Query will deduplicate the network request.

---

### 4. Environment Variables

**Status:** ✅ Good

`.env` is listed in `.gitignore`. A committed `.env.example` file at the project root documents all required variables with placeholder values. No hardcoded connection strings were found in application code. The only hardcoded URL in source is `"http://localhost:9000/pb138-images/profiles/e2e-placeholder.webp"` inside the e2e seed script (`apps/server/src/db/seeds/seedE2eUsers.ts:61`), which is test data and acceptable.

All infrastructure credentials (MinIO, SMTP, Redis, DB) are accessed through `process.env` in the server, and the server explicitly validates required secrets at startup — `DATABASE_URL` and `JWT_SECRET` cause `process.exit(1)` if missing (`apps/server/src/server.ts:22-32`). The Bun frontend accesses `API_BASE_URL` from the environment correctly.

**Recommendations:**

1. No critical action required.
2. Consider adding a startup-time validation for `MINIO_*` and `SMTP_*` variables similar to the existing JWT_SECRET check, to fail fast rather than discovering the misconfiguration on the first upload or email.

---

### 5. REST API Design

**Status:** ✅ Good

Routes are resource-oriented with plural nouns and consistent nesting under `/api/newspapers/:newspaper_id`. No verb-in-path anti-patterns were found. HTTP verbs are used correctly: GET for reads, POST for creates, PATCH for partial updates, PUT for full replacement (categories), DELETE for removal.

Status codes are semantically correct:
- `set.status = 201` on POST create for articles (`apps/server/src/routes/articles.ts:77`) and categories (`apps/server/src/routes/categories.ts:30`), and image uploads (`apps/server/src/routes/articles.ts:121`)
- `set.status = 204` with `return null` on DELETE for articles and images

The article state-machine actions (`/submit`, `/assign-editor`, `/review`, `/approve`, `/schedule`, `/publish`) are modelled as sub-resources on POST, which is a reasonable RESTful convention for workflow transitions.

Request and response shapes are validated with TypeBox (`@sinclair/typebox`) schemas in the `apps/server/src/schemas/` directory, and Elysia wires them automatically.

One minor note: `PUT /api/newspapers/:newspaper_id/categories/:category_id` accepts `{ name, slug? }` which is a full category replacement — semantically correct for PUT.

**Recommendations:**

1. The `/api` root handler (`apps/server/src/server.ts:77-92`) performs a DB query and returns newspaper data. This mixes a debug/health endpoint with data retrieval. Consider separating this: keep `/health` as a pure liveness check and remove the DB query from it, or document the route as intentionally informational.
2. Action sub-resource routes (`/submit`, `/review`, `/approve`) currently return 200 with a status payload. Consider whether 200 is the right code for state transitions that don't produce a new resource — it is acceptable, but some APIs use 204 for pure state changes with no body to return.

---

### 6. Database

**Status:** ✅ Good

The schema (`apps/server/src/db/schema.ts`) is well-structured with UUIDs as primary keys throughout, proper foreign key references, cascade deletes on dependent records (comments, likes, article reviews all cascade from articles), and domain-appropriate constraints. Unique indexes enforce data integrity: `email_newspaper_idx` ensures no email collision per newspaper, and `article_category_slug_newspaper_unique` prevents duplicate category slugs within a newspaper.

Images are stored in MinIO (S3-compatible) with only the URL persisted in the `article_images.url` column — no blobs in the database. Profile pictures follow the same pattern.

Migration management is handled with Drizzle Kit: 6 SQL migration files under `apps/server/drizzle/` tracked by `_journal.json`. Non-trivial migrations (RLS policies, roles) are hand-authored SQL files, which is the correct approach for things Drizzle cannot generate.

Raw SQL is limited to the RLS setup script (`db-setup.ts`) and the `rls.ts` helper, which set PostgreSQL session GUCs (`app.user_id`, `app.newspaper_id`, `app.roles`). Application queries exclusively use Drizzle's query builder.

One design decision worth noting: `global_roles` has a unique constraint on `role` alone (`unique("global_roles_role_unique").on(table.role)`), meaning only one person can hold the `DIRECTOR` role globally at a time. This is clearly intentional but worth documenting as a domain invariant.

**Recommendations:**

1. Document the single-Director constraint as a comment in `schema.ts` or in the relevant use-case specification — it is a non-obvious invariant that will surprise future maintainers.
2. Consider adding `updated_at` timestamps to the `articles` and `users` tables for auditability and cache-busting purposes.

---

### 7. BE Design Patterns

**Status:** ✅ Good

The backend follows a clean two-layer separation: thin route handlers that validate and dispatch, and service functions that contain all business logic. Routes in `apps/server/src/routes/` import only from `../schemas/` and `../services/` — no direct DB imports. All Drizzle queries live in `apps/server/src/services/`.

The `withDb` pattern (exposed from `authMiddleware`) passes a transaction-aware function through to services, enabling RLS session setup before any query runs. This is architecturally sound.

The `apps/server/src/errors/` module defines a typed error hierarchy (`BadRequestError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, etc.) used consistently across services, and the global `onError` handler in `server.ts` converts them to the correct HTTP response automatically.

**Size concern:** `apps/server/src/services/articles.ts` is 1057 lines and `apps/server/src/services/admin.ts` is 824 lines. These are above the 300-line guideline for backend services. `articles.ts` handles article CRUD, state machine transitions, image management, submission, review, approval, scheduling, and publication — at least four distinct concerns that could be split into `articleQueries.ts`, `articleCommands.ts`, `articleWorkflow.ts`, and `articleImages.ts`.

One minor exception: `apps/server/src/server.ts:79` performs a direct `db.select()` from newspapers in the `/api` info handler, bypassing the service layer. This is a one-off for an informational route and is not a systemic concern.

**Recommendations:**

1. Split `apps/server/src/services/articles.ts` into at least two files — one for query/listing functions (read-side) and one for write operations and state machine transitions. This reduces cognitive load when navigating the file.
2. Similarly, `apps/server/src/services/admin.ts` (824 lines) handles user management, role assignment, newspaper configuration, and global settings. Consider splitting into `adminUsers.ts` and `adminNewspapers.ts`.

---

### 8. Auth

**Status:** ✅ Good

Authentication uses `@elysiajs/jwt` and `@elysiajs/bearer` for JWT issuance and extraction. Passwords are hashed with `Bun.password` (argon2 under the hood) — no raw bcrypt or manual `jsonwebtoken` calls. JWTs are short-lived (2h session, configurable in `apps/server/src/utils/jwt.ts`) and a Redis-backed blocklist supports logout by JTI (`apps/server/src/utils/redis.ts`, `middleware/auth.ts:22`).

The auth middleware (`apps/server/src/middleware/auth.ts`) hydrates `user`, `roles`, and a `withDb` closure (carrying the RLS session) on every request. Unauthenticated requests get `user: null` and an anonymous RLS session — the RLS policies then enforce data visibility at the database level. Application-level role checks (`requireAuth`, `requireRole`) and service-level ownership checks (`isOwner && !isAdmin` in `articles.ts:568-569`) layer on top of this.

Additional security features: email verification before login is permitted, password reset via signed tokens, and audit logging for role changes and other admin actions.

**Recommendations:**

1. The JWT payload includes `newspaperId` scoped to the specific newspaper the user logged in through. Verify that SYSTEM_ADMINISTRATOR and DIRECTOR users who need cross-newspaper access are covered by the `globalRoles` path in the middleware — this appears correct but is worth a unit test that asserts a DIRECTOR token can access multiple newspapers' data.
2. The `jwt.verify` result is trusted for role extraction at login but roles are re-fetched from DB on every request (`middleware/auth.ts:40-55`). This is correct and safe — document this as intentional in the middleware so a future developer does not "optimise" it away.

---

### 9. Testing

**Status:** ✅ Good

29 test files cover two distinct layers. Unit/integration tests (`apps/server/tests/`) test schema validation, utility functions (logger, storage, audit, email), and RLS policies against a real database. E2e tests (`tests/e2e/`) use Playwright to test complete user flows: registration, login, article creation, the full article approval workflow (author → editor review → manager approval → director approval → publication), article rejection, admin role management, comments, likes, profile editing, and subscription activation.

No skipped or TODO tests were found. The RLS policy tests (`apps/server/tests/rls/policies.test.ts`) are particularly strong — they instantiate sessions for different role/newspaper combinations and assert the exact article IDs visible to each, verifying the security boundary at the DB layer.

The Playwright e2e suite covers the critical happy paths and several rejection/edge-case flows (`article-rejection-workflow.spec.ts`). Tests are organised by actor (visitor, registered-user, author, admin) matching the domain model.

**Recommendations:**

1. The unit tests currently cover schemas, utilities, and RLS. Consider adding service-level unit tests for the article state machine (e.g., asserting that a DRAFT cannot be approved directly, that a SUBMITTED article cannot be scheduled before publication approval). This would complement the e2e tests with faster, more targeted coverage.
2. The `tests/.env.example` contains different placeholder values than the root `.env.example` (different `TEST_EMAIL`, `TEST_PASSWORD`). Consolidate to avoid confusion — the e2e tests should use the same seeded credentials documented in the root README.

---

### 10. Logging & Monitoring

**Status:** ✅ Good

The project ships a custom structured logger at `apps/server/src/utils/logger.ts`. It emits newline-delimited JSON with `level`, `timestamp`, `message`, and arbitrary metadata fields. Log level is controlled by the `LOG_LEVEL` environment variable (defaulting to `debug` in non-production, `info` in production). An optional `LOG_FILE` variable mirrors every line to a file, with a silent catch around the file write so a disk failure cannot crash the process.

The logger is used throughout the server for meaningful events: server startup, subscription confirmation, notification failures, DB query failures in the health endpoint, and unhandled errors. No sensitive data (passwords, tokens) appears in any log statement.

The 48 `console.log` calls counted in non-test source are almost entirely in seed scripts (`seedUsers.ts`, `seedArticles.ts`, `seedComments.ts`, etc.) and the frontend build script (`apps/web/build.ts`). The server application code uses `logger` exclusively. The one exception is `apps/web/src/index.ts:42` which logs the startup URL — acceptable for a dev server.

**Recommendations:**

1. No critical issues. For production readiness, consider adding request-level logging (method, path, status, duration) as an Elysia `onRequest`/`afterResponse` hook, to get an HTTP access log without instrumenting every route handler.

---

### 11. Error Handling

**Status:** ⚠️ Concerns

**Backend — strong:** The `HttpError` hierarchy (`apps/server/src/errors/index.ts`) with `BadRequestError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, and `UnprocessableError` covers the standard HTTP error space. The global `onError` handler in `server.ts:94-118` catches both `HttpError` (returning the structured `{ error: code, ...details }` response at the correct status) and unexpected errors (logging and returning 500). Auth middleware returns 401/403 with JSON bodies correctly.

**Frontend — mixed:**

The majority of frontend error handling is done with manual `catch` blocks setting local `error` state, which is workable but inconsistent. The more serious concern is a silent catch in `apps/web/src/pages/director/ApprovalQueue.tsx:33-34`:

```tsx
} catch {
  /* empty */
}
```

This swallows any error from the initial data fetch, leaving the user with no indication that loading failed. The same file correctly shows a toast on submission errors (line 57), making the inconsistency more visible.

There are no React `ErrorBoundary` components at the route level. If a rendering error occurs in a page component, it will bubble to the app root and produce a blank screen. Only the Lexical rich-text editor uses an `ErrorBoundary` (`LexicalErrorBoundary`).

**Recommendations:**

1. Fix the empty catch block in `apps/web/src/pages/director/ApprovalQueue.tsx:33`: set an error state and render a user-visible error message (an `<ErrorState />` component already exists at `apps/web/src/components/ErrorState.tsx`).
2. Add a route-level React `ErrorBoundary` in `apps/web/src/frontend.tsx` (or wrapping each `<Route>`) to prevent a component rendering error from blanking the entire app. React 19 supports `<ErrorBoundary fallback={...}>`.
3. Migrate fetch-based error handling to `useQuery` `isError` states (covered in Category 3), which eliminates most of the manual catch boilerplate.

---

### 12. Security

**Status:** ✅ Good

CORS is configured explicitly in `apps/server/src/server.ts:36-41` using `process.env.FRONTEND_URL` — no wildcard origin. Allowed methods and headers are enumerated. No hardcoded API keys, tokens, or passwords were found in source code. The database is exclusively accessed through Drizzle's query builder — no string-interpolated SQL templates in application code (the setup scripts use tagged template literals via `bun:postgres` which are parameterised and injection-safe).

`.gitignore` covers `.env` and its variants. JWT secrets are validated at startup. The PostgreSQL RLS layer provides defence-in-depth so even a service-level access control bypass cannot expose other users' data through the DB connection.

The `db-setup.ts` and `rls.ts` scripts use tagged `sql\`` template literals from `bun:postgres`, which are parameterised. The literal SQL migration files contain no dynamic content.

**Recommendations:**

1. Verify that the MinIO bucket ACL is configured to block public write access. The `minio-init` container sets the bucket to public for reads, which is intentional for serving images — confirm that write access requires credentials.
2. Consider adding a `Content-Security-Policy` header in the frontend server (`apps/web/src/index.ts`) to guard against XSS in the Lexical editor content.

---

### 13. Forms

**Status:** ❌ Issues

No form library is present in `apps/web/package.json`. Zod is listed as a workspace override but is not used in any frontend form component. All forms are implemented as multiple `useState` hooks with manual submit handlers and manual error-setting — the classic form-as-useState anti-pattern.

Severity by file:

| File | useState count | Pattern |
|---|---|---|
| `apps/web/src/pages/ArticleEditorPage.tsx` | 18 | Title, perex, content, category, keywords, images, upload state, error, loading, saving, etc. |
| `apps/web/src/pages/profile/ProfileInfoCard.tsx` | 12 | Username, fullName, bio, avatar URL, loading, saving, error, etc. |
| `apps/web/src/pages/SignUpPage.tsx` | 10 | Email, username, password, fullName, loading, error, success, etc. |
| `apps/web/src/pages/profile/PasswordCard.tsx` | 7 | Current/new/confirm password, loading, error, etc. |
| `apps/web/src/pages/LoginPage.tsx` | 5 | Email, password, loading, error |

None of these forms validate field-level constraints before submission (e.g., password length, email format, username pattern). Validation only occurs after a server round-trip. The backend TypeBox schemas define constraints (e.g., `username: t.String({ minLength: 3, maxLength: 63, pattern: "^[A-Za-z0-9_]+$" })`) but these are never surfaced to the user in real-time.

**Recommendations:**

1. Adopt **React Hook Form** (`react-hook-form`) with **Zod** resolver (`@hookform/resolvers/zod`) for all forms. This eliminates the multi-useState pattern and provides declarative field registration, validation, and error display.
2. Mirror the backend TypeBox schemas as Zod schemas on the frontend so that client-side validation matches server-side validation. This prevents a round-trip to discover a constraint violation the client could catch immediately.
3. Start with the highest-impact forms: `SignUpPage.tsx` and `ProfileInfoCard.tsx`. Replace the state cluster with `useForm<z.infer<typeof schema>>()` and `register()`/`Controller` field wiring.
4. For the `ArticleEditorPage.tsx`, the article content (Lexical editor state) is inherently outside a standard form library's scope — keep that as local state. But the metadata fields (title, perex, category, keywords) can and should be managed through React Hook Form.

---

### 14. Frontend Structure

**Status:** ⚠️ Concerns

The project uses React Router v7 (not TanStack Router), so route-level loaders are not an available pattern. All data fetching happens inside component bodies.

**God component concern:** Two page files significantly exceed the size guideline:

- `apps/web/src/pages/ArticleEditorPage.tsx` — **573 lines**: mixes article data loading (3 separate `useEffect`/`fetch` calls), image upload handlers, save/submit/delete mutation handlers, an inline `EditorSidebar` sub-component definition, and the main editor layout. Despite the `EditorSidebar` extraction, the parent component is still carrying too much.
- `apps/web/src/pages/ArticlePage.tsx` — **438 lines**: combines article data loading, view tracking, comment submission, like toggling, access control rendering (subscription paywall, login prompt), and the Lexical read-only renderer in one file.

**Custom hooks:** Only 4 custom hooks exist for the entire frontend: `useArticleViewTracker`, `useCategory`, `useNewspaper`, `useTheme`. Given the number of repeated fetch+state patterns across pages, there should be many more: `useCurrentUser`, `useArticle`, `useArticlesList`, `useComments`, etc.

**Pages without decomposition:** Several pages above 200 lines contain inline fetch logic, transformation, and rendering without extracting sub-components or hooks. `apps/web/src/pages/admin/GlobalUsersSection.tsx` (209 lines) and `apps/web/src/pages/admin/NewspaperUsersSection.tsx` (207 lines) each perform their own fetch-on-mount, manage their own error state, and render a full CRUD table inline.

**Recommendations:**

1. Extract a `useArticle(articleId, newspaperId)` hook that encapsulates the fetch, loading, and error state for `ArticlePage.tsx`. The component should only receive data and event handlers as props or hook returns — not manage the fetch lifecycle directly.
2. Decompose `ArticleEditorPage.tsx`: move the three `useEffect` data fetches into dedicated hooks (`useArticleEditor`, `useEditorCategories`). The component body should orchestrate hooks and render, not contain fetch logic.
3. For admin sections, create a shared `useUsers(newspaperId?)` hook and an `AdminUserTable` component, then use them in both `GlobalUsersSection` and `NewspaperUsersSection` rather than duplicating the fetch-render pattern.
4. Once `useQuery` migration (Category 3) is complete, most of the bespoke hooks will reduce to thin `useQuery` wrappers — start with that migration and the decomposition follows naturally.
