# E2E Tests: Rejection Workflow & Admin Role Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two Playwright test files covering article rejection/revision cycles and system admin role assignment/removal.

**Architecture:** Follow the existing file-per-domain convention in `tests/e2e/`. Two new files, no refactoring of existing helpers. Each file is self-contained with inline helpers and uses `browser.newContext()` for multi-actor tests.

**Tech Stack:** Playwright (TypeScript), Chromium only, base URL `http://localhost:5173`.

---

## Reference: Seeded Credentials

| Actor | Email | Password | Roles |
|-------|-------|----------|-------|
| Jan Novak | `jan.novak@claudedaily.cz` | `test1234` | AUTHOR |
| Emma Bednarikova | `emma.bednarikova@email.cz` | `test1234` | NEWSPAPER_MANAGER, EDITOR |
| System Admin | `admin@admin.cz` | `admin1234` | SYSTEM_ADMINISTRATOR |
| Director | `director@claudedaily.cz` | `test1234` | DIRECTOR |

Newspaper slug: `claudedaily`. Cover image fixture: `tests/e2e/fixtures/test-cover.png`.

---

## Task 1: Article rejection by editor → author revises and resubmits

**Files:**
- Create: `tests/e2e/article-rejection-workflow.spec.ts`

- [ ] **Step 1: Create the file with shared constants and helpers**

```typescript
import { test, expect, type Page } from "@playwright/test";
import path from "path";

const NEWSPAPER = "claudedaily";
const BASE = "http://localhost:5173";

const JAN   = { email: "jan.novak@claudedaily.cz",       password: "test1234" };
const EMMA  = { email: "emma.bednarikova@email.cz",       password: "test1234" };

const FIXTURE_IMAGE = path.resolve(__dirname, "fixtures/test-cover.png");

async function loginNewspaper(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/${NEWSPAPER}/login`);
  await page.getByLabel("Email Address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"));
}

async function createAndSubmitArticle(page: Page, title: string): Promise<string> {
  await page.goto(`${BASE}/${NEWSPAPER}/articles/new`);
  await page.locator("input[placeholder='Article title…']").fill(title);
  await page.locator("textarea[placeholder*='Short introduction']").fill("E2E rejection test perex");
  await page.locator("[contenteditable='true']").click();
  await page.keyboard.type("E2E rejection test body.");
  await page.locator("select").first().selectOption({ index: 1 });
  await page.getByRole("button", { name: "Save Draft" }).click();
  await page.waitForURL((url) => /\/articles\/.+\/edit/.test(url.pathname));

  const editUrl = page.url();

  await expect(page.getByRole("button", { name: "Upload Cover Image" })).toBeVisible({ timeout: 5_000 });
  const uploadButton = page.getByRole("button", { name: "Upload Cover Image" });
  const coverInput = uploadButton.locator("..").locator('input[type="file"]');
  const imageUpload = page.waitForResponse((r) => r.url().includes("/images") && r.status() === 201);
  await coverInput.setInputFiles(FIXTURE_IMAGE);
  await imageUpload;
  await expect(page.getByRole("button", { name: "Replace Cover Image" })).toBeVisible({ timeout: 10_000 });

  await page.getByRole("button", { name: "Submit for Review" }).click();
  await expect(page.getByText("Submitted")).toBeVisible({ timeout: 5_000 });

  return editUrl;
}
```

- [ ] **Step 2: Write the editor-rejection test**

Append this test to the file created in Step 1:

```typescript
test("editor rejects article → author revises and resubmits", async ({ browser }) => {
  const janCtx  = await browser.newContext();
  const emmaCtx = await browser.newContext();
  const jan  = await janCtx.newPage();
  const emma = await emmaCtx.newPage();

  const articleTitle = `E2E Rejection Editor ${Date.now()}`;

  // ── 1. Jan creates and submits article ──────────────────────────────────────
  await loginNewspaper(jan, JAN.email, JAN.password);
  const editUrl = await createAndSubmitArticle(jan, articleTitle);

  // ── 2. Emma assigns herself as editor ───────────────────────────────────────
  await loginNewspaper(emma, EMMA.email, EMMA.password);
  await emma.goto(`${BASE}/${NEWSPAPER}/author-dashboard?section=editorial-queue`);
  await expect(emma.getByRole("heading", { name: "Editorial Queue" })).toBeVisible();

  const articleRow = emma.locator(`text=${articleTitle}`).locator("..").locator("..");
  await articleRow.getByRole("button", { name: "Assign Editor" }).click();
  await emma.locator("select").filter({ hasText: "Select an editor…" }).selectOption({ label: "Emma Bednarikova" });
  const assignResponse = emma.waitForResponse((r) => r.url().includes("/assign-editor") && r.status() === 200);
  await emma.getByRole("button", { name: "Assign", exact: true }).click();
  await assignResponse;

  // ── 3. Emma opens review queue and rejects the article ──────────────────────
  await emma.goto(`${BASE}/${NEWSPAPER}/author-dashboard?section=review-queue`);
  await expect(emma.getByRole("heading", { name: "Review Queue" })).toBeVisible();

  const reviewRow = emma.locator(`text=${articleTitle}`).locator("..").locator("..");
  await reviewRow.getByRole("button", { name: "Review" }).click();

  // Switch decision from APPROVE to REJECT
  await emma.getByRole("button", { name: "Reject", exact: true }).click();

  // Note is required for REJECT
  await emma.getByPlaceholder("Note is required for this decision…").fill("Not up to editorial standards.");

  const reviewResponse = emma.waitForResponse((r) => r.url().includes("/review") && r.status() === 200);
  await emma.getByRole("button", { name: "Submit" }).click();
  await reviewResponse;

  // ── 4. Jan sees article as REJECTED ─────────────────────────────────────────
  await jan.goto(`${BASE}/${NEWSPAPER}/author-dashboard?section=my-articles&status=REJECTED`);
  await expect(jan.getByText(articleTitle)).toBeVisible({ timeout: 5_000 });

  // ── 5. Jan revises and resubmits ────────────────────────────────────────────
  await jan.goto(editUrl);
  await jan.locator("[contenteditable='true']").click();
  await jan.keyboard.press("End");
  await jan.keyboard.type(" Revised content.");
  await jan.getByRole("button", { name: "Submit for Review" }).click();
  await expect(jan.getByText("Submitted")).toBeVisible({ timeout: 5_000 });

  // ── 6. Jan confirms article is SUBMITTED again ───────────────────────────────
  await jan.goto(`${BASE}/${NEWSPAPER}/author-dashboard?section=my-articles&status=SUBMITTED`);
  await expect(jan.getByText(articleTitle)).toBeVisible({ timeout: 5_000 });

  await janCtx.close();
  await emmaCtx.close();
});
```

- [ ] **Step 3: Verify the file is syntactically valid**

```bash
cd /home/vilem/fimuni/pb138/pb138 && bunx tsc --noEmit --project tests/tsconfig.json 2>&1 || true
```

Expected: no errors referencing `article-rejection-workflow.spec.ts`.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/article-rejection-workflow.spec.ts
git commit -m "test: add editor rejection and author resubmit e2e test"
```

---

## Task 2: Manager rejects article after editor approval

**Files:**
- Modify: `tests/e2e/article-rejection-workflow.spec.ts`

- [ ] **Step 1: Append the manager-rejection test to the existing file**

```typescript
test("manager rejects article after editor approval", async ({ browser }) => {
  const janCtx  = await browser.newContext();
  const emmaCtx = await browser.newContext();
  const jan  = await janCtx.newPage();
  const emma = await emmaCtx.newPage();

  const articleTitle = `E2E Rejection Manager ${Date.now()}`;

  // ── 1. Jan creates and submits article ──────────────────────────────────────
  await loginNewspaper(jan, JAN.email, JAN.password);
  await createAndSubmitArticle(jan, articleTitle);

  // ── 2. Emma assigns herself as editor ───────────────────────────────────────
  await loginNewspaper(emma, EMMA.email, EMMA.password);
  await emma.goto(`${BASE}/${NEWSPAPER}/author-dashboard?section=editorial-queue`);
  await expect(emma.getByRole("heading", { name: "Editorial Queue" })).toBeVisible();

  const assignRow = emma.locator(`text=${articleTitle}`).locator("..").locator("..");
  await assignRow.getByRole("button", { name: "Assign Editor" }).click();
  await emma.locator("select").filter({ hasText: "Select an editor…" }).selectOption({ label: "Emma Bednarikova" });
  const assignResponse = emma.waitForResponse((r) => r.url().includes("/assign-editor") && r.status() === 200);
  await emma.getByRole("button", { name: "Assign", exact: true }).click();
  await assignResponse;

  // ── 3. Emma approves as editor ──────────────────────────────────────────────
  await emma.goto(`${BASE}/${NEWSPAPER}/author-dashboard?section=review-queue`);
  const reviewRow = emma.locator(`text=${articleTitle}`).locator("..").locator("..");
  await reviewRow.getByRole("button", { name: "Review" }).click();
  const reviewResponse = emma.waitForResponse((r) => r.url().includes("/review") && r.status() === 200);
  await emma.getByRole("button", { name: "Submit" }).click();
  await reviewResponse;

  // ── 4. Emma rejects as manager ──────────────────────────────────────────────
  await emma.goto(`${BASE}/${NEWSPAPER}/author-dashboard?section=editorial-queue`);
  await expect(emma.getByRole("heading", { name: "Editorial Queue" })).toBeVisible();

  const managerRow = emma.locator(`text=${articleTitle}`).locator("..").locator("..");
  await managerRow.getByRole("button", { name: "Review" }).click();

  await emma.getByRole("button", { name: "Reject", exact: true }).click();
  await emma.getByPlaceholder("Note is required for this decision…").fill("Does not meet publication standards.");

  const approveResponse = emma.waitForResponse((r) => r.url().includes("/approve") && r.status() === 200);
  await emma.getByRole("button", { name: "Submit" }).click();
  await approveResponse;

  // ── 5. Jan sees article as REJECTED ─────────────────────────────────────────
  await jan.goto(`${BASE}/${NEWSPAPER}/author-dashboard?section=my-articles&status=REJECTED`);
  await expect(jan.getByText(articleTitle)).toBeVisible({ timeout: 5_000 });

  await janCtx.close();
  await emmaCtx.close();
});
```

- [ ] **Step 2: Type-check**

```bash
cd /home/vilem/fimuni/pb138/pb138 && bunx tsc --noEmit --project tests/tsconfig.json 2>&1 || true
```

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/article-rejection-workflow.spec.ts
git commit -m "test: add manager rejection e2e test"
```

---

## Task 3: Admin assigns a newspaper role

**Files:**
- Create: `tests/e2e/admin/role-management.spec.ts`

- [ ] **Step 1: Create the file with constants and loginAdmin helper**

```typescript
import { test, expect, type Page } from "@playwright/test";

const BASE = "http://localhost:5173";

const ADMIN = { email: "admin@admin.cz", password: "admin1234" };

// Jan is seeded as AUTHOR but not EDITOR — safe target for assign/remove EDITOR
const TARGET_USER_NAME = "Jan Novak";

async function loginAdmin(page: Page) {
  await page.goto(`${BASE}/admin`);
  await page.getByLabel("Email Address").fill(ADMIN.email);
  await page.getByLabel("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(`${BASE}/admin/dashboard`);
}
```

- [ ] **Step 2: Write the assign-role test**

Append to the file:

```typescript
test("admin assigns EDITOR role to a newspaper user", async ({ page }) => {
  await loginAdmin(page);

  // Navigate to ClaudeDaily newspaper section
  await page.getByRole("button", { name: /ClaudeDaily/i }).click();
  await expect(page.getByText(/Users — ClaudeDaily/i)).toBeVisible({ timeout: 5_000 });

  // Find Jan Novak's row
  const userRow = page.locator(`text=${TARGET_USER_NAME}`).locator("..").locator("..");

  // Open the assign-role panel
  await userRow.getByRole("button", { name: "Assign Role" }).click();

  // Select EDITOR from the dropdown
  await page.locator("select").filter({ hasText: "Select a role…" }).selectOption("EDITOR");

  // Submit
  const assignResponse = page.waitForResponse(
    (r) => r.url().includes("/roles") && r.request().method() === "POST" && r.status() === 200
  );
  await page.getByRole("button", { name: "Assign", exact: true }).click();
  await assignResponse;

  // EDITOR badge is now visible in Jan's row
  await expect(userRow.getByText("EDITOR")).toBeVisible({ timeout: 5_000 });
});
```

- [ ] **Step 3: Type-check**

```bash
cd /home/vilem/fimuni/pb138/pb138 && bunx tsc --noEmit --project tests/tsconfig.json 2>&1 || true
```

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/admin/role-management.spec.ts
git commit -m "test: add admin assign newspaper role e2e test"
```

---

## Task 4: Admin removes a newspaper role

**Files:**
- Modify: `tests/e2e/admin/role-management.spec.ts`

- [ ] **Step 1: Append the remove-role test**

```typescript
test("admin removes EDITOR role from a newspaper user", async ({ page }) => {
  await loginAdmin(page);

  // Navigate to ClaudeDaily newspaper section
  await page.getByRole("button", { name: /ClaudeDaily/i }).click();
  await expect(page.getByText(/Users — ClaudeDaily/i)).toBeVisible({ timeout: 5_000 });

  const userRow = page.locator(`text=${TARGET_USER_NAME}`).locator("..").locator("..");

  // Ensure EDITOR badge is present (Jan must have it from the assign test or seeded state)
  await expect(userRow.getByText("EDITOR")).toBeVisible({ timeout: 5_000 });

  // The × button has aria-label="Remove EDITOR"
  // handleRemoveRole fires a confirm() dialog — accept it
  page.once("dialog", (dialog) => dialog.accept());

  const removeResponse = page.waitForResponse(
    (r) => r.url().includes("/roles/EDITOR") && r.request().method() === "DELETE" && r.status() === 200
  );
  await userRow.getByRole("button", { name: "Remove EDITOR" }).click();
  await removeResponse;

  // EDITOR badge is gone from Jan's row
  await expect(userRow.getByText("EDITOR")).not.toBeVisible({ timeout: 5_000 });
});
```

> **Note:** This test depends on Jan Novak having the EDITOR role. Run it after the assign test, or manually assign the role once via the admin UI after a fresh seed. The tests run in file order when not parallelised at the `test` level.

- [ ] **Step 2: Type-check**

```bash
cd /home/vilem/fimuni/pb138/pb138 && bunx tsc --noEmit --project tests/tsconfig.json 2>&1 || true
```

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/admin/role-management.spec.ts
git commit -m "test: add admin remove newspaper role e2e test"
```

---

## Task 5: Run all new tests

- [ ] **Step 1: Ensure the app is running**

The tests require both `web` (port 5173) and `server` (port 3000) to be running. If using Docker:

```bash
docker compose up --build
```

If running locally:

```bash
# Terminal 1 — server
cd apps/server && bun --hot src/index.ts

# Terminal 2 — web
cd apps/web && bun --hot src/index.ts
```

- [ ] **Step 2: Run only the new test files**

```bash
cd tests && bunx playwright test e2e/article-rejection-workflow.spec.ts e2e/admin/role-management.spec.ts --reporter=list
```

Expected: 4 tests pass. Each test title printed with a green checkmark.

- [ ] **Step 3: Run the full suite to check for regressions**

```bash
cd tests && bunx playwright test --reporter=list
```

Expected: all previously passing tests still pass.

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -p
git commit -m "test: fix e2e test selectors after smoke run"
```
