# Article Email Notifications — Design Spec

**Date:** 2026-06-01

## Overview

Extend the email communication system to notify relevant users at every article state transition. Currently emails are only sent for account actions (verification, password reset, subscription). This feature adds workflow notifications so editors, managers, directors, and authors are informed without having to poll the dashboard.

## Notification Triggers

| Trigger | State change | Author | Editor | Managers | Director |
|---|---|---|---|---|---|
| Author submits | DRAFT → SUBMITTED | — | — | ✓ new article awaiting assignment | — |
| Manager assigns editor | SUBMITTED → IN_REVIEW | ✓ now under review | ✓ assigned to review | — | — |
| Editor approves | IN_REVIEW → APPROVED_BY_EDITOR | ✓ approved by editor | — | ✓ ready for manager decision | — |
| Editor rejects | IN_REVIEW → REJECTED | ✓ rejected + feedback | — | — | — |
| Editor requests revision | IN_REVIEW → DRAFT | ✓ revision needed + feedback | — | — | — |
| Manager approves | APPROVED_BY_EDITOR → APPROVED_BY_MANAGER | ✓ approved by manager | — | — | ✓ ready for director approval |
| Manager rejects | APPROVED_BY_EDITOR → REJECTED | ✓ rejected + feedback | — | — | — |
| Manager requests revision | APPROVED_BY_EDITOR → DRAFT | ✓ revision needed + feedback | — | — | — |
| Director approves | APPROVED_BY_MANAGER → APPROVED_BY_DIRECTOR | ✓ approved by director | — | — | — |
| Director rejects | APPROVED_BY_MANAGER → REJECTED | ✓ rejected + feedback | — | — | — |
| Director requests revision | APPROVED_BY_MANAGER → DRAFT | ✓ revision needed + feedback | — | — | — |
| Article published | APPROVED_BY_DIRECTOR → PUBLISHED | ✓ article is live | — | — | — |

## Architecture

### New file: `src/services/notifications.ts`

Owns all notification routing logic. Called by the relevant service function after the state transition commits. Email sending is fire-and-forget — failures are caught, logged, and never propagate to the API response.

**Exported functions:**

```ts
notifyArticleSubmitted(tx, article, newspaper)
// Looks up all NEWSPAPER_MANAGER users for the newspaper → sends sendManagerArticleReadyEmail to each

notifyEditorAssigned(tx, article, editor, newspaper)
// Sends sendEditorAssignmentEmail to the assigned editor
// Sends sendAuthorStateChangeEmail("IN_REVIEW") to the author

notifyEditorReviewed(tx, article, newState, feedback, reviewerName)
// Always sends sendAuthorStateChangeEmail(newState, feedback, reviewerName) to the author
// If newState is APPROVED_BY_EDITOR, also looks up managers → sends sendManagerArticleReadyEmail to each

notifyManagerApproved(tx, article, newState, feedback, reviewerName)
// Always sends sendAuthorStateChangeEmail(newState, feedback, reviewerName) to the author
// If newState is APPROVED_BY_MANAGER, also looks up DIRECTOR users → sends sendDirectorArticleReadyEmail to each

notifyDirectorApproved(tx, article, newState, feedback, reviewerName)
// Sends sendAuthorStateChangeEmail(newState, feedback, reviewerName) to the author

notifyArticlePublished(tx, article)
// Sends sendAuthorStateChangeEmail("PUBLISHED") to the author
```

### Changes to `src/utils/email.ts`

Four new template functions:

```ts
sendAuthorStateChangeEmail(to, articleTitle, newState, feedback?, reviewerName?)
sendEditorAssignmentEmail(to, articleTitle, articleLink)
sendManagerArticleReadyEmail(to, articleTitle, articleLink)
sendDirectorArticleReadyEmail(to, articleTitle, articleLink)
```

Article links follow the existing `FRONTEND_URL` + newspaper slug + article ID pattern.

### Service function call sites

Each existing service function gains a single notification call after its state transition:

| Service function | Notification call |
|---|---|
| `submitArticle` | `notifyArticleSubmitted` |
| `assignEditor` | `notifyEditorAssigned` |
| `reviewArticle` | `notifyEditorReviewed` |
| `approveArticle` (manager path) | `notifyManagerApproved` |
| `approveArticle` (director path) | `notifyDirectorApproved` |
| `publishArticle` | `notifyArticlePublished` |

## Email Content

### Author state change (`sendAuthorStateChangeEmail`)

Subject and body vary by `newState`:

| newState | Subject | Body notes |
|---|---|---|
| `IN_REVIEW` | "Your article '[title]' is now under review" | Editor assigned, no action needed |
| `APPROVED_BY_EDITOR` | "Your article '[title]' has been approved by the editor" | Progressing up the chain |
| `APPROVED_BY_MANAGER` | "Your article '[title]' has been approved by the manager" | Progressing up the chain |
| `APPROVED_BY_DIRECTOR` | "Your article '[title]' has been approved by the director" | Awaiting publication |
| `PUBLISHED` | "Your article '[title]' is now live!" | Includes link to the published article |
| `REJECTED` | "Your article '[title]' has been rejected" | Includes reviewer name and feedback if provided |
| `DRAFT` (revision) | "Revisions requested for '[title]'" | Includes reviewer name and feedback if provided |

### Editor assignment (`sendEditorAssignmentEmail`)

Subject: *"You have been assigned to review '[title]'"*  
Body: article title, assigned-by info, link to the article in the review queue.

### Manager ready (`sendManagerArticleReadyEmail`)

Subject: *"A new article is ready for your review: '[title]'"*  
Used for both initial submission and after editor approval. Includes link to the review queue.

### Director ready (`sendDirectorArticleReadyEmail`)

Subject: *"An article is ready for your approval: '[title]'"*  
Includes link to the review queue.

## Error Handling & Edge Cases

- **Email failures are non-fatal.** All notification calls are wrapped in `try/catch`. Errors are logged via the existing `logger` utility; the API response is unaffected.
- **Missing email address.** If a user has no email stored, that recipient is skipped silently.
- **Multiple managers or directors.** All users with the relevant role in the newspaper are queried from `userRoles` and each receives an email.
- **No managers or directors found.** Logged as a warning, not an error.
- **Feedback is optional.** If a reviewer submits no note, the feedback section is omitted from the author email rather than displaying blank.
- **No DB migrations required.** All data needed (user emails, article titles, newspaper slugs) is in existing tables.
