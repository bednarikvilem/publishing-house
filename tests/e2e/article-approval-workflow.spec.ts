import { test, expect, type Page } from "@playwright/test";
import path from "path";

// ── Credentials ────────────────────────────────────────────────────────────────

const NEWSPAPER = "claudedaily";
const BASE = `http://localhost:5173`;

const JAN = { email: "jan.novak@claudedaily.cz", password: "test1234" };
const EMMA = { email: "emma.bednarikova@email.cz", password: "test1234" };
const DIRECTOR = { email: "director@claudedaily.cz", password: "test1234" };

const FIXTURE_IMAGE = path.resolve(__dirname, "../fixtures/test-cover.png");

// ── Helpers ────────────────────────────────────────────────────────────────────

async function loginNewspaper(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/${NEWSPAPER}/login`);
  await page.getByLabel("Email Address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"));
}

async function loginDirector(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/director`);
  await page.getByLabel("Email Address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(`${BASE}/director/dashboard`);
}

// ── Test ───────────────────────────────────────────────────────────────────────

test("full article approval workflow: draft → published", async ({ browser }) => {
  test.setTimeout(120_000);
  const janCtx = await browser.newContext();
  const emmaCtx = await browser.newContext();
  const directorCtx = await browser.newContext();

  const jan = await janCtx.newPage();
  const emma = await emmaCtx.newPage();
  const director = await directorCtx.newPage();

  const articleTitle = `E2E Workflow ${Date.now()}`;

  // ── 1. Jan logs in and creates a draft ──────────────────────────────────────

  await loginNewspaper(jan, JAN.email, JAN.password);

  await jan.goto(`${BASE}/${NEWSPAPER}/articles/new`);
  await jan.locator("input[placeholder='Article title…']").fill(articleTitle);
  await jan.locator("textarea[placeholder*='Short introduction']").fill("E2E test perex");
  await jan.locator("[contenteditable='true']").click();
  await jan.keyboard.type("E2E test article body.");
  await jan.locator("select").first().selectOption({ index: 1 });
  await jan.getByRole("button", { name: "Save Draft" }).click();
  await jan.waitForURL((url) => /\/articles\/.+\/edit/.test(url.pathname));

  // Save the edit URL so we can return to it later
  const articleEditUrl = jan.url();

  // Wait for the cover image upload button to be available (sidebar renders after page load)
  await expect(jan.getByRole("button", { name: "Upload Cover Image" })).toBeVisible({ timeout: 5_000 });

  // Upload cover image via the hidden file input next to the Upload button
  const uploadButton = jan.getByRole("button", { name: "Upload Cover Image" });
  const coverInput = uploadButton.locator("..").locator('input[type="file"]');
  const imageUploadResponse = jan.waitForResponse((r) => r.url().includes("/images") && r.status() === 201);
  await coverInput.setInputFiles(FIXTURE_IMAGE);
  await imageUploadResponse;
  await expect(jan.getByRole("button", { name: "Replace Cover Image" })).toBeVisible({ timeout: 10_000 });

  // ── 2. Jan checks article is visible as DRAFT ────────────────────────────────

  await jan.goto(`${BASE}/${NEWSPAPER}/author-dashboard?section=my-articles&status=DRAFT`);
  await expect(jan.getByText(articleTitle)).toBeVisible({ timeout: 5_000 });

  // ── 3. Jan submits the article for review ────────────────────────────────────

  // Return to the edit page and click Submit for Review
  await jan.goto(articleEditUrl);
  // Wait for the article to fully load before submitting
  await expect(jan.getByText("Draft", { exact: true })).toBeVisible({ timeout: 10_000 });
  const submitResponse = jan.waitForResponse(
    (r) => r.url().includes("/submit") && r.request().method() === "POST"
  );
  await jan.getByRole("button", { name: "Submit for Review" }).click();
  const submitRes = await submitResponse;
  expect(submitRes.status()).toBe(200);
  // Wait for navigation to author dashboard after successful submit
  await jan.waitForURL((url) => url.pathname.includes("/author-dashboard"), { timeout: 10_000 });

  // Jan checks article is visible as SUBMITTED
  await jan.goto(`${BASE}/${NEWSPAPER}/author-dashboard?section=my-articles&status=SUBMITTED`);
  await expect(jan.getByText(articleTitle)).toBeVisible({ timeout: 5_000 });

  // ── 4. Emma (NEWSPAPER_MANAGER) assigns herself as editor ───────────────────

  await loginNewspaper(emma, EMMA.email, EMMA.password);
  await emma.goto(`${BASE}/${NEWSPAPER}/author-dashboard?section=editorial-queue`);
  await expect(emma.getByRole("heading", { name: "Editorial Queue" })).toBeVisible();

  // Find the article row and click Assign Editor
  const articleRow = emma.locator(`text=${articleTitle}`).locator("..").locator("..");
  await articleRow.getByRole("button", { name: "Assign Editor" }).click();

  // Select Emma herself from the editor dropdown
  await emma.locator("select").filter({ hasText: "Select an editor…" }).selectOption({ label: "Emma Bednarikova" });
  const assignResponse = emma.waitForResponse((r) => r.url().includes("/assign-editor") && r.status() === 200);
  await emma.getByRole("button", { name: "Assign", exact: true }).click();
  await assignResponse;

  // Jan checks article is now IN_REVIEW
  await jan.goto(`${BASE}/${NEWSPAPER}/author-dashboard?section=my-articles&status=IN_REVIEW`);
  await expect(jan.getByText(articleTitle)).toBeVisible({ timeout: 5_000 });

  // ── 5. Emma (EDITOR) approves in Review Queue ────────────────────────────────

  await emma.goto(`${BASE}/${NEWSPAPER}/author-dashboard?section=review-queue`);
  await expect(emma.getByRole("heading", { name: "Review Queue" })).toBeVisible();

  const reviewRow = emma.locator(`text=${articleTitle}`).locator("..").locator("..");
  await reviewRow.getByRole("button", { name: "Review" }).click();

  // APPROVE is the default decision — just click Submit
  const reviewResponse = emma.waitForResponse((r) => r.url().includes("/review") && r.status() === 200);
  await emma.getByRole("button", { name: "Submit" }).click();
  await reviewResponse;

  // Jan checks article visible as Approved (APPROVED_BY_EDITOR shown under "Approved" filter)
  await jan.goto(`${BASE}/${NEWSPAPER}/author-dashboard?section=my-articles&status=APPROVED_BY_EDITOR`);
  await expect(jan.getByText(articleTitle)).toBeVisible({ timeout: 5_000 });

  // ── 6. Emma (NEWSPAPER_MANAGER) approves in Editorial Queue ─────────────────

  await emma.goto(`${BASE}/${NEWSPAPER}/author-dashboard?section=editorial-queue`);

  const managerRow = emma.locator(`text=${articleTitle}`).locator("..").locator("..");
  await managerRow.getByRole("button", { name: "Review" }).click();

  // APPROVE is the default decision — just click Submit
  const managerApproveResponse = emma.waitForResponse((r) => r.url().includes("/approve") && r.status() === 200);
  await emma.getByRole("button", { name: "Submit" }).click();
  await managerApproveResponse;

  // ── 7. Director logs in and approves (APPROVED_BY_MANAGER → APPROVED_BY_DIRECTOR) ──

  await loginDirector(director, DIRECTOR.email, DIRECTOR.password);

  // Select ClaudeDaily newspaper in sidebar
  await director.getByRole("button", { name: /ClaudeDaily/i }).click();
  // Should auto-navigate to Approval Queue
  await expect(director.getByRole("heading", { name: "Approval Queue" })).toBeVisible({ timeout: 5_000 });
  await expect(director.getByText(articleTitle)).toBeVisible({ timeout: 5_000 });

  const approvalRow = director.locator(`text=${articleTitle}`).locator("..").locator("..");
  await approvalRow.getByRole("button", { name: "Decide" }).click();

  // APPROVE is already selected by default
  const directorApproveResponse = director.waitForResponse((r) => r.url().includes("/approve") && r.status() === 200);
  await director.getByRole("button", { name: "Submit" }).click();
  await directorApproveResponse;

  // ── 8. Director publishes the article ────────────────────────────────────────

  await director.getByRole("button", { name: "Publication Queue" }).click();
  await expect(director.getByRole("heading", { name: "Publication Queue" })).toBeVisible();
  await expect(director.getByText(articleTitle)).toBeVisible({ timeout: 5_000 });

  // Handle the confirm() dialog
  director.once("dialog", (dialog) => dialog.accept());
  const publishResponse = director.waitForResponse((r) => r.url().includes("/publish") && r.status() === 200);
  await director.getByRole("button", { name: "Publish" }).click();
  await publishResponse;

  // ── 9. Article appears on the newspaper homepage ─────────────────────────────

  await jan.goto(`${BASE}/${NEWSPAPER}/`);
  await expect(jan.getByText(articleTitle)).toBeVisible({ timeout: 5_000 });

  // ── Cleanup ───────────────────────────────────────────────────────────────────

  await janCtx.close();
  await emmaCtx.close();
  await directorCtx.close();
});
