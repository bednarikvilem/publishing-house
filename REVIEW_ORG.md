# Project Review: pb138

**Date:** 2026-06-02

---

## Project Orientation

This is a full-stack web application for a publication house managing multiple newspapers, built as a Turborepo monorepo with two workspaces: `apps/server` (Elysia backend) and `apps/web` (React frontend), plus a `tests` workspace for E2E testing. The backend uses Elysia with Drizzle ORM over PostgreSQL 17, employing Row-Level Security (RLS) policies for authorization. The frontend is built with React 19, React Router, and TailwindCSS, using `@base-ui/react` primitives for UI components and Lexical for rich text editing. Authentication is custom JWT via `@elysiajs/jwt` with `Bun.password` (argon2). Image storage is delegated to MinIO (S3-compatible). The project includes comprehensive documentation (API contract, functional requirements, ERD, use cases) and runs via Docker Compose.

---

## Review Summary

| Category              | Status         |
| --------------------- | -------------- |
| Component Library     | ⚠️ Concerns    |
| Styling               | ⚠️ Concerns    |
| Loading Data          | ❌ Issues      |
| Environment Variables | ⚠️ Concerns    |
| REST API Design       | ⚠️ Concerns    |
| Database              | ✅ Good        |
| BE Design Patterns    | ⚠️ Concerns    |
| Auth                  | ⚠️ Concerns    |
| Testing               | ✅ Good        |
| Logging & Monitoring  | ⚠️ Concerns    |
| Error Handling        | ✅ Good        |
| Security              | ⚠️ Concerns    |
| Forms                 | ❌ Issues      |
| Frontend Structure    | ❌ Issues      |

Status legend: ✅ Good | ⚠️ Concerns | ❌ Issues | N/A

---

## Detailed Review

### 1. Component Library

**Status:** ⚠️ Concerns — Base UI primitives are used for component primitives, but there is duplication and the `shadcn` package is installed without being utilized.

The project uses `@base-ui/react` to build its own `components/ui/` primitives (`Button`, `Input`, `Select`, `Textarea`, `Card`, `Label`). This is a valid modern approach. However, the team also installed `shadcn: ^4.0.5` in `apps/web/package.json` but there are no imports or usages of `shadcn` anywhere in the codebase — it is dead weight.

More importantly, `apps/web/src/components/FormField.tsx` renders raw `<input>` and `<textarea>` elements with hand-rolled Tailwind class strings instead of composing the already-built `Input` and `Textarea` primitives from `components/ui/`. For example:

```tsx
// apps/web/src/components/FormField.tsx
<input
  id={id}
  aria-invalid={!!error}
  className={`${inputClass} aria-[invalid=true]:border-destructive`}
  {...(rest as InputHTMLAttributes<HTMLInputElement>)}
/>
```

The `APITester.tsx` is the only file that imports from `components/ui`, suggesting the UI library is not widely adopted across pages.

**Recommendations:**

1. Remove the unused `shadcn` dependency from `apps/web/package.json` to clean up the dependency tree.
2. Refactor `FormField.tsx` to compose `Input` from `components/ui/input.tsx` and `Textarea` from `components/ui/textarea.tsx` rather than duplicating raw HTML and styling.
3. Ensure all new components and form fields use the `components/ui` primitives to maintain consistency.

---

### 2. Styling

**Status:** ⚠️ Concerns — Inline styles are used for fonts, and Tailwind arbitrary values are heavily abused, creating maintenance debt.

Inline `style={{ ... }}` attributes appear in several components for font overrides:

```tsx
// apps/web/src/components/PortalLayout.tsx:21
style={{ fontFamily: "Outfit, Inter, sans-serif" }}
// apps/web/src/components/AuthCard.tsx:14
style={{ fontFamily: "Outfit, Inter, sans-serif" }}
// apps/web/src/pages/profile/ProfileInfoCard.tsx:129
style={{ fontFamily: "Outfit, Inter, sans-serif" }}
```

Tailwind arbitrary values are extremely common across the codebase:

```tsx
// apps/web/src/components/Navbar.tsx:140
className="text-foreground shrink-0 text-[22px] font-extrabold tracking-tight"
// apps/web/src/components/Navbar.tsx:149
className="text-muted-foreground hover:text-foreground text-[14px] font-medium transition-colors"
// apps/web/src/pages/ArticlePage.tsx (viewerTheme)
heading: { h1: "text-[32px] font-bold tracking-[-0.3px] my-3" }
```

A single `!important` override exists in `apps/web/src/index.css:31: animation: none !important;`.

**Recommendations:**

1. Define typography tokens in the Tailwind theme config (e.g., `fontSize` and `fontFamily` extensions) and use semantic class names instead of inline `style={{ fontFamily: ... }}`.
2. Replace arbitrary Tailwind values like `text-[14px]`, `text-[22px]`, `leading-[1.8]` with standard Tailwind utilities (e.g., `text-sm`, `text-2xl`, `leading-relaxed`) or custom theme tokens.
3. Remove the `!important` in `index.css` or document why it is necessary.

---

### 3. Loading Data

**Status:** ❌ Issues — No data-fetching library (TanStack Query, SWR, or Eden Treaty fully used). Every component loads data imperatively with `fetch()` inside `useEffect`.

There is no TanStack Query or SWR in `apps/web/package.json`. The `@elysiajs/eden` treaty client is exported in `apps/web/src/lib/api.ts` but is only actually imported and used in `APITester.tsx`:

```tsx
// apps/web/src/lib/api.ts:12
export const client = treaty<App>(API_BASE_URL, { headers: () => authHeaders() });
```

Instead, raw `fetch()` calls are scattered throughout components and pages:

```tsx
// apps/web/src/components/Navbar.tsx:70
fetch(`${API_BASE_URL}/api/newspapers/${newspaper.id}/categories`)
  .then((res) => ...)
  .then((data) => setCategories(data.data))
  .catch(() => {});
```

```tsx
// apps/web/src/pages/ArticleEditorPage.tsx:241
fetch(`${API_BASE_URL}/api/newspapers/${newspaperId}/categories`)
  .then((res) => res.json() as Promise<{ data: Category[] }>)
  .then((data) => setCategories(data.data ?? []))
```

This leads to duplicated loading logic, no caching, no automatic background refetching, no deduplication across components, and no standardized error/loading states.

**Recommendations:**

1. Introduce TanStack Query in the frontend and replace imperative `useEffect` + `fetch` patterns with `useQuery` and `useMutation` hooks.
2. Use stable array query keys (e.g., `['articles', newspaperId]`, `['user', 'me']`) to enable caching and invalidation.
3. Alternatively, adopt the Eden Treaty client (`@elysiajs/eden`) consistently across the app instead of raw `fetch` and `authHeaders()` boilerplate.

---

### 4. Environment Variables

**Status:** ⚠️ Concerns — `.env.example` is present and `.gitignore` protects env files, but there is a hardcoded fallback URL in the frontend and a hardcoded MinIO URL in seed data.

`.gitignore` correctly lists `.env`, `.env.development.local`, `.env.test.local`, `.env.production.local`, and `.env.local`.

`.env.example` is comprehensive with placeholder values and documentation.

However, `apps/web/src/lib/api.ts` hardcodes a fallback:

```ts
// apps/web/src/lib/api.ts:4-5
export const API_BASE_URL =
  import.meta.env?.PUBLIC_API_BASE_URL ?? "http://localhost:3000";
```

And seed data contains a hardcoded storage URL:

```ts
// apps/server/src/db/seeds/seedE2eUsers.ts:61
profilePictureUrl: "http://localhost:9000/pb138-images/profiles/e2e-placeholder.webp",
```

**Recommendations:**

1. Remove the hardcoded `"http://localhost:3000"` fallback or gate it behind `import.meta.env.DEV` to prevent accidental production leakage.
2. Make the seed MinIO URL configurable via environment variable (e.g. `process.env.PUBLIC_IMAGES_BASE_URL`) rather than hardcoding `localhost:9000`.

---

### 5. REST API Design

**Status:** ⚠️ Concerns — Resource-oriented routes and correct HTTP verbs are used, but the `PUT` article endpoint accepts partial fields and CORS is unconfigured.

URLs are resource-oriented and plural:
- `GET /api/newspapers/:newspaper_id/articles`
- `POST /api/newspapers/:newspaper_id/articles`
- `PUT /api/newspapers/:newspaper_id/articles/:article_id`
- `DELETE /api/newspapers/:newspaper_id/articles/:article_id`

HTTP verbs and status codes are generally correct (201 for creation, 204 for deletion).

However, the `PUT` article body schema accepts optional fields (`title: t.Optional(...)`, `perex: t.Optional(...)`, `content: t.Optional(...)` in `apps/server/src/schemas/articles.ts:45-51`):

```ts
export const updateArticleBody = t.Object({
    title: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
    perex: t.Optional(t.String({ minLength: 1, maxLength: 1000 })),
    content: t.Optional(t.String({ minLength: 1, maxLength: 200_000 })),
    category_id: t.Optional(t.Union([Uuid, t.Null()])),
    keywords: Keywords,
});
```

This means a `PUT` can be called with a partial body, violating PUT idempotency semantics. `PUT` should require the complete resource representation; partial updates belong under `PATCH`. (A `PATCH /subscriber-only` endpoint exists and is correctly partial.)

Additionally, `app.use(cors())` is called with no configuration in `apps/server/src/server.ts:30`, meaning CORS defaults to wildcard `*` in production.

**Recommendations:**

1. Change `updateArticleBody` for the `PUT` endpoint to require all fields (non-optional), or split the endpoint so that partial updates use `PATCH`.
2. Configure `@elysiajs/cors` with explicit `origin` settings to prevent wildcard CORS in production.

---

### 6. Database

**Status:** ✅ Good — Sensible relational schema, Drizzle ORM used properly, migrations versioned, and blobs kept out of the database.

Schema (`apps/server/src/db/schema.ts`) uses `uuid` primary keys with `defaultRandom()`, has proper foreign keys (`authorId`, `newspaperId`, `categoryId`, `userId`, `articleId`), and composite primary keys where needed (e.g., `likes`, `user_roles`).

Images are stored as URLs in `text("url")` columns rather than blobs:

```ts
// apps/server/src/db/schema.ts
export const articleImages = pgTable("article_images", {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    ...
});
```

Migrations are managed with Drizzle Kit: 6 numbered SQL migration files exist under `apps/server/drizzle/` (`0001` through `0006`), plus a `meta/` journal, indicating versioned schema evolution.

Raw SQL appears only in `apps/server/src/db/rls.ts` for setting PostgreSQL GUC configuration variables, using Drizzle's parameterized `sql` tagged template — safe from injection.

**Recommendations:**

1. Document the RLS migration strategy more prominently for new developers.
2. Ensure every new schema change is generated via `bun db:generate` rather than hand-editing migration files without a counterpart snapshot.

---

### 7. Backend Design Patterns

**Status:** ⚠️ Concerns — Routes are thin and delegate to services, but service files are far beyond recommended size limits and mix multiple responsibilities.

The directory structure separates concerns:
- `routes/` — HTTP route definitions (thin)
- `services/` — business logic
- `schemas/` — request/response validation
- `middleware/` — auth middleware
- `db/` — ORM schema and connection

Route handlers properly use `withDb((tx) => service.fn(tx, ...))` and do not issue database queries directly. For example:

```ts
// apps/server/src/routes/articles.ts:70-71
async ({ params, user, roles, body, withDb, set }) => {
    const result = await withDb((tx) =>
        articleService.createArticle(tx, params.newspaper_id, user, roles, body)
    );
```

However, service files are extremely large:
- `apps/server/src/services/articles.ts`: 1057 lines
- `apps/server/src/services/admin.ts`: 824 lines

These files cover CRUD, search, queue logic, review assignment, approval chains, publishing, image upload, statistics, and more. A 1000+ line service file is difficult to test and reason about.

**Recommendations:**

1. Split `services/articles.ts` into smaller domain-specific modules (e.g., `articleCrud.ts`, `articleReview.ts`, `articleImages.ts`, `articleSearch.ts`).
2. Split `services/admin.ts` similarly (e.g., `userAdmin.ts`, `configAdmin.ts`, `statsAdmin.ts`).
3. Aim for service files under 250-300 lines of business logic.

---

### 8. Auth

**Status:** ⚠️ Concerns — No dedicated auth framework is used, but the custom solution is layered with middleware and RLS, and uses modern password hashing.

No BetterAuth, Lucia, or Auth.js is present. Authentication is hand-rolled via `@elysiajs/jwt` with `jwt.sign` / `jwt.verify`:

```ts
// apps/server/src/middleware/auth.ts:23
const payload = await jwt.verify(bearer);
```

On the positive side:
- Passwords are hashed with `Bun.password` (argon2) rather than raw bcrypt.
- Middleware (`requireAuth`, `requireRole`) enforces 401/403 responses.
- Authorization checks exist in service layer (e.g., `!roles.includes("AUTHOR")`, `user.newspaperId !== newspaperId`).
- PostgreSQL RLS policies add a database-level authorization safety net.

**Recommendations:**

1. Consider migrating to a known auth library (e.g., Better Auth or Lucia) to reduce maintenance burden and avoid subtle JWT vulnerabilities.
2. Add explicit token expiration checks (the JWT expires in 2h, but there is no refresh token flow).
3. Document the JWT secret rotation and token revocation strategy (the JTI blocklist with Redis is good; document it).

---

### 9. Testing

**Status:** ✅ Good — Both backend unit/integration tests and E2E Playwright tests are present and meaningful.

The project has 15 backend test files and 14 E2E spec files:
- **Backend:** schema validation tests (`schemas/*.test.ts`), RLS policy tests (`rls/policies.test.ts`), utility tests (`utils/*.test.ts`), and seed verification (`seeds/e2e-users.test.ts`).
- **E2E:** Playwright tests covering login, registration, article creation/editing, approval/rejection workflows, subscription flow, comments, likes, profile, admin role management, search, and homepage.

No skipped or `.todo` tests were found (`test.skip`, `it.skip`, `xdescribe`, `.todo(`). Test runner is `bun test` in `apps/server/package.json`.

**Recommendations:**

1. Add a `test` script to `apps/web/package.json` if frontend unit tests are desired (e.g., component tests with `@testing-library/react`).
2. Consider adding a CI workflow to run both backend and E2E test suites automatically.

---

### 10. Logging & Monitoring

**Status:** ⚠️ Concerns — A custom structured logger is used in services, but many `console.log` calls remain in runtime code and seeds log plaintext passwords.

The project defines a lightweight JSON logger in `apps/server/src/utils/logger.ts`:

```ts
export const logger = {
  info:  (message: string, meta?: Record<string, unknown>) => log("info",  message, meta),
  warn:  (message: string, meta?: Record<string, unknown>) => log("warn",  message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => { ... }
};
```

This is used well in services. However, there are ~50 `console.log`/`console.debug` occurrences in non-test TypeScript code. Many are in CLI scripts (`db-setup.ts`, `subscription-renewal.ts`), which is acceptable. But the frontend also has runtime logs:

```ts
// apps/web/src/hooks/useArticleViewTracker.ts:39
console.log("[ViewTracker] effect run", { enabled, newspaperId, articleId });
```

Most critically, seed scripts log plaintext passwords:

```ts
// apps/server/src/db/seeds/seedE2eUsers.ts:64
console.log(`Jan Novak seeded!  email: ${JAN.email}  password: ${JAN.password}`);
// apps/server/src/db/seeds/seedE2eUsers.ts:106
console.log(`Director seeded!  email: ${DIRECTOR.email}  password: ${DIRECTOR.password}`);
```

**Recommendations:**

1. Remove or gate all `console.log` calls inside frontend runtime hooks/components behind `import.meta.env.DEV`.
2. Never log plaintext passwords, even in seed scripts. Remove those `console.log` lines or replace them with email-only output.
3. Consider routing the custom logger to a file or external service in production rather than stdout.

---

### 11. Error Handling

**Status:** ✅ Good — Structured HTTP errors in the backend, global error handler, and frontend surfaces user-facing error states.

Backend defines a clean error hierarchy (`HttpError`, `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `UnprocessableError`) in `apps/server/src/errors/index.ts`:

```ts
export class HttpError extends Error {
    constructor(
        public readonly code: string,
        public readonly status: number,
        public readonly details?: ErrorDetails,
    ) { super(code); }
}
```

The global error handler in `apps/server/src/server.ts:82` returns the correct JSON and status code.

Frontend pages display errors to the user (not just swallowing them):

```tsx
// apps/web/src/pages/LoginPage.tsx:97
{error && <p className="text-destructive text-center text-[13px]">{error}</p>}
```

Catch blocks are generally meaningful (e.g., `LoginPage.tsx:49-50` shows "Could not connect to the server").

**Recommendations:**

1. Add a frontend global error boundary (React `ErrorBoundary`) to catch unexpected rendering errors gracefully, rather than relying only on per-page try/catch.
2. Consider standardizing frontend error messages through a shared error utility rather than inline strings.

---

### 12. Security

**Status:** ⚠️ Concerns — CORS is wide-open, but parameterized SQL is safe and there are no hardcoded secrets in source.

CORS is applied with no origin restriction:

```ts
// apps/server/src/server.ts:30
app.use(cors())
```

With `@elysiajs/cors`, this defaults to allowing all origins (`*`), which is a security concern for production deployments.

Raw SQL in `apps/server/src/db/rls.ts` uses Drizzle's parameterized `sql` tagged template:

```ts
await tx.execute(sql`SELECT set_config('app.user_id', ${session.userId ?? ""}, true)`);
```

Drizzle properly parameterizes `${session.userId}` here, so there is no SQL injection risk.

`.gitignore` correctly excludes `.env` files. No hardcoded API keys or secrets were found in source code.

**Recommendations:**

1. Configure CORS explicitly with allowed origins (e.g., `origin: process.env.FRONTEND_URL`) and disallow credentials from untrusted domains.
2. Add Helmet-style security headers or equivalent if deploying publicly.

---

### 13. Forms

**Status:** ❌ Issues — No form library is used. Multiple pages are built as hand-rolled `useState` form machines with manual validation.

No React Hook Form, TanStack Form, or Formik is installed. Zod is present in the root `package.json` but only as an override; it is not used for frontend form validation.

The anti-pattern is severe in the largest pages:

- `SignUpPage.tsx` (196 lines) holds 9 `useState` calls for form fields and state:
  ```ts
  const [fullName, setFullName]           = useState("");
  const [username, setUsername]           = useState("");
  const [email, setEmail]                 = useState("");
  const [password, setPassword]           = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError]                 = useState<string | null>(null);
  const [fieldErrors, setFieldErrors]     = useState<Record<string, string>>({});
  const [loading, setLoading]             = useState(false);
  const [success, setSuccess]             = useState(false);
  ```

- `ArticleEditorPage.tsx` (561 lines) holds 18 `useState` calls, acting as a massive form controller for article creation/editing:
  ```ts
  const [title, setTitle]             = useState("");
  const [perex, setPerex]             = useState("");
  const [content, setContent]         = useState("");
  const [categoryId, setCategoryId]   = useState("");
  const [keywords, setKeywords]       = useState("");
  const [articleStatus, setArticleStatus] = useState<ArticleStatus>("DRAFT");
  const [images, setImages]           = useState<ArticleImage[]>([]);
  // ... plus loading, saving, submitting, deleting, uploadingImage, formError, etc.
  ```

Validation is manual:

```ts
// apps/web/src/pages/SignUpPage.tsx:18-20
if (password !== confirmPassword) {
  setFieldErrors({ confirmPassword: "Passwords do not match" });
  return;
}
```

**Recommendations:**

1. Introduce **React Hook Form** (or TanStack Form) and pair it with **Zod** resolver for schema-driven validation.
2. Extract the `ArticleEditorPage.tsx` form logic into a custom hook (e.g., `useArticleEditor`) to separate data handling from rendering.
3. Replace manual `setFieldErrors` calls with centralized schema validation so that frontend and backend share validation rules.

---

### 14. Frontend Structure

**Status:** ❌ Issues — Route-level components are god components that mix fetching, state, and rendering. There are very few custom hooks extracting non-trivial logic.

The largest page components far exceed the recommended size:

| File | Lines | useState calls |
| ---- | ----- | -------------- |
| `apps/web/src/pages/ArticleEditorPage.tsx` | 561 | 18 |
| `apps/web/src/pages/ArticlePage.tsx` | 441 | 10 |
| `apps/web/src/pages/dashboard/EditorialQueueSection.tsx` | 298 | 11 |
| `apps/web/src/pages/AuthorPage.tsx` | 248 | — |
| `apps/web/src/pages/profile/ProfileInfoCard.tsx` | 235 | 12 |

`ArticleEditorPage.tsx` alone does the following inline:
- fetches categories and article data in `useEffect`
- fetches the current user's author profile
- manages 18 pieces of local state (form fields, loading, errors, image upload, delete)
- contains a nested `EditorSidebar` sub-component with 11 props
- handles image uploads and deletions
- conditionally renders a "profile incomplete" banner

This component should be decomposed into:
- A `useArticleEditor` hook for state and API logic
- A `useImageUpload` hook for image handling
- Smaller presentational components (`EditorSidebar`, `ImageGallery`, `StatusBadge`, etc.)

There are only **4 custom hooks** in the entire frontend (`useArticleViewTracker.ts`, `useCategory.ts`, `useNewspaper.ts`, `useTheme.ts`). `useCategory.ts` and `useNewspaper.ts` still use raw `fetch` + `useEffect` instead of a data-fetching library.

**Recommendations:**

1. Extract data-fetching and form logic from page components into custom hooks (e.g., `useArticleEditor.ts`, `useLoginForm.ts`).
2. Decompose `ArticleEditorPage.tsx` and `ArticlePage.tsx` into smaller sub-components and hooks. Aim for page files under 250-300 lines.
3. Adopt TanStack Query (or consistently use Eden Treaty) and move fetch calls out of component bodies entirely.

---

## Overall Summary

This is a well-documented, ambitious full-stack project with a solid backend architecture (thin routes, service layer, Drizzle ORM, RLS policies) and good test coverage. The major weaknesses are on the frontend: no data-fetching library, large god-component pages with heavy `useState` form logic, and missed opportunities to use the already-built UI primitives consistently. Addressing the frontend structure and introducing React Hook Form + TanStack Query would significantly improve maintainability.