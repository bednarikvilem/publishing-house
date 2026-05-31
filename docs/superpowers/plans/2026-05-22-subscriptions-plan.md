# Subscriptions Implementation Plan

**Spec:** `docs/superpowers/specs/2026-05-22-subscriptions-design.md`
**Branch:** `feature/subscriptions`

---

## Phase 1 — Database

### Step 1 — Add tables and column to `apps/server/src/db/schema.ts`

Add two new tables and one new column:

**`subscriptions` table:**
```ts
export const subscriptions = pgTable("subscriptions", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    newspaperId: uuid("newspaper_id").notNull().references(() => newspapers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ([
    unique().on(table.userId, table.newspaperId),
]));
```

**`subscriptionTokens` table:**
```ts
export const subscriptionTokens = pgTable("subscription_tokens", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    newspaperId: uuid("newspaper_id").notNull().references(() => newspapers.id, { onDelete: "cascade" }),
    usedAt: timestamp("used_at"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Column on `articles`:**
```ts
isSubscriberOnly: boolean("is_subscriber_only").default(false).notNull(),
```

Export `InferSelectModel` / `InferInsertModel` types for both new tables.

### Step 2 — Apply schema changes

```sh
cd apps/server && bun db:push
```

---

## Phase 2 — API Contract

### Step 3 — Update `docs/API.md`

Add a new **Subscriptions** section with the three new endpoints. Follow the existing format exactly:

- `POST /api/newspapers/:newspaper_id/subscription/request`  
  Auth: `REGISTERED_USER`. Creates a token, sends QR code email.  
  Response `200`: `{ message: "Subscription QR code sent to your email." }`  
  Errors: `401 UNAUTHORIZED`, `404 NEWSPAPER_NOT_FOUND`

- `POST /api/newspapers/:newspaper_id/subscription/confirm`  
  Auth: None. Body `{ token: string }`. Redeems token, creates/extends subscription.  
  Response `200`: `{ message: "Subscription activated.", expires_at: "<ISO date>" }`  
  Errors: `400 INVALID_TOKEN` (expired or already used), `404 NEWSPAPER_NOT_FOUND`

- `GET /api/newspapers/:newspaper_id/subscription/status`  
  Auth: `REGISTERED_USER`. Returns current subscription state.  
  Response `200`: `{ is_active: boolean, expires_at: string | null }`  
  Errors: `401 UNAUTHORIZED`

Also update the `PUT /api/newspapers/:newspaper_id/articles/:article_id` entry to note that `is_subscriber_only` (boolean, optional) is accepted by `NEWSPAPER_MANAGER`.

> **Note:** The routes use `newspaper_id` (UUID) in the path, consistent with every other existing route — not `newspaperSlug`. The spec used `newspaperSlug` as shorthand; the real implementation uses the UUID.

---

## Phase 3 — Backend

### Step 4 — Install `qrcode` package

```sh
cd apps/server && bun add qrcode && bun add -d @types/qrcode
```

### Step 5 — Create `apps/server/src/schemas/subscriptions.ts`

TypeBox schemas following the pattern in `src/schemas/auth.ts`:

```ts
// Request body for /confirm
export const ConfirmSubscriptionBody = Type.Object({
    token: Type.String({ minLength: 1 }),
});

// Response schemas
export const SubscriptionStatusResponse = Type.Object({
    is_active: Type.Boolean(),
    expires_at: Type.Union([Type.String(), Type.Null()]),
});
```

### Step 6 — Create `apps/server/src/services/subscriptions.ts`

Functions:
- `requestSubscription(userId, newspaperId, frontendBaseUrl)` — creates a `subscriptionToken` row (expiresAt = now + 7 days), generates QR code PNG via `qrcode`, calls `sendSubscriptionQrEmail`
- `confirmSubscription(token)` — looks up token; returns `INVALID_TOKEN` if not found, already used, or expired; sets `usedAt`; upserts `subscriptions` row (new: expiresAt = now + 30 days; renewing: expiresAt = current expiresAt + 30 days)
- `getSubscriptionStatus(userId, newspaperId)` — returns `{ is_active, expires_at }` by querying `subscriptions`
- `getRenewalCandidates()` — used by the cron script; returns rows from `subscriptions` where `expiresAt < now + 3 days` AND no unused token exists for `(userId, newspaperId)`

### Step 7 — Add email helpers to `apps/server/src/utils/email.ts`

Add two new functions alongside the existing ones:
- `sendSubscriptionQrEmail(to, newspaperName, qrDataUrl)` — "Here is your QR code to activate your 30-day subscription to [name]"
- `sendSubscriptionRenewalEmail(to, newspaperName, expiresAt, qrDataUrl)` — "Your subscription to [name] expires on [date]. Scan to renew."

### Step 8 — Create `apps/server/src/routes/subscriptions.ts`

Elysia route group following the pattern of `src/routes/categories.ts`:

```
POST  /newspapers/:newspaper_id/subscription/request  → subscriptionService.requestSubscription
POST  /newspapers/:newspaper_id/subscription/confirm  → subscriptionService.confirmSubscription
GET   /newspapers/:newspaper_id/subscription/status   → subscriptionService.getSubscriptionStatus
```

Auth guards:
- `request` and `status` require bearer token + `REGISTERED_USER` role check
- `confirm` is public (no auth guard)

### Step 9 — Register routes in `apps/server/src/server.ts`

Import and `.use()` the new subscription routes, following the same pattern as other route groups.

### Step 10 — Update article read endpoint for subscription gating

In `apps/server/src/services/articles.ts` (function that serves `GET /newspapers/:newspaper_id/articles/:article_id`):

After fetching the article, add:
```ts
if (article.isSubscriberOnly) {
    const sub = await getSubscriptionStatus(userId, article.newspaperId);
    if (!sub.is_active) {
        throw new SubscriptionRequiredError(); // 403, code: "SUBSCRIPTION_REQUIRED"
    }
}
```

Add `SubscriptionRequiredError` to `apps/server/src/errors/index.ts`.

### Step 11 — Add `isSubscriberOnly` to article update in manager flow

In `apps/server/src/services/articles.ts` (article update function):

Accept `is_subscriber_only?: boolean` in the update payload. Only apply it if the calling user holds `NEWSPAPER_MANAGER` role for this newspaper. Other roles' patches ignore the field.

Update `apps/server/src/schemas/articles.ts` to include the optional field in the update schema.

### Step 12 — Create `apps/server/scripts/subscription-renewal.ts`

Standalone Bun script (not part of the server):

```ts
import { getRenewalCandidates, requestSubscription } from "../src/services/subscriptions";

const candidates = await getRenewalCandidates();
for (const candidate of candidates) {
    await requestSubscription(candidate.userId, candidate.newspaperId, process.env.FRONTEND_URL!);
}
console.log(`Sent ${candidates.length} renewal emails.`);
process.exit(0);
```

Add to `apps/server/package.json` scripts:
```json
"subscription:renew": "bun --env-file=../../.env scripts/subscription-renewal.ts"
```

---

## Phase 4 — Frontend

### Step 13 — Add API functions to `apps/web/src/lib/api.ts`

Add three functions following existing patterns:
```ts
requestSubscription(newspaperId: string): Promise<{ message: string }>
confirmSubscription(newspaperId: string, token: string): Promise<{ message: string, expires_at: string }>
getSubscriptionStatus(newspaperId: string): Promise<{ is_active: boolean, expires_at: string | null }>
```

### Step 14 — Create `apps/web/src/pages/SubscriptionConfirmPage.tsx`

New page that:
1. Reads `?token=` from the URL query string and `newspaperName` from the route params
2. Resolves the newspaper UUID via the existing `useNewspaper` hook
3. On mount, calls `confirmSubscription(newspaperId, token)`
4. Renders one of three states using the existing `LoadingState`, `ErrorState` pattern:
   - Loading: spinner
   - Success: "Subscription activated! Valid until [date]."
   - Error `INVALID_TOKEN`: "This QR code has already been used or has expired."

### Step 15 — Register route in `apps/web/src/App.tsx`

Add:
```tsx
import { SubscriptionConfirmPage } from "./pages/SubscriptionConfirmPage";
// ...
<Route path="/:newspaperName/subscription/confirm" element={<SubscriptionConfirmPage />} />
```

Place it near `/:newspaperName/verify-email`.

### Step 16 — Update `apps/web/src/components/Navbar.tsx`

On mount (or when newspaper changes), call `getSubscriptionStatus` if the user is logged in:
- If `!is_active`: show a "Subscribe" button that calls `requestSubscription` and then shows a toast/inline message: "Check your email for your QR code."
- If `is_active`: show a muted text "Subscribed until [date]" (formatted with `toLocaleDateString`).
- If not logged in: show nothing (subscribe is only for registered users).

### Step 17 — Update `apps/web/src/pages/ArticlePage.tsx`

When the article fetch returns a `403` response with `code: "SUBSCRIPTION_REQUIRED"`:

Replace the article body with a paywall overlay component (inline in the file, no need for a separate component file):
- Heading: "Subscriber-only content"
- Body: "This article is available to subscribers only."
- Button: "Subscribe" — calls `requestSubscription`, shows inline confirmation "Check your email for your QR code."
- If not logged in: button redirects to `/:newspaperName/login` instead.

### Step 18 — Update `apps/web/src/components/ArticleCard.tsx`

Accept an optional `isSubscriberOnly?: boolean` prop. When true, render a small badge (e.g. a shadcn `Badge` or a styled `<span>`) labeled "Subscribers only" in the top-right corner of the card or below the category badge.

Update all places that render `ArticleCard` (homepage, search results, category page) to pass through `isSubscriberOnly` from the article data.

### Step 19 — Add subscriber-only toggle to manager's article queue

In `apps/web/src/pages/dashboard/EditorialQueueSection.tsx` (or whichever component renders the article detail/action panel for the manager):

Add a toggle switch labeled "Restrict to subscribers only" that:
- Shows the current `isSubscriberOnly` value when the article detail is loaded
- On toggle, calls the article update endpoint `PUT /api/newspapers/:newspaper_id/articles/:article_id` with `{ is_subscriber_only: <newValue> }`
- Is only rendered when the user's role is `NEWSPAPER_MANAGER`

---

## Phase 5 — Tests

### Step 20 — Unit tests: `apps/server/src/services/subscriptions.test.ts`

Use `bun test`. Mock DB calls where needed.

Tests to write:
1. `confirmSubscription` with a valid unused token → subscription created, `usedAt` set
2. `confirmSubscription` with an already-used token → throws `INVALID_TOKEN`
3. `confirmSubscription` with an expired token → throws `INVALID_TOKEN`
4. `confirmSubscription` when subscription already exists → `expiresAt` extended from current expiry, not redemption date
5. `getRenewalCandidates` → returns subscriptions expiring within 3 days that have no pending unused token

### Step 21 — E2E test: `tests/e2e/subscription-workflow.spec.ts`

Use Playwright, following the pattern in `tests/e2e/article-approval-workflow.spec.ts`.

Tests to write:
1. **Paywall renders for non-subscriber:** log in as registered user (no subscription), navigate to a subscriber-only article, assert paywall overlay is visible and "Subscribe" button is present.
2. **Subscribe flow:** click "Subscribe" on the paywall, assert confirmation message "Check your email" appears.
3. **Token confirm:** directly navigate to `/:newspaper/subscription/confirm?token=<test-token>` (seed a valid token in test setup), assert "Subscription activated" message appears.
4. **Article accessible after subscription:** seed an active subscription for the test user, navigate to subscriber-only article, assert full content renders (no paywall).
5. **Manager toggle:** log in as manager, open an article in the queue, toggle "Restrict to subscribers only", assert the badge appears on the article card after reload.

---

## Dependency Order

```
Step 1 → Step 2 (DB must exist before push)
Step 3 (API doc, independent)
Step 4 → Step 5 → Step 6 → Step 7 → Step 8 → Step 9 (backend chain)
Step 10 depends on Step 6 (subscription service)
Step 11 depends on Step 5 (schemas)
Step 12 depends on Step 6 (subscription service)
Step 13–19 (frontend, can be done in parallel with backend)
Step 20 depends on Step 6
Step 21 depends on everything
```
