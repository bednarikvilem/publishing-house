# E2E Test Suite — Tier 1 + Tier 2

**Date:** 2026-05-03
**Status:** Approved

## Overview

Expand the Playwright E2E test suite with tests covering the most common use cases: visitor flows (homepage, search, registration), registered user flows (article viewing, comments, likes, profile), and author flows (dashboard, create article, edit article). Builds on the existing login test.

## Approach

Fully independent tests (Approach A). Every test navigates from scratch, logs in via the UI if needed. No shared state between tests. Simple to understand and debug.

## Environment Variables

`tests/.env.example` is extended with author credentials:

```
TEST_BASE_URL=http://localhost:5173
TEST_NEWSPAPER=your-newspaper-slug

# Registered user (seeded)
TEST_EMAIL=testuser@example.com
TEST_PASSWORD=password123

# Author (seeded, has AUTHOR role)
TEST_AUTHOR_EMAIL=author@example.com
TEST_AUTHOR_PASSWORD=password123
```

The seed data must include:
- A newspaper matching `TEST_NEWSPAPER`
- A registered user matching `TEST_EMAIL` / `TEST_PASSWORD`
- An author user matching `TEST_AUTHOR_EMAIL` / `TEST_AUTHOR_PASSWORD` with the AUTHOR role
- At least one published article with an image
- At least one draft article owned by the author
- At least one category

## File Structure

```
tests/e2e/
├── auth/
│   └── login.spec.ts                  ← existing
├── visitor/
│   ├── homepage.spec.ts
│   ├── search.spec.ts
│   └── registration.spec.ts
├── registered-user/
│   ├── article-view.spec.ts
│   ├── comments.spec.ts
│   ├── likes.spec.ts
│   └── profile.spec.ts
├── author/
│   ├── dashboard.spec.ts
│   ├── create-article.spec.ts
│   └── edit-article.spec.ts
└── helpers/
    └── auth.ts                        ← existing
```

## Conventions

- **No shared state** — every test opens a fresh page, navigates, and logs in independently
- **Selectors** — prefer Playwright accessible locators (`getByLabel`, `getByRole`, `getByText`) over CSS selectors
- **Assertions** — use `expect(page)` and `expect(locator)` with Playwright auto-waiting, no manual `waitForTimeout`
- **No cleanup** — tests don't delete data they create. Seed data is reset between full runs via `docker compose down -v` + re-seed
- **Login helper** — all authenticated tests use the existing `login(page, newspaper, email, password)` helper from `helpers/auth.ts`

## Test Specifications

### Visitor Flows

#### `visitor/homepage.spec.ts`
1. Navigate to `/{newspaper}` — assert the page loads, newspaper name is visible
2. Assert at least one article card is rendered (title + perex visible)
3. Click a category in the navigation — assert the URL changes and articles are filtered

#### `visitor/search.spec.ts`
1. Navigate to `/{newspaper}`, use the search bar in the navbar
2. Type a query, submit — assert redirect to search results page
3. Assert results are displayed (at least one result with title and perex)
4. Search for nonsense string — assert "no results" message appears

#### `visitor/registration.spec.ts`
1. Navigate to `/{newspaper}/register`
2. Fill in email (using a timestamp-based unique address like `test+{timestamp}@example.com`), username, full name, password — submit
3. Assert a confirmation/verification message is shown
4. Try registering with an already-taken email (`TEST_EMAIL`) — assert error message

### Registered User Flows

Each test starts by calling `login(page, newspaper, email, password)` with registered user credentials.

#### `registered-user/article-view.spec.ts`
1. Log in, navigate to homepage, click the first article card
2. Assert the article page loads with title, author name, content, and images
3. Assert the comments section is visible

#### `registered-user/comments.spec.ts`
1. Log in, navigate to a published article
2. Type a comment, submit — assert the comment appears on the page
3. Try submitting an empty comment — assert it doesn't go through

#### `registered-user/likes.spec.ts`
1. Log in, navigate to a published article
2. Click the like button — assert the like count increments
3. Click again to unlike — assert the count decrements

#### `registered-user/profile.spec.ts`
1. Log in, navigate to `/{newspaper}/profile`
2. Assert current user info is displayed (username, email)
3. Update the full name or bio, save — assert the updated value persists after page reload

### Author Flows

Each test starts by calling `login(page, newspaper, authorEmail, authorPassword)` with author credentials.

#### `author/dashboard.spec.ts`
1. Log in as author, navigate to `/{newspaper}/author-dashboard`
2. Assert the dashboard loads and displays a list of the author's articles (at least one)
3. Assert each article shows a title and status

#### `author/create-article.spec.ts`
1. Log in as author, navigate to `/{newspaper}/articles/new`
2. Fill in title, perex, content, select a category
3. Save the draft — assert redirect to the editor page or dashboard, and the new article appears
4. Try submitting with empty title — assert validation error

#### `author/edit-article.spec.ts`
1. Log in as author, navigate to the author dashboard
2. Click edit on an existing draft article
3. Change the title, save — assert the updated title is visible
4. Navigate back to the dashboard — assert the updated title appears in the list

## Out of Scope

- Editorial workflow tests (editor review, manager/director approval)
- Admin dashboard tests (role management, system config)
- `storageState` or global setup optimizations
- CI pipeline integration
- Test data lifecycle management (API-based setup/teardown)
- Firefox and WebKit browser projects
