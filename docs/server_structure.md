# Server Structure

## Directory layout

```
apps/server/src/
├── server.ts               ← entry point: builds and exports the Elysia app, listens on PORT
├── db/
│   ├── schema.ts           ← drizzle table definitions (single source of truth for the DB)
│   ├── enums.ts            ← drizzle enums
│   ├── index.ts            ← db client (postgres connection)
│   ├── seed.ts             ← seed data script
│   └── seeds/              ← seed payloads
├── schemas/                ← TypeBox schemas describing the HTTP wire format
│   ├── shared.ts           ← reusable primitives (Uuid, Email, Pagination) and drizzle-typebox bases
│   ├── articles.ts         ← request + response schemas for /api/.../articles/*
│   ├── auth.ts             ← /api/auth/*
│   ├── users.ts            ← /api/users/*
│   ├── newspapers.ts       ← /api/newspapers/*
│   ├── categories.ts       ← /api/.../categories/*
│   ├── comments.ts         ← /api/.../comments/*
│   ├── likes.ts            ← /api/.../likes/*
│   ├── authors.ts          ← /api/.../authors/*
│   └── admin.ts            ← admin endpoints
├── middleware/
│   └── auth.ts             ← JWT verification + role attachment as an Elysia plugin
├── errors/
│   └── index.ts            ← HttpError base + status-specific subclasses
├── routes/                 ← one thin Elysia sub-app per resource, mirrors schemas/
│   ├── auth.ts
│   ├── articles.ts
│   ├── authors.ts
│   ├── categories.ts
│   ├── comments.ts
│   ├── likes.ts
│   ├── newspapers.ts
│   ├── users.ts
│   ├── admin.ts
│   └── views_route.ts
├── services/               ← business logic + DB access per resource, mirrors routes/
│   ├── context.ts          ← shared AuthUser / Roles types
│   ├── auth.ts
│   ├── articles.ts
│   ├── authors.ts
│   ├── categories.ts
│   ├── comments.ts
│   ├── likes.ts
│   ├── newspapers.ts
│   ├── users.ts
│   ├── admin.ts
│   └── views.ts
└── utils/
    ├── jwt.ts              ← JWT expiration constants
    └── email.ts            ← email sending helpers
```

## How it fits together

**`db/schema.ts`** — drizzle tables. Source of truth for what the DB stores. Imported by route handlers (for queries) and by `schemas/` (to derive TypeBox shapes via `drizzle-typebox`).

**`schemas/<resource>.ts`** — TypeBox schemas for the HTTP wire format of one resource: request params, queries, bodies, and response shapes. Field-level constraints flow from drizzle (`createInsertSchema(articles, ...)`) where the API and DB agree; HTTP-only fields (UUIDs in URLs, paging, role enums) are written by hand. `schemas/shared.ts` holds primitives and drizzle-typebox bases reused across resources.

**`middleware/auth.ts`** — Elysia plugin that verifies the JWT bearer token and attaches `user` and `roles` to each request. Route files do `.use(authMiddleware)` to opt in.

**`routes/<resource>.ts`** — exports a *thin* Elysia sub-app per resource. Each route declares its TypeBox schemas in route options (`{ params, query, body, response }`); Elysia validates requests at runtime, and the same schemas drive OpenAPI docs and the Eden client's types. The handler does no logic itself — it pulls the validated inputs plus `user`/`roles` off the Elysia context and calls the matching service function.

```ts
// routes/articles.ts (excerpt)
export const articleRoutes = new Elysia({ detail: { tags: ["Articles"] } })
  .use(authMiddleware)
  .post("/api/newspapers/:newspaper_id/articles", async ({ params, user, roles, body, set }) => {
    const result = await articleService.createArticle(params.newspaper_id, user, roles, body);
    set.status = 201;
    return result;
  }, {
    params: newspaperOnlyParams,
    body: createArticleBody,
  });
```

**`services/<resource>.ts`** — the business logic + DB access for one resource. Functions take plain arguments (ids, validated bodies, `user`/`roles`) and return plain data. They never import from `elysia` and never touch the Elysia context (`set`, `params`, `request`*, `Response`). On a failure they `throw` an `HttpError` subclass instead of building an HTTP response. `services/context.ts` holds the shared `AuthUser`/`Roles` types passed in from `middleware/auth.ts`.

> *Two upload handlers (`users.updateProfilePicture`, `articles.uploadArticleImage`) receive the raw `Request` solely to parse the multipart/JSON body — a deliberate, documented exception because body parsing is transport I/O and the original code tightly couples parse + validate + upload error shaping. They still read no routing/status from it.

**`errors/index.ts`** — `HttpError(code, status, details?)` plus one subclass per status family (`BadRequestError` 400, `UnauthorizedError` 401, `ForbiddenError` 403, `NotFoundError` 404, `ConflictError` 409, `UnprocessableError` 422). The `code` is the wire error key (e.g. `NEWSPAPER_NOT_FOUND`); optional `details` carries extra body fields (e.g. `{ fields: {...} }`). Services throw these; the global `.onError` in `server.ts` maps them to `{ error: code, ...details }` with the right status.

**`server.ts`** — assembles the app: registers `cors()` and `openapi()` plugins, registers `HttpError` via `.error()` and maps it in `.onError`, mounts every route file, and starts listening. Also exports `app` and `type App` so the frontend's Eden client can infer types.

## Cross-cutting concerns

- **Validation, OpenAPI, and FE type safety are unified.** The TypeBox schemas in `schemas/` are read by Elysia at runtime (validation), by `@elysiajs/openapi` at startup (docs at `/openapi`), and by `@elysiajs/eden`'s `treaty<App>` on the frontend (typed client). One declaration drives all three.
- **Two sources of truth, kept aligned by the compiler.** `db/schema.ts` is authoritative for the DB; `schemas/*` is authoritative for the wire. Handlers bridge them, and TypeScript flags drift at the boundary (e.g. `db.insert(articles).values({ ... })` checks the body shape against the column types).
- **Frontend integration.** `apps/server` exposes `App`, `db/schema`, and the schema modules via its `package.json` `exports`. `apps/web` workspace-depends on `@pb138/server` and uses Eden for typed HTTP calls.

## Rationale

- **One file per resource** in `routes/`, `services/`, and `schemas/` mirrors the API sections in `docs/API.md` — easy to find where to add or change an endpoint.
- **Routes vs. services** — routes own HTTP (URL, method, validation, status code); services own *what the operation means* (rules + DB). The boundary is a plain function call with clean arguments, so a service can be unit-tested or reused without booting Elysia. Errors cross the boundary as thrown `HttpError`s, mapped to responses in one place.
- **`schemas/` separate from `db/`** because validators describe the API surface, not the database. `db/` stays narrowly about persistence.
- **`schemas/shared.ts`** centralizes `Pagination`, `Uuid`, role enums, and drizzle-typebox bases so individual resource files stay short.
- **TypeBox in route options** (rather than `zod.parse()` inside handlers) is what makes Elysia's runtime validation, OpenAPI generation, and Eden inference all work without extra adapters.
