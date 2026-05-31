# E2E Test Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 10 Playwright E2E test files covering visitor, registered-user, and author flows as specified in `docs/superpowers/specs/2026-05-03-e2e-test-suite-design.md`.

**Architecture:** Each test is fully independent (Approach A) — navigates from scratch, logs in via the UI helper when needed. Tests grouped by role into subdirectories. All use Playwright accessible locators (`getByLabel`, `getByRole`, `getByText`, `getByPlaceholder`).

**Tech Stack:** Playwright, Bun, TypeScript

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `tests/.env.example` | Add author credentials |
| Create | `tests/e2e/visitor/homepage.spec.ts` | Homepage loading, articles, category nav |
| Create | `tests/e2e/visitor/search.spec.ts` | Search bar, results, no-results |
| Create | `tests/e2e/visitor/registration.spec.ts` | Sign up, verification message, duplicate email |
| Create | `tests/e2e/registered-user/article-view.spec.ts` | Full article page after login |
| Create | `tests/e2e/registered-user/comments.spec.ts` | Post comment, empty comment |
| Create | `tests/e2e/registered-user/likes.spec.ts` | Like/unlike toggle |
| Create | `tests/e2e/registered-user/profile.spec.ts` | View and edit profile |
| Create | `tests/e2e/author/dashboard.spec.ts` | Author dashboard, article list |
| Create | `tests/e2e/author/create-article.spec.ts` | Create article draft |
| Create | `tests/e2e/author/edit-article.spec.ts` | Edit existing draft |

---

### Task 1: Update .env.example with author credentials

**Files:**
- Modify: `tests/.env.example`

- [ ] **Step 1: Update the env example file**

Replace the contents of `tests/.env.example` with:

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

- [ ] **Step 2: Commit**

```bash
git add tests/.env.example
git commit -m "chore: add author credentials to .env.example"
```

---

### Task 2: Visitor — Homepage test

**Files:**
- Create: `tests/e2e/visitor/homepage.spec.ts`

- [ ] **Step 1: Create the test file**

```ts
import { test, expect } from "@playwright/test";

const newspaper = process.env.TEST_NEWSPAPER!;

test.describe("Homepage", () => {
  test("loads and displays the newspaper name", async ({ page }) => {
    await page.goto(`/${newspaper}`);
    await expect(page.locator("header")).toContainText(
      newspaper.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    );
  });

  test("displays at least one article card with title and perex", async ({ page }) => {
    await page.goto(`/${newspaper}`);
    const articleCards = page.locator("[class*='rounded-xl'][class*='border'][class*='cursor-pointer']");
    await expect(articleCards.first()).toBeVisible();
    await expect(articleCards.first().locator("p.font-bold")).toBeVisible();
  });

  test("clicking a category filters the page", async ({ page }) => {
    await page.goto(`/${newspaper}`);
    const categoryLink = page.locator("header nav a").filter({ hasNotText: "Home" }).first();
    const categoryName = await categoryLink.textContent();
    await categoryLink.click();
    await expect(page).toHaveURL(new RegExp(`/${newspaper}/category/`));
    await expect(page.locator("body")).toContainText(categoryName!);
  });
});
```

- [ ] **Step 2: Run to verify tests pass against a running stack**

Run: `cd tests && bunx playwright test e2e/visitor/homepage.spec.ts --reporter=line`

Expected: 3 tests pass (assuming the stack is running with seed data)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/visitor/homepage.spec.ts
git commit -m "test: add homepage e2e tests"
```

---

### Task 3: Visitor — Search test

**Files:**
- Create: `tests/e2e/visitor/search.spec.ts`

- [ ] **Step 1: Create the test file**

```ts
import { test, expect } from "@playwright/test";

const newspaper = process.env.TEST_NEWSPAPER!;

test.describe("Search", () => {
  test("submits a query via the navbar search bar and shows results", async ({ page }) => {
    await page.goto(`/${newspaper}`);
    const searchInput = page.locator("header").getByPlaceholder("Search articles…");
    await searchInput.fill("a");
    await searchInput.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/${newspaper}/search\\?q=`));
    await expect(page.getByText("Search Results")).toBeVisible();
    await expect(page.getByText(/\d+ Result/)).toBeVisible();
  });

  test("displays no results message for nonsense query", async ({ page }) => {
    await page.goto(`/${newspaper}/search?q=xyznonexistent999`);
    await expect(page.getByText(/No results found for/)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run to verify**

Run: `cd tests && bunx playwright test e2e/visitor/search.spec.ts --reporter=line`

Expected: 2 tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/visitor/search.spec.ts
git commit -m "test: add search e2e tests"
```

---

### Task 4: Visitor — Registration test

**Files:**
- Create: `tests/e2e/visitor/registration.spec.ts`

- [ ] **Step 1: Create the test file**

```ts
import { test, expect } from "@playwright/test";

const newspaper = process.env.TEST_NEWSPAPER!;
const existingEmail = process.env.TEST_EMAIL!;

test.describe("Registration", () => {
  test("registers a new user and shows verification message", async ({ page }) => {
    await page.goto(`/${newspaper}/register`);
    const uniqueEmail = `test+${Date.now()}@example.com`;
    const uniqueUsername = `testuser${Date.now()}`;

    await page.getByLabel("Full Name").fill("E2E Test User");
    await page.getByLabel("Username").fill(uniqueUsername);
    await page.getByLabel("Email Address").fill(uniqueEmail);
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm Password").fill("password123");
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page.getByText("Check your email")).toBeVisible();
    await expect(page.getByText(uniqueEmail)).toBeVisible();
  });

  test("shows error when registering with an existing email", async ({ page }) => {
    await page.goto(`/${newspaper}/register`);

    await page.getByLabel("Username").fill(`dup${Date.now()}`);
    await page.getByLabel("Email Address").fill(existingEmail);
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm Password").fill("password123");
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page.getByText("This email is already registered")).toBeVisible();
  });
});
```

- [ ] **Step 2: Run to verify**

Run: `cd tests && bunx playwright test e2e/visitor/registration.spec.ts --reporter=line`

Expected: 2 tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/visitor/registration.spec.ts
git commit -m "test: add registration e2e tests"
```

---

### Task 5: Registered User — Article view test

**Files:**
- Create: `tests/e2e/registered-user/article-view.spec.ts`

- [ ] **Step 1: Create the test file**

```ts
import { test, expect } from "@playwright/test";
import { login } from "../helpers/auth";

const newspaper = process.env.TEST_NEWSPAPER!;
const email = process.env.TEST_EMAIL!;
const password = process.env.TEST_PASSWORD!;

test.describe("Article view", () => {
  test("opens an article from the homepage and displays full content", async ({ page }) => {
    await login(page, newspaper, email, password);
    await page.goto(`/${newspaper}`);

    const firstArticleCard = page.locator("[class*='rounded-xl'][class*='border'][class*='cursor-pointer']").first();
    const articleTitle = await firstArticleCard.locator("p.font-bold").textContent();
    await firstArticleCard.click();

    await expect(page).toHaveURL(new RegExp(`/${newspaper}/articles/`));
    await expect(page.locator("h1")).toContainText(articleTitle!.trim());
    await expect(page.getByText(/By /)).toBeVisible();
    await expect(page.getByText(/Comments \(/)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run to verify**

Run: `cd tests && bunx playwright test e2e/registered-user/article-view.spec.ts --reporter=line`

Expected: 1 test passes

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/registered-user/article-view.spec.ts
git commit -m "test: add article view e2e test"
```

---

### Task 6: Registered User — Comments test

**Files:**
- Create: `tests/e2e/registered-user/comments.spec.ts`

- [ ] **Step 1: Create the test file**

```ts
import { test, expect } from "@playwright/test";
import { login } from "../helpers/auth";

const newspaper = process.env.TEST_NEWSPAPER!;
const email = process.env.TEST_EMAIL!;
const password = process.env.TEST_PASSWORD!;

test.describe("Comments", () => {
  test("posts a comment on an article", async ({ page }) => {
    await login(page, newspaper, email, password);
    await page.goto(`/${newspaper}`);

    const firstArticleCard = page.locator("[class*='rounded-xl'][class*='border'][class*='cursor-pointer']").first();
    await firstArticleCard.click();
    await expect(page).toHaveURL(new RegExp(`/${newspaper}/articles/`));

    const commentText = `E2E comment ${Date.now()}`;
    await page.getByPlaceholder("Write a comment…").fill(commentText);
    await page.getByRole("button", { name: "Post comment" }).click();

    await expect(page.getByText(commentText)).toBeVisible();
  });

  test("post comment button is disabled when textarea is empty", async ({ page }) => {
    await login(page, newspaper, email, password);
    await page.goto(`/${newspaper}`);

    const firstArticleCard = page.locator("[class*='rounded-xl'][class*='border'][class*='cursor-pointer']").first();
    await firstArticleCard.click();
    await expect(page).toHaveURL(new RegExp(`/${newspaper}/articles/`));

    const postButton = page.getByRole("button", { name: "Post comment" });
    await expect(postButton).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run to verify**

Run: `cd tests && bunx playwright test e2e/registered-user/comments.spec.ts --reporter=line`

Expected: 2 tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/registered-user/comments.spec.ts
git commit -m "test: add comments e2e tests"
```

---

### Task 7: Registered User — Likes test

**Files:**
- Create: `tests/e2e/registered-user/likes.spec.ts`

- [ ] **Step 1: Create the test file**

```ts
import { test, expect } from "@playwright/test";
import { login } from "../helpers/auth";

const newspaper = process.env.TEST_NEWSPAPER!;
const email = process.env.TEST_EMAIL!;
const password = process.env.TEST_PASSWORD!;

test.describe("Likes", () => {
  test("likes and unlikes an article", async ({ page }) => {
    await login(page, newspaper, email, password);
    await page.goto(`/${newspaper}`);

    const firstArticleCard = page.locator("[class*='rounded-xl'][class*='border'][class*='cursor-pointer']").first();
    await firstArticleCard.click();
    await expect(page).toHaveURL(new RegExp(`/${newspaper}/articles/`));

    const likeButton = page.locator("button").filter({ hasText: /Like/ });
    const initialText = await likeButton.textContent();
    const initialCount = parseInt(initialText!.match(/\d+/)?.[0] ?? "0", 10);

    await likeButton.click();
    await expect(likeButton).toContainText(String(initialCount + 1));

    await likeButton.click();
    await expect(likeButton).toContainText(String(initialCount));
  });
});
```

Note: This test assumes the user has not already liked the article. If they have, the first click unlikes and the assertion reverses. For seed data reliability, ensure the test user has not pre-liked the first article.

- [ ] **Step 2: Run to verify**

Run: `cd tests && bunx playwright test e2e/registered-user/likes.spec.ts --reporter=line`

Expected: 1 test passes

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/registered-user/likes.spec.ts
git commit -m "test: add likes e2e test"
```

---

### Task 8: Registered User — Profile test

**Files:**
- Create: `tests/e2e/registered-user/profile.spec.ts`

- [ ] **Step 1: Create the test file**

```ts
import { test, expect } from "@playwright/test";
import { login } from "../helpers/auth";

const newspaper = process.env.TEST_NEWSPAPER!;
const email = process.env.TEST_EMAIL!;
const password = process.env.TEST_PASSWORD!;

test.describe("User profile", () => {
  test("displays current user info", async ({ page }) => {
    await login(page, newspaper, email, password);
    await page.goto(`/${newspaper}/profile`);

    await expect(page.getByText("My Profile")).toBeVisible();
    await expect(page.getByLabel("Email Address")).toHaveValue(email);
  });

  test("updates first name and persists after reload", async ({ page }) => {
    await login(page, newspaper, email, password);
    await page.goto(`/${newspaper}/profile`);

    const newFirstName = `E2E${Date.now()}`;
    await page.getByLabel("First Name").fill(newFirstName);
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Profile updated successfully")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("First Name")).toHaveValue(newFirstName);
  });
});
```

- [ ] **Step 2: Run to verify**

Run: `cd tests && bunx playwright test e2e/registered-user/profile.spec.ts --reporter=line`

Expected: 2 tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/registered-user/profile.spec.ts
git commit -m "test: add profile e2e tests"
```

---

### Task 9: Author — Dashboard test

**Files:**
- Create: `tests/e2e/author/dashboard.spec.ts`

- [ ] **Step 1: Create the test file**

```ts
import { test, expect } from "@playwright/test";
import { login } from "../helpers/auth";

const newspaper = process.env.TEST_NEWSPAPER!;
const authorEmail = process.env.TEST_AUTHOR_EMAIL!;
const authorPassword = process.env.TEST_AUTHOR_PASSWORD!;

test.describe("Author dashboard", () => {
  test("loads and displays articles with titles and statuses", async ({ page }) => {
    await login(page, newspaper, authorEmail, authorPassword);
    await page.goto(`/${newspaper}/author-dashboard?section=my-articles`);

    await expect(page.getByText("All Articles")).toBeVisible();

    const articleRow = page.locator("span.font-semibold").filter({ hasNotText: /All Articles|New Article|Filter by Status/ }).first();
    await expect(articleRow).toBeVisible();

    const statusBadge = page.locator("[class*='rounded-full'][class*='font-semibold']").first();
    await expect(statusBadge).toBeVisible();
  });
});
```

- [ ] **Step 2: Run to verify**

Run: `cd tests && bunx playwright test e2e/author/dashboard.spec.ts --reporter=line`

Expected: 1 test passes

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/author/dashboard.spec.ts
git commit -m "test: add author dashboard e2e test"
```

---

### Task 10: Author — Create article test

**Files:**
- Create: `tests/e2e/author/create-article.spec.ts`

- [ ] **Step 1: Create the test file**

```ts
import { test, expect } from "@playwright/test";
import { login } from "../helpers/auth";

const newspaper = process.env.TEST_NEWSPAPER!;
const authorEmail = process.env.TEST_AUTHOR_EMAIL!;
const authorPassword = process.env.TEST_AUTHOR_PASSWORD!;

test.describe("Create article", () => {
  test("creates a new draft article", async ({ page }) => {
    await login(page, newspaper, authorEmail, authorPassword);
    await page.goto(`/${newspaper}/articles/new`);

    const title = `E2E Article ${Date.now()}`;
    await page.locator("input[placeholder='Article title…']").fill(title);
    await page.locator("textarea[placeholder*='Short introduction']").fill("E2E test perex content");

    const categorySelect = page.locator("select").first();
    await categorySelect.selectOption({ index: 1 });

    await page.getByRole("button", { name: "Save Draft" }).click();

    await expect(page).toHaveURL(new RegExp(`/${newspaper}/articles/.+/edit`));
  });

  test("shows error when saving with empty title", async ({ page }) => {
    await login(page, newspaper, authorEmail, authorPassword);
    await page.goto(`/${newspaper}/articles/new`);

    await page.getByRole("button", { name: "Save Draft" }).click();

    await expect(page.getByText("Title is required")).toBeVisible();
  });
});
```

- [ ] **Step 2: Run to verify**

Run: `cd tests && bunx playwright test e2e/author/create-article.spec.ts --reporter=line`

Expected: 2 tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/author/create-article.spec.ts
git commit -m "test: add create article e2e tests"
```

---

### Task 11: Author — Edit article test

**Files:**
- Create: `tests/e2e/author/edit-article.spec.ts`

- [ ] **Step 1: Create the test file**

```ts
import { test, expect } from "@playwright/test";
import { login } from "../helpers/auth";

const newspaper = process.env.TEST_NEWSPAPER!;
const authorEmail = process.env.TEST_AUTHOR_EMAIL!;
const authorPassword = process.env.TEST_AUTHOR_PASSWORD!;

test.describe("Edit article", () => {
  test("edits a draft article title from the dashboard", async ({ page }) => {
    await login(page, newspaper, authorEmail, authorPassword);
    await page.goto(`/${newspaper}/author-dashboard?section=my-articles&status=DRAFT`);

    const editLink = page.locator("a[aria-label='Edit article']").first();
    await expect(editLink).toBeVisible();
    await editLink.click();

    await expect(page).toHaveURL(new RegExp(`/${newspaper}/articles/.+/edit`));

    const titleInput = page.locator("input[placeholder='Article title…']");
    const updatedTitle = `Edited E2E ${Date.now()}`;
    await titleInput.fill(updatedTitle);

    await page.getByRole("button", { name: "Save Draft" }).click();
    await page.waitForTimeout(1000);

    await page.goto(`/${newspaper}/author-dashboard?section=my-articles&status=DRAFT`);
    await expect(page.getByText(updatedTitle)).toBeVisible();
  });
});
```

Note: This test uses `waitForTimeout(1000)` as a pragmatic buffer for the save operation to complete before navigating. Ideally this would wait for a network response, but for simplicity in a learning context this is acceptable.

- [ ] **Step 2: Run to verify**

Run: `cd tests && bunx playwright test e2e/author/edit-article.spec.ts --reporter=line`

Expected: 1 test passes

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/author/edit-article.spec.ts
git commit -m "test: add edit article e2e test"
```

---

### Task 12: Final run — all tests

- [ ] **Step 1: Run the entire E2E suite**

Run: `cd tests && bunx playwright test --reporter=line`

Expected: All 19 tests pass (2 existing login + 3 homepage + 2 search + 2 registration + 1 article-view + 2 comments + 1 likes + 2 profile + 1 dashboard + 2 create-article + 1 edit-article)

- [ ] **Step 2: Commit all remaining work**

```bash
git add -A tests/
git commit -m "test: complete e2e test suite for tier 1 + tier 2 flows"
```
