# Subscriptions Design

**Date:** 2026-05-22
**Branch:** feature/subscriptions

## Overview

Add per-newspaper subscriptions to the platform. Some articles can be marked as subscriber-only by the Newspaper Manager; non-subscribers see a paywall instead of the full content. Subscriptions are valid for one month and are activated by scanning a QR code sent via email — no payment processing required. Renewal emails are sent proactively before expiry.

## Scope

- Approach: per-article subscriber-only flag (not a gate on all registered-user features)
- Scope: per-newspaper (a user subscribes to individual newspapers separately)
- Token mechanism: DB-stored single-use UUID tokens, mirroring the existing email verification flow

## Database

### New table: `subscriptions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid, PK | |
| `userId` | uuid, FK → users | |
| `newspaperId` | uuid, FK → newspapers | |
| `expiresAt` | timestamp | |
| `createdAt` | timestamp | |

Unique constraint on `(userId, newspaperId)` — one active subscription per user per newspaper.

### New table: `subscriptionTokens`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid, PK | The token value encoded in the QR code |
| `userId` | uuid, FK → users | |
| `newspaperId` | uuid, FK → newspapers | |
| `usedAt` | timestamp, nullable | null = not yet redeemed |
| `expiresAt` | timestamp | Token expires 7 days after creation if unused |
| `createdAt` | timestamp | |

### Modified table: `articles`

- Add column `isSubscriberOnly` boolean, default `false`

### Renewal extension rule

When a token is redeemed and the user already has an active subscription, `expiresAt` is extended by **30 days** from the **current** `expiresAt` (not the redemption date), so early renewal does not penalize the user. For new subscriptions, `expiresAt` is set to 30 days from the redemption date.

## Backend

### New endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/:newspaperSlug/subscription/request` | Required (registered user) | Creates a `subscriptionToken` and sends the QR code email |
| `POST` | `/api/:newspaperSlug/subscription/confirm` | Public | Body `{ token: string }` — validates and redeems the token; creates or extends the subscription |
| `GET` | `/api/:newspaperSlug/subscription/status` | Required | Returns `{ isActive: boolean, expiresAt: string \| null }` for the current user and newspaper |

### Middleware change

The endpoint serving full article content adds one check: if `article.isSubscriberOnly = true`, verify the requesting user has a non-expired subscription for that newspaper. If not, return:

```json
{ "code": "SUBSCRIPTION_REQUIRED", "message": "This article is for subscribers only." }
```

with HTTP `403`. The frontend uses the `code` field to render a paywall rather than a generic error page.

### Manager article control

`isSubscriberOnly` is added as an editable field on the existing article update endpoint. The field is writable only by users with the Manager role for that newspaper; patches from other roles ignore it.

### Renewal cron job

A script run daily that:
1. Queries for subscriptions where `expiresAt` is within 3 days
2. Skips any where an unused `subscriptionToken` already exists for `(userId, newspaperId)`
3. For each remaining match: creates a new token and sends the renewal QR code email

Implementation: a standalone Bun script invoked by a scheduled Docker container or system cron.

## Email & QR Flow

### New subscription

1. User clicks "Subscribe" or hits a paywall and clicks "Subscribe"
2. Frontend calls `POST /:newspaperSlug/subscription/request`
3. Server creates a `subscriptionToken`, generates a QR code PNG (via the `qrcode` npm package) encoding the frontend URL `https://<host>/:newspaperSlug/subscription/confirm?token=<uuid>`
4. Email sent: "Here is your subscription QR code for [Newspaper Name]. Scan it to activate your 30-day subscription." — QR code embedded as a data URL in the HTML email
5. User scans → browser opens the frontend confirm page → page calls `POST /api/:newspaperSlug/subscription/confirm` with the token → subscription created → success message shown

### Renewal

Same flow. Email reads: "Your subscription to [Newspaper Name] expires on [date]. Scan to renew for another 30 days." Redeeming extends `expiresAt` by 30 days from the current expiry.

### Token rules

- **Single-use:** `usedAt` is set on first redemption. A second scan returns a friendly error: "This QR code has already been used."
- **Expiry:** Tokens expire after 7 days if unused. The cron job generates a fresh token on the next daily run if renewal is still needed.

## Frontend

### Subscribe button

- **Navbar:** Visible to logged-in users without an active subscription for the current newspaper. Shows "Subscribe". Users with an active subscription see "Subscribed until [date]" instead.
- **User profile page:** Subscription status section listing active newspaper subscriptions and a subscribe option for the current newspaper.

Both trigger `POST /:newspaperSlug/subscription/request` and display: "Check your email for your subscription QR code."

### Paywall overlay

When the backend returns `403` with `code: "SUBSCRIPTION_REQUIRED"`, the article page renders a paywall overlay over the body:
- Message: "This article is for subscribers only."
- "Subscribe" button → triggers the request flow above
- Unauthenticated users are redirected to login first

### Subscriber-only badge

Article cards on the homepage, category pages, and search results display a small "Subscriber only" badge when `isSubscriberOnly = true`. Visitors and non-subscribers can still see the article preview (perex) — the full content is gated.

### Manager UI

On the article management/approval page, a toggle is added: "Restrict to subscribers only." This sets `isSubscriberOnly` via the existing article update endpoint.

### Subscription confirmation page

The route `/:newspaperSlug/subscription/confirm` (loaded when the user scans the QR code) calls the confirm endpoint and renders:
- Success: "Subscription activated! Valid until [date]."
- Already used: "This QR code has already been used."
- Expired token: "This QR code has expired. Please request a new one."

## Testing

### Unit tests (backend)

- Token redemption: valid token, already-used token, expired token
- Subscription extension: new subscription creation vs. extending existing (verify expiry extends from current `expiresAt`)
- Cron query: correctly identifies subscriptions expiring within 3 days; skips those with a pending unused token

### E2E tests (Playwright)

- Full subscribe flow: registered user hits subscriber-only article → paywall → subscribes → confirms token via URL → article accessible
- Renewal flow: simulate near-expiry subscription → confirm renewal email triggered → redeem token → expiry extended
- Manager marks article as subscriber-only → non-subscriber sees paywall, subscriber sees full content

> QR scanning itself is not automatable in Playwright; the confirm endpoint is called directly via URL in tests, which covers all meaningful logic.
