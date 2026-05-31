# E2E Tests: Rejection Workflow & Admin Role Management

**Date:** 2026-05-25
**Scope:** Two new Playwright test files covering article rejection/revision cycles and system admin role assignment.

---

## Context

The existing e2e suite (`tests/e2e/`) covers happy-path flows for visitors, authors, registered users, and the full approval workflow. Two significant gaps remain:

1. **No rejection or revision tests** — the article state machine includes `REJECTED` and the ability to resubmit, but no test exercises this path.
2. **No admin role management tests** — the system admin UI for assigning/removing newspaper roles has zero coverage.

---

## Approach

Follow the existing file-per-domain convention. Two new files, no refactoring of existing helpers.

**Framework:** Playwright (TypeScript), Chromium only — matches existing config at `tests/playwright.config.ts`.

**Credentials used:**
| Actor | Email | Password | Role |
|-------|-------|----------|------|
| Jan Novak | `jan.novak@claudedaily.cz` | `test1234` | AUTHOR |
| Emma Bednarikova | `emma.bednarikova@email.cz` | `test1234` | NEWSPAPER_MANAGER + EDITOR |
| System Admin | `admin@admin.cz` | `admin1234` | SYSTEM_ADMINISTRATOR |

---

## File 1: `tests/e2e/article-rejection-workflow.spec.ts`

### Test 1 — Editor rejects → author revises and resubmits

**Steps:**
1. Jan logs in, creates a draft article (unique title via `Date.now()`), uploads cover image, submits for review
2. Emma logs in, assigns herself as editor from the editorial queue
3. Emma opens the review queue, switches decision to **Reject**, enters a rejection note, submits
4. Jan navigates to `author-dashboard?section=my-articles&status=REJECTED` — article is visible
5. Jan opens the article edit page, edits the body, clicks **Submit for Review**
6. Jan navigates to `author-dashboard?section=my-articles&status=SUBMITTED` — article is visible again

**Verifies:** `REJECTED` state is reachable at the editor step; author can resubmit after rejection.

---

### Test 2 — Manager rejects after editor approval

**Steps:**
1. Jan creates a second draft article, uploads cover image, submits for review
2. Emma assigns herself as editor, approves in the review queue (same as approval workflow steps 4–5)
3. Emma opens the editorial queue as manager, switches decision to **Reject**, submits
4. Jan navigates to `author-dashboard?section=my-articles&status=REJECTED` — article is visible

**Verifies:** Rejection can occur at the manager approval step, not only at the editor step.

---

### Helpers

- `loginNewspaper(page, email, password)` — copied inline from `article-approval-workflow.spec.ts` (same pattern)
- `createAndSubmitArticle(page, title)` — local helper that encapsulates: fill title/perex/body, select category, save draft, upload cover image, submit for review. Reused by both tests to avoid duplication.

---

## File 2: `tests/e2e/admin/role-management.spec.ts`

### Test 1 — Assign a newspaper role

**Steps:**
1. Admin logs in at `/admin` — waits for redirect to `/admin/dashboard`
2. Navigates to the newspaper users section for ClaudeDaily
3. Locates a user row that does not yet have the `AUTHOR` role
4. Clicks **Assign Role**, selects `AUTHOR` from the dropdown, confirms
5. Verifies the `AUTHOR` badge appears in the user's row

**Verifies:** System admin can grant a newspaper-scoped role via the UI.

---

### Test 2 — Remove a newspaper role

**Steps:**
1. Admin logs in (same setup as Test 1)
2. Navigates to the same user who has the `AUTHOR` role (either from Test 1 state or a user pre-seeded with the role)
3. Clicks the remove/revoke button next to the `AUTHOR` role badge
4. Verifies the `AUTHOR` badge is no longer present in the user's row

**Verifies:** System admin can revoke a newspaper-scoped role via the UI.

---

### Helpers

- `loginAdmin(page)` — navigates to `/admin`, fills `admin@admin.cz` / `admin1234`, waits for `/admin/dashboard`

---

## Out of Scope

- Director rejection (covered implicitly by the manager rejection pattern — same UI component)
- Email verification and password reset flows
- Statistics section tests
- Profile picture upload
- Pagination and search filter edge cases

---

## File Locations

```
tests/e2e/
  article-rejection-workflow.spec.ts   ← new
  admin/
    role-management.spec.ts            ← new
```
