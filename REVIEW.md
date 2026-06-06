# Project Review: pb138

**Date:** 2026-06-06

---

## Project Orientation

The project is a monorepo (Turborepo + Bun workspaces) containing three packages: `apps/server` (Elysia backend), `apps/web` (React 19 + React Router DOM v7 frontend), and a shared `packages/shared` types package, with a separate `tests/` workspace running Playwright e2e tests. The backend uses Elysia v1.4 with `@elysiajs/jwt`, `@elysiajs/bearer`, Drizzle ORM on PostgreSQL 17, Redis for JWT blocklisting, and MinIO (S3-compatible) for image storage. The frontend uses TailwindCSS v4, Base UI primitives wrapped as shadcn-style components, and the Lexical rich-text editor. Auth is JWT-based with Bun's built-in argon2 (`Bun.password`), and the database enforces Row-Level Security policies that are set per-request via session GUCs. Infrastructure runs in Docker Compose.

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

**Status:** ⚠️ Concerns — library present but inconsistently applied

**Findings:**

`@base-ui/react` is the chosen headless component library, with `shadcn` as the CLI tooling used to scaffold wrapper components. Thin wrappers live in `apps/web/src/components/ui/` — `button.tsx` wraps `ButtonPrimitive`, `input.tsx` wraps `InputPrimitive`, `select.tsx` wraps `SelectPrimitive`, and so on. This is the right approach.

However, these wrappers are used in very few places. `APITester.tsx` imports from `@/components/ui/button`, `@/components/ui/input`, etc., but the bulk of the application — `Navbar.tsx`, `Sidebar.tsx`, `PortalLayout.tsx`, `DecisionForm.tsx`, `Pagination.tsx`, `SignUpPage.tsx`, `SetNewPasswordPage.tsx`, `GlobalLoginPage.tsx` — uses raw `<button>`, `<input>`, and `<textarea>` elements directly:

```
apps/web/src/components/Navbar.tsx:181:   <button
apps/web/src/components/Navbar.tsx:202:   <button
apps/web/src/components/Sidebar.tsx:216:  <button
apps/web/src/pages/SignUpPage.tsx:162:    <button
apps/web/src/pages/SetNewPasswordPage.tsx:133: <button
```

`FormField.tsx` also renders raw `<textarea>` and `<input>` (lines 36 and 43) instead of importing from `components/ui/textarea` and `components/ui/input`, which is self-contradictory.

**Recommendations:**

1. Replace all raw `<button>` elements throughout `Navbar.tsx`, `Sidebar.tsx`, `PortalLayout.tsx`, `Pagination.tsx`, and `DecisionForm.tsx` with the `Button` component from `@/components/ui/button`. This ensures consistent focus styles and accessibility semantics.
2. Update `FormField.tsx` (lines 36 and 43) to use `<Input>` and `<Textarea>` from `components/ui/` rather than raw HTML elements.
3. Audit remaining raw `<select>` tags (e.g., `ArticleEditorPage.tsx:EditorSidebar`) and replace with the `Select` wrapper.

---

### 2. Styling

**Status:** ⚠️ Concerns — arbitrary Tailwind values used frequently instead of theme tokens

**Findings:**

The project uses Tailwind CSS v4 as its sole styling mechanism — no global CSS classes with BEM, no CSS modules in production code (only a `styles/globals.css` for design tokens). One `!important` appears in `apps/web/src/index.css:31` for an animation override, which is reasonable.

Inline `style={{}}` attributes appear in 14 locations. Most are one of two patterns:

1. **Dynamic percentage widths** for bar charts (e.g., `HorizBar.tsx:15 style={{ width: \`${pct}%\` }}`, `Timeline.tsx:25 style={{ height: ... }}`). This is acceptable — Tailwind cannot handle runtime-computed percentages.
2. **Font-family overrides** applied redundantly across multiple components (`AuthCard.tsx:14`, `PortalLayout.tsx:21`, `PortalLayout.tsx:47`, `PortalLayout.tsx:81`, `UserProfilePage.tsx:42`, `DangerZoneCard.tsx:6`, `ProfileInfoCard.tsx:129`, `PasswordCard.tsx:64`):
   ```tsx
   style={{ fontFamily: "Outfit, Inter, sans-serif" }}
   ```
   This is scattered across 8 files and should be centralised in the CSS base layer.

Arbitrary pixel values for font sizes appear throughout: `text-[14px]`, `text-[13px]`, `text-[22px]`, `text-[26px]`, `text-[15px]`, `text-[12px]` in `AuthCard.tsx`, `FormField.tsx`, `Navbar.tsx`, and others. Tailwind ships `text-sm` (14px), `text-xs` (12px), `text-base` (16px), `text-xl`, `text-2xl` — these should be used instead of arbitrary pixel values.

**Recommendations:**

1. Move `fontFamily: "Outfit, Inter, sans-serif"` into `globals.css` as a base-layer rule (e.g., `body { font-family: Outfit, Inter, sans-serif; }`). Remove all 8 inline `style` overrides.
2. Replace arbitrary font-size classes (`text-[14px]`, `text-[13px]`, `text-[12px]`, etc.) with Tailwind's named scale equivalents (`text-sm`, `text-xs`, `text-base`, etc.) or define a custom scale in the Tailwind config.
3. The dynamic percentage `style={{ width }}` usages in chart components are justified; leave them as-is.

---

### 3. Loading Data

**Status:** ❌ Issues — no data fetching library; all fetching done via raw `fetch()` inside components

**Findings:**

Neither TanStack Query nor SWR appears in any `package.json`. Every page and component manages its own data fetching via `useEffect` + `useState` + raw `fetch()`. Representative examples:

```ts
// apps/web/src/pages/CategoryPage.tsx:46
useEffect(() => {
  fetch(`${API_BASE_URL}/api/...`)
    .then(res => { ... })
    .then(data => { setArticles(data.articles); })
}, [slug]);

// apps/web/src/pages/DashboardPage.tsx:37
fetch(`${API_BASE_URL}/api/users/me`, ...)
  .then(res => res.json())
  .then(data => setUserRoles(data.roles ?? []))
```

This pattern is repeated across `UserProfilePage.tsx`, `AuthorPage.tsx`, `DirectorDashboardPage.tsx`, `Navbar.tsx`, `StatisticsSection.tsx`, `PublicationQueue.tsx`, `ReviewQueueSection.tsx`, and `MyArticlesSection.tsx`. Each component independently tracks `loading`, `error`, and data state — resulting in 7–18 `useState` calls per file. There is no shared caching, no cache invalidation after mutations, and no deduplication of identical requests.

**Recommendations:**

1. Install TanStack Query (`@tanstack/react-query`) and wrap the app in a `QueryClientProvider`. This single change removes duplicated loading/error state from every component.
2. Replace each `useEffect + fetch + setState` pattern with `useQuery`. Example:
   ```ts
   const { data, isLoading, error } = useQuery({
     queryKey: ['articles', newspaperId, slug],
     queryFn: () => fetch(`${API_BASE_URL}/api/.../articles`).then(r => r.json()),
   });
   ```
3. Use `useMutation` for write operations (submit article, post comment, etc.) and call `queryClient.invalidateQueries` on success to keep the UI in sync.
4. Use stable array query keys (e.g., `['articles', newspaperId, { page, status }]`) so cache entries are correctly scoped.

---

### 4. Environment Variables

**Status:** ✅ Good

**Findings:**

`.env` is listed in `.gitignore` (confirmed). An `.env.example` file is present at the repo root with all required variables and placeholder values — `POSTGRES_PASSWORD=newspaper`, `JWT_SECRET=newspaper`, `SMTP_USER=your-mailtrap-username`, etc. All server-side configuration is accessed through `process.env.*` or `Bun.env.*`:

```ts
// apps/server/src/server.ts:21
const PORT = Number(process.env.PORT) || 3000;
// apps/server/src/utils/email.ts:5
host: process.env.SMTP_HOST,
```

The only `localhost` references in source code are in seed scripts (`seedE2eUsers.ts:61`) and a dev-only fallback in `server.ts` (`process.env.FRONTEND_URL ?? "http://localhost:5173"`), both appropriate. No hardcoded database connection strings or API secrets were found in non-seed, non-test source files.

**Recommendations:**

1. No immediate action required.
2. Minor: the `tests/.env.example` duplicates some variables from the root `.env.example` with different placeholder values (e.g., `TEST_EMAIL=testuser@example.com` vs the root file's `TEST_EMAIL=emma.bednarikova@email.cz`). Consider consolidating or clearly commenting which values the test runner expects.

---

### 5. REST API Design

**Status:** ✅ Good

**Findings:**

URLs follow resource-oriented conventions throughout: `/api/newspapers/:id/articles`, `/api/newspapers/:id/categories/:id`, `/api/newspapers/:id/users`, etc. No verb-in-path anti-patterns were detected by grep. HTTP verbs are correctly assigned:

- POST for creation, with `set.status = 201` on creates (`articles.ts:74`, `categories.ts:24`, `likes.ts:16`, `auth.ts:21`, `comments.ts:22`)
- DELETE with `set.status = 204` on deletes (`articles.ts:97`, `articles.ts:131`, `categories.ts:45`, `comments.ts:36`)
- PATCH for partial updates: `PATCH /api/newspapers/:id` (color only), `PATCH .../articles/:id` (partial article fields), `PATCH .../articles/:id/subscriber-only` (single flag toggle) — all correct partial-update semantics
- PUT for full-entity replacements: `PUT /api/users/me` (full profile), `PUT /api/admin/config` (full config object) — idempotent and appropriate

Request/response validation uses Elysia's built-in TypeBox wrapper (`t.Object`, `t.String`, `t.Optional`, etc.) in `apps/server/src/schemas/`. All route handlers reference a `body:`, `params:`, and `query:` schema. Error responses map to a well-defined `HttpError` hierarchy: `BadRequestError` → 400, `UnauthorizedError` → 401, `ForbiddenError` → 403, `NotFoundError` → 404, `ConflictError` → 409, `UnprocessableError` → 422.

Query parameters are used correctly for filtering and pagination (e.g., `articlesListQuery`, `articlesSearchQuery`, `articlesMineQuery`).

**Recommendations:**

1. The `POST .../articles/:id/submit`, `POST .../articles/:id/review`, `POST .../articles/:id/approve`, `POST .../articles/:id/publish` action endpoints use POST on sub-resources (e.g., `/submit`, `/review`). This is a reasonable design for state-machine transitions and is widely accepted. No change required, but worth noting in documentation that these are intentional action endpoints, not resource creates.
2. Consider returning `201` from `POST .../articles/:id/submit` (currently returns 200 implicitly) to clearly signal a new resource state was created.

---

### 6. Database

**Status:** ✅ Good

**Findings:**

The schema in `apps/server/src/db/schema.ts` is well-structured. All primary keys use UUIDs (`uuid().primaryKey().defaultRandom()`), foreign keys are declared consistently, and join tables (`userRoles`, `globalRoles`, `newspaperAuthors`, `articleCategory`) use composite primary keys. Unique indexes are explicit (`uniqueIndex("email_newspaper_idx")`, `unique("newspaper_slug_idx")`).

Images are stored in MinIO (S3), with only URL strings persisted in the database — no `bytea`/`blob` columns found. Six numbered SQL migration files exist in `apps/server/drizzle/` (`0001_add_article_views.sql` through `0006_add_subscriptions_rls.sql`), all versioned and tracked in `drizzle/meta/_journal.json`. RLS policies live in `0002_enable_rls.sql` and `0006_add_subscriptions_rls.sql`, hand-written as expected since Drizzle cannot express them.

Raw SQL is limited to three `db.execute(sql\`SELECT set_config(...)\`)` calls in `apps/server/src/db/rls.ts` (lines 17–19), which are necessary for setting session GUCs before each transaction. All other queries go through Drizzle's query builder.

**Recommendations:**

1. The `globalRoles` table has `unique("global_roles_role_unique").on(table.role)` which enforces only one person per global role (e.g., only one SYSTEM_ADMINISTRATOR globally). Verify this is an intentional business constraint and document it — it will cause confusing `ConflictError`s if users attempt to assign a second person to a global role.
2. `apps/server/src/db/migrations/addGlobalEmailUniqueIndex.ts` is a TypeScript migration file sitting outside the `drizzle/` folder and outside the `_journal.json` tracking. Verify it has been applied and is not being silently skipped.

---

### 7. BE Design Patterns

**Status:** ✅ Good

**Findings:**

The backend uses a clear two-layer pattern: `routes/` (thin HTTP handlers) and `services/` (all business logic and DB queries). There are no `*.controller.ts` or `*.repository.ts` files — the `services/` layer directly calls Drizzle, which is appropriate for this project scale.

Route files import only from `schemas/` and `services/`, never from `db/schema` directly:
```ts
// apps/server/src/routes/articles.ts
import * as articleService from "../services/articles";
import { createArticleBody, updateArticleBody, ... } from "../schemas/articles";
```

Services contain all DB calls. `articles.ts` (1,057 lines) and `admin.ts` (824 lines) are large, but this is justified by the complexity of the article state machine and the breadth of admin operations. Multi-step operations use Drizzle transactions (`withRls` wraps every call, which establishes the transaction and sets session GUCs for RLS before any query runs).

Authorization is correctly placed in services (not routes): `ForbiddenError` is thrown in service methods after checking `roles.includes("NEWSPAPER_MANAGER")` etc., and the `requireRole()` middleware in `auth.ts` provides an additional route-level guard.

**Recommendations:**

1. `articles.ts` at 1,057 lines is at the upper boundary for a single service file. Consider extracting article image operations (`uploadArticleImage`, `deleteArticleImage`) into a separate `articleImages.ts` service, and the state-machine transitions (`submitArticle`, `reviewArticle`, `approveArticle`, `scheduleArticle`, `publishArticle`) into an `articleWorkflow.ts` service. This is a quality-of-life refactor, not urgent.
2. The `auth.ts` service (359 lines) handles registration, login, email verification, and password reset — four distinct concerns. Splitting into `auth.ts` (login/logout) and `authVerification.ts` (email/password flows) would improve navigability.

---

### 8. Auth

**Status:** ✅ Good

**Findings:**

The project uses `@elysiajs/jwt` and `@elysiajs/bearer` for token handling — not raw `jsonwebtoken`. Password hashing uses `Bun.password.hash()` and `Bun.password.verify()` (argon2id, built into Bun):

```ts
// apps/server/src/services/auth.ts:71
const passwordHash = await Bun.password.hash(password);
// apps/server/src/services/auth.ts:125
const isPasswordValid = await Bun.password.verify(password, user.passwordHash);
```

JWT tokens include a `jti` claim, and a Redis blocklist (`isJtiBlocklisted`) is checked on every request, enabling proper logout/revocation (`auth.ts middleware:27`).

Authorization is multi-layered: route-level guards via `requireRole()`, service-level role checks (`roles.includes("SYSTEM_ADMINISTRATOR")`), ownership checks (e.g., `comments.ts:92` verifies `comment.userId === user.id || roles.includes("EDITOR")`), and PostgreSQL RLS policies enforced at the database level as a final backstop.

Email verification is required before login. Password-reset tokens use a short expiry defined in `apps/server/src/utils/jwt.ts`.

**Recommendations:**

1. No critical issues. The layered authorization (middleware → service → RLS) is strong.
2. Minor: `process.env.JWT_SECRET!` uses a non-null assertion. Add a startup guard (similar to the existing `DATABASE_URL` check in `server.ts`) to fail fast if `JWT_SECRET` is missing or too short.

---

### 9. Testing

**Status:** ✅ Good

**Findings:**

29 test files are present across two test suites:

**Backend unit/integration tests** (`apps/server/tests/`, run with `bun test`):
- `tests/schemas/` — TypeBox schema validation for all input types (auth, articles, categories, users, subscriptions, comments, admin)
- `tests/utils/` — unit tests for logger, email, storage, and audit utilities
- `tests/rls/policies.test.ts` — integration tests for PostgreSQL RLS policies, verifying that each role sees the correct rows
- `tests/seeds/e2e-users.test.ts` — verifies the e2e seed script produces the expected database state

**End-to-end tests** (`tests/e2e/`, run with Playwright):
- Covers visitor flows (`homepage.spec.ts`, `registration.spec.ts`, `search.spec.ts`)
- Auth flows (`login.spec.ts`)
- Author workflows (`create-article.spec.ts`, `edit-article.spec.ts`, `dashboard.spec.ts`)
- Registered user flows (`article-view.spec.ts`, `comments.spec.ts`, `likes.spec.ts`, `profile.spec.ts`)
- Full article approval and rejection workflows (`article-approval-workflow.spec.ts`, `article-rejection-workflow.spec.ts`)
- Admin role management and subscription workflow

No skipped or `.todo()` tests were found.

**Recommendations:**

1. No frontend component unit tests exist. Consider adding at least smoke tests for key components (`Navbar`, `ArticleCard`, `Pagination`) using `bun test` with a DOM library (e.g., `@testing-library/react`).
2. The RLS policy tests (`policies.test.ts`) are particularly strong — they test cross-newspaper isolation directly at the database layer. This approach is worth highlighting.

---

### 10. Logging & Monitoring

**Status:** ✅ Good

**Findings:**

A hand-rolled structured JSON logger lives in `apps/server/src/utils/logger.ts`. It:
- Emits NDJSON lines (`{ level, timestamp, message, ...meta }`) to stdout
- Routes `error`/`warn` to `console.error` and `info`/`debug` to `console.log`
- Respects a `LOG_LEVEL` environment variable (defaults to `info` in production, `debug` elsewhere)
- Optionally mirrors output to a file via `LOG_FILE` env var with silent failure on write errors

The logger is used consistently across services (`logger.warn`, `logger.error`, `logger.info`), including contextual metadata: `{ userId, roles, articleId }` etc.

The 48 `console.log` calls found are almost entirely in seed scripts (`seedUsers.ts`, `seedLikes.ts`, `seedArticles.ts`), the build script (`build.ts`), and the startup line in `apps/web/src/index.ts:42`. None appear in production route or service code.

No sensitive values (passwords, tokens) are found in log statements.

**Recommendations:**

1. The custom logger is functional, but consider replacing it with `pino` in a future iteration. Pino provides async log transport (avoiding I/O on the request path), child loggers with bound context, and first-class integration with log aggregators. For a student project, the current implementation is entirely acceptable.
2. The web frontend (`apps/web/src/index.ts:42`) emits a startup `console.log` with an emoji. This is fine in development but could be replaced with `logger` for consistency if the frontend server ever runs in a monitored environment.

---

### 11. Error Handling

**Status:** ✅ Good

**Findings:**

The backend has a typed `HttpError` hierarchy defined in `apps/server/src/errors/index.ts`:
- `BadRequestError` → 400
- `UnauthorizedError` → 401
- `ForbiddenError` → 403
- `NotFoundError` → 404
- `ConflictError` → 409
- `UnprocessableError` → 422

A global `.onError()` handler in `server.ts:89` catches all `HttpError` instances and returns the appropriate status code and JSON body. Unhandled errors fall through to a generic 500 handler with structured logging.

Frontend catch blocks are generally meaningful — they set user-visible error state rather than swallowing silently. However, one exception exists in `GlobalUsersSection.tsx`:

```ts
// apps/web/src/pages/admin/GlobalUsersSection.tsx:32
} catch {
  /* empty */
} finally {
  setLoading(false);
}
```

This silently discards fetch errors on the initial data load, leaving the user staring at an empty list with no indication of failure.

All non-trivial forms show error messages to the user. The `alert()` calls in `GlobalUsersSection.tsx:62` and `:79` are functional but not production-quality.

**Recommendations:**

1. Replace the `/* empty */` catch block in `GlobalUsersSection.tsx:32` with at minimum a `setError(...)` call so users see a failure state.
2. Replace `alert("Failed to create global user")` (lines 62, 79) with inline error state that renders in the component, consistent with how other components handle errors.
3. Consider adding a React `ErrorBoundary` at the route level to catch unexpected rendering errors and show a recovery UI rather than a blank page.

---

### 12. Security

**Status:** ✅ Good

**Findings:**

CORS is configured with a specific origin from `process.env.FRONTEND_URL` — no wildcard `*`:
```ts
// apps/server/src/server.ts:31
cors({
  origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
})
```

No hardcoded secrets or API keys were found in source. No raw SQL string interpolation patterns (`sql\`...${userInput}\``) were detected outside of the safe parameterised `set_config` calls. Database queries all go through Drizzle's query builder with parameterised values.

PostgreSQL RLS policies (`0002_enable_rls.sql`, `0006_add_subscriptions_rls.sql`) provide defence-in-depth: even if the application layer has a bug in role checking, the database refuses cross-newspaper reads/writes for `app_user`.

`.gitignore` covers `.env`, `.env.local`, `.env.*.local`. No secrets were found committed in the checked files.

Image uploads enforce content-type and size limits before passing to MinIO:
```ts
// apps/server/src/services/articles.ts:664
if (!["image/jpeg", "image/png"].includes(blob.type)) { throw ... }
if (blob.size > 10 * 1024 * 1024) { throw ... }
```

**Recommendations:**

1. The `JWT_SECRET` in `.env.example` is the literal string `"newspaper"`. Add a comment explicitly warning that this must be replaced with a long random secret in any non-local environment, and consider adding a startup check that rejects secrets shorter than 32 characters.
2. The image content-type check reads `blob.type`, which is the MIME type from the HTTP request — this is client-supplied and can be spoofed. For stronger validation, consider using `sharp` (already a dependency) to attempt decoding the image before storing it.

---

### 13. Forms

**Status:** ❌ Issues — no form library; all forms are hand-rolled with many `useState` calls and manual validation

**Findings:**

No form library (React Hook Form, TanStack Form, Formik) is present in any `package.json`. Zod is listed in the root `package.json` as a version override but is not imported in any frontend component.

Every form in the application follows the same anti-pattern: multiple `useState` calls for each field plus a parallel set of loading/error states, manual `handleSubmit`, and inline `if`-based validation. The top offenders by `useState` count:

| File | useState count |
|---|---|
| `ArticleEditorPage.tsx` | 18 |
| `ProfileInfoCard.tsx` | 12 |
| `EditorialQueueSection.tsx` | 11 |
| `SignUpPage.tsx` | 10 |
| `PasswordCard.tsx` | 7 |

`ArticleEditorPage.tsx` is the most severe case. Its 18 `useState` declarations (lines 216–234) span form fields (`title`, `perex`, `content`, `categoryId`, `keywords`), image state, loading flags (`saving`, `submitting`, `deleting`, `uploadingImage`), and error state — all in a single component.

Manual validation examples:
```ts
// apps/web/src/pages/SetNewPasswordPage.tsx:25
setError("Passwords do not match.");
// apps/web/src/pages/profile/PasswordCard.tsx:23
setError("Password must be at least 8 characters.");
```

The same length/match rules that are validated on the backend (TypeBox schemas) are re-implemented by hand on the frontend with no shared schema.

**Recommendations:**

1. Adopt **React Hook Form** (`react-hook-form`) as the form library and **Zod** (already present) as the validation schema library with `@hookform/resolvers/zod`. This eliminates the `useState`-per-field pattern.
2. For `SignUpPage.tsx`, `LoginPage.tsx`, `PasswordCard.tsx`, and `SetNewPasswordPage.tsx`, the form schema can be derived directly from the TypeBox validators already defined in `@pb138/server`'s schemas (or from a shared Zod schema in `packages/shared`). This eliminates duplicated validation logic.
3. Replace `setError("Passwords do not match")` and similar manual checks with Zod's `.refine()`:
   ```ts
   z.object({ password: z.string().min(8), confirm: z.string() })
    .refine(d => d.password === d.confirm, { message: "Passwords do not match", path: ["confirm"] });
   ```
4. The `alert()` calls for form submission errors (`GlobalUsersSection.tsx`) should also be replaced as part of this effort.

---

### 14. Frontend Structure

**Status:** ⚠️ Concerns — two god components exceed 400 lines; all data fetching lives inside component bodies

**Findings:**

**Large page files:**

| File | Lines |
|---|---|
| `ArticleEditorPage.tsx` | 561 |
| `ArticlePage.tsx` | 441 |
| `EditorialQueueSection.tsx` | 298 |
| `AuthorPage.tsx` | 248 |

`ArticleEditorPage.tsx` (561 lines) mixes: article data loading (3 separate `useEffect`/`fetch` calls), form state (18 `useState`), Lexical editor integration, image upload/delete logic, article submit/delete/save handlers, and the `EditorSidebar` sub-component — all in one file. This is a textbook god component.

`ArticlePage.tsx` (441 lines) combines article loading, Lexical read-only renderer, comment list fetching, comment submission, like/unlike logic, subscription gating, and infinite-scroll with an `IntersectionObserver`. It is denser but more defensible given the feature richness of the article page.

**Data fetching placement:**

The project uses React Router DOM v7, which supports loaders in `createBrowserRouter`. However, data fetching is done exclusively inside component bodies via `useEffect + fetch`:

```ts
// apps/web/src/pages/CategoryPage.tsx:46
useEffect(() => {
  fetch(...)
    .then(res => res.json())
    .then(data => setArticles(data));
}, [slug]);
```

This means pages load in two phases: render skeleton → trigger fetch → re-render with data. React Router loaders would allow data fetching to begin before the component renders.

**Custom hooks:**

Only 4 custom hooks exist: `useArticleViewTracker`, `useCategory`, `useNewspaper`, `useTheme`. The data-fetching logic for categories (`useCategory.ts`) and newspaper context (`useNewspaper.ts`) are correctly extracted. But the many other fetch/state patterns in `AuthorPage.tsx`, `UserProfilePage.tsx`, `DashboardPage.tsx`, `DirectorDashboardPage.tsx`, `StatisticsSection.tsx` have no equivalent custom hooks.

**Recommendations:**

1. Extract `ArticleEditorPage.tsx` into smaller units: move image upload/delete logic into a `useArticleImages` hook, move form state into `useArticleForm` (or switch to React Hook Form per category 13), and keep the page component as an orchestrator under ~200 lines.
2. For `ArticlePage.tsx`, extract the comment section (fetch + form + list) into a `<CommentSection articleId={id} />` component, and the like/subscription logic into a `useArticleSocial` hook.
3. Migrate repetitive `useEffect + fetch + setState` patterns — at minimum for `AuthorPage`, `UserProfilePage`, `DirectorDashboardPage` — into dedicated custom hooks (e.g., `useAuthor(id)`, `useUserProfile()`). This is a stepping stone toward adopting TanStack Query (category 3).
4. Consider using React Router v7 loaders for the primary data fetches on `CategoryPage`, `AuthorPage`, and `ArticlePage` to eliminate loading waterfalls on navigation.
