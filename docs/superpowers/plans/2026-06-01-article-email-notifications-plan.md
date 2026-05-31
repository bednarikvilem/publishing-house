# Article Email Notifications — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-06-01-article-email-notifications-design.md`  
**Date:** 2026-06-01

## Overview

Three files change: `src/utils/email.ts` (new templates), `src/services/notifications.ts` (new file, notification routing), `src/services/articles.ts` (wire in notification calls). No DB migrations, no frontend changes.

---

## Step 1 — Add email templates to `src/utils/email.ts`

Add four new exported functions after the existing ones.

### `sendAuthorStateChangeEmail`

```ts
export async function sendAuthorStateChangeEmail(
    to: string,
    articleTitle: string,
    newState: string,
    feedback?: string | null,
    reviewerName?: string | null,
): Promise<void>
```

Subject and body switch on `newState`:

| newState | Subject |
|---|---|
| `IN_REVIEW` | `Your article "${articleTitle}" is now under review` |
| `APPROVED_BY_EDITOR` | `Your article "${articleTitle}" has been approved by the editor` |
| `APPROVED_BY_MANAGER` | `Your article "${articleTitle}" has been approved by the manager` |
| `APPROVED_BY_DIRECTOR` | `Your article "${articleTitle}" has been approved by the director` |
| `PUBLISHED` | `Your article "${articleTitle}" is now live!` |
| `REJECTED` | `Your article "${articleTitle}" has been rejected` |
| `DRAFT` (revision) | `Revisions requested for "${articleTitle}"` |

Body always mentions the article title. For `REJECTED` and `DRAFT`, append reviewer name and feedback block if provided. For `PUBLISHED`, include a link to the article.

### `sendEditorAssignmentEmail`

```ts
export async function sendEditorAssignmentEmail(
    to: string,
    articleTitle: string,
    dashboardLink: string,
): Promise<void>
```

Subject: `You have been assigned to review "${articleTitle}"`  
Body: article title, link button to the newspaper dashboard (`/{slug}/author-dashboard`).

### `sendManagerArticleReadyEmail`

```ts
export async function sendManagerArticleReadyEmail(
    to: string,
    articleTitle: string,
    dashboardLink: string,
): Promise<void>
```

Subject: `A new article is ready for your review: "${articleTitle}"`  
Body: article title, link button to the newspaper dashboard (`/{slug}/author-dashboard`).

### `sendDirectorArticleReadyEmail`

```ts
export async function sendDirectorArticleReadyEmail(
    to: string,
    articleTitle: string,
    dashboardLink: string,
): Promise<void>
```

Subject: `An article is ready for your approval: "${articleTitle}"`  
Body: article title, link button to the director dashboard (`/director/dashboard`).

---

## Step 2 — Create `src/services/notifications.ts`

New file. Imports: `users`, `userRoles`, `newspapers` from schema; all four new email functions from `email.ts`; `logger` from `utils/logger`; `eq`, `and` from `drizzle-orm`; `Tx` from `db/rls`.

All functions return `Promise<void>` and wrap their entire body in `try/catch`, logging errors via `logger.warn`. They never throw.

### Link helpers (module-private)

```ts
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";

function newspaperDashboardLink(slug: string): string {
    return `${frontendUrl}/${slug}/author-dashboard`;
}

function directorDashboardLink(): string {
    return `${frontendUrl}/director/dashboard`;
}

function articleLink(slug: string, articleId: string): string {
    return `${frontendUrl}/${slug}/articles/${articleId}`;
}
```

### Helper: `getNewspaperSlug(tx, newspaperId)`

Queries `newspapers` by ID, returns `slug`. Used internally by notification functions that don't already have the newspaper object.

### Helper: `getManagerEmails(tx, newspaperId)`

Queries `userRoles` where `role = 'NEWSPAPER_MANAGER'` and `newspaperId = newspaperId`, joins with `users`, returns array of `{ email, fullname }`.

### Helper: `getDirectorEmails(tx)`

Queries `userRoles` where `role = 'DIRECTOR'`, joins with `users`, returns array of `{ email, fullname }`.

### `notifyArticleSubmitted(tx, article, newspaper)`

Calls `getManagerEmails`, sends `sendManagerArticleReadyEmail` to each with `newspaperDashboardLink(newspaper.slug)`.

### `notifyEditorAssigned(tx, article, editor, newspaper)`

1. Look up author user by `article.authorId` → send `sendAuthorStateChangeEmail(author.email, article.title, "IN_REVIEW")`
2. Send `sendEditorAssignmentEmail(editor.email, article.title, newspaperDashboardLink(newspaper.slug))`

### `notifyEditorReviewed(tx, article, newState, feedback, reviewerName)`

1. Look up author → send `sendAuthorStateChangeEmail(author.email, article.title, newState, feedback, reviewerName)`
2. If `newState === "APPROVED_BY_EDITOR"`: call `getManagerEmails`, send `sendManagerArticleReadyEmail` to each

Needs newspaper slug for manager link: call `getNewspaperSlug(tx, article.newspaperId)`.

### `notifyManagerApproved(tx, article, newState, feedback, reviewerName)`

1. Look up author → send `sendAuthorStateChangeEmail`
2. If `newState === "APPROVED_BY_MANAGER"`: call `getDirectorEmails`, send `sendDirectorArticleReadyEmail` to each with `directorDashboardLink()`

### `notifyDirectorApproved(tx, article, newState, feedback, reviewerName)`

Look up author → send `sendAuthorStateChangeEmail(author.email, article.title, newState, feedback, reviewerName)`.

### `notifyArticlePublished(tx, article)`

Look up author → get newspaper slug → send `sendAuthorStateChangeEmail(author.email, article.title, "PUBLISHED")` with article link embedded in the email body (pass as extra arg or handle inside `sendAuthorStateChangeEmail` using the `articleLink` helper — see note below).

**Note on article link for PUBLISHED state:** `sendAuthorStateChangeEmail` needs the article link only for the `PUBLISHED` case. Pass an optional `articleLink?: string` parameter; when present and state is `PUBLISHED`, include it in the email body.

---

## Step 3 — Wire notifications into `src/services/articles.ts`

Add `import * as notifications from "./notifications"` at the top.

Each call is a plain `await` — the notification functions never throw.

### `submitArticle`

After the `audit(...)` call at the end, add:

```ts
await notifications.notifyArticleSubmitted(tx, article!, newspaper!);
```

`newspaper` is already queried earlier in the function.

### `assignEditor`

After `audit(...)`, add:

```ts
await notifications.notifyEditorAssigned(tx, article, editor!, newspaper!);
```

`newspaper` needs to be queried — add a lookup by `newspaperId` at the start of the function (it's not currently fetched). `editor` is already fetched via `tx.query.users.findFirst`.

Actually `assignEditor` does not currently query the newspaper. Add:
```ts
const newspaper = await tx.query.newspapers.findFirst({ where: eq(newspapers.id, newspaperId) });
if (!newspaper) throw new NotFoundError("NEWSPAPER_NOT_FOUND");
```
at the top of the function after the article lookup.

### `reviewArticle`

After `audit(...)`, add:

```ts
await notifications.notifyEditorReviewed(tx, article, newState, body.note ?? null, user.fullname ?? null);
```

`user.fullname` — the reviewer's name. Access via `user` which is the `AuthUser` already in scope; `AuthUser` has `id` but may not have `fullname`. Check `context.ts` for the shape of `AuthUser`.

If `fullname` is not on `AuthUser`, look it up: `const reviewer = await tx.query.users.findFirst({ where: eq(users.id, user.id) })`.

### `approveArticle`

After `audit(...)`, add:

```ts
if (effectiveRole === "NEWSPAPER_MANAGER") {
    await notifications.notifyManagerApproved(tx, article, nextState, body.note ?? null, reviewerFullname);
} else {
    await notifications.notifyDirectorApproved(tx, article, nextState, body.note ?? null, reviewerFullname);
}
```

Look up `reviewerFullname` the same way as in `reviewArticle`.

### `publishArticle`

After the `tx.update(...)` call, add:

```ts
await notifications.notifyArticlePublished(tx, article);
```

---

## Step 4 — Check `AuthUser` shape for fullname

File: `src/services/context.ts`

Verify whether `AuthUser` includes `fullname`. If not, the notification calls in Steps 3b/3c need a single `users.findFirst` lookup to get the reviewer's display name. Update the notification call sites accordingly.

---

## Checklist

- [ ] Step 1: Add 4 email template functions to `email.ts`
- [ ] Step 2: Create `notifications.ts` with helpers + 6 notification functions
- [ ] Step 3a: Wire `notifyArticleSubmitted` into `submitArticle`
- [ ] Step 3b: Add newspaper lookup + wire `notifyEditorAssigned` into `assignEditor`
- [ ] Step 3c: Wire `notifyEditorReviewed` into `reviewArticle`
- [ ] Step 3d: Wire `notifyManagerApproved` / `notifyDirectorApproved` into `approveArticle`
- [ ] Step 3e: Wire `notifyArticlePublished` into `publishArticle`
- [ ] Step 4: Verify `AuthUser` shape, fix reviewer name lookups if needed
