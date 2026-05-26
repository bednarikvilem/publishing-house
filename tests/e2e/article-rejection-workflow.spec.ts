import { test, expect, type Page } from "@playwright/test";
import path from "path";

// ── Credentials ────────────────────────────────────────────────────────────────

const NEWSPAPER = "claudedaily";
const BASE = `http://localhost:5173`;

const JAN = { email: "jan.novak@claudedaily.cz", password: "test1234" };
const EMMA = { email: "emma.bednarikova@email.cz", password: "test1234" };

const FIXTURE_IMAGE = path.resolve(__dirname, "../fixtures/test-cover.png");

// ── Helpers ────────────────────────────────────────────────────────────────────

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
  await page.keyboard.type("E2E rejection test article body.");
  await page.locator("select").first().selectOption({ index: 1 });
  await page.getByRole("button", { name: "Save Draft" }).click();
  await page.waitForURL((url) => /\/articles\/.+\/edit/.test(url.pathname));

  const articleEditUrl = page.url();

  // Wait for the cover image upload button to be available
  await expect(page.getByRole("button", { name: "Upload Cover Image" })).toBeVisible({ timeout: 5_000 });

  // Upload cover image via the hidden file input next to the Upload button
  const uploadButton = page.getByRole("button", { name: "Upload Cover Image" });
  const coverInput = uploadButton.locator("..").locator('input[type="file"]');
  const imageUploadResponse = page.waitForResponse((r) => r.url().includes("/images") && r.status() === 201);
  await coverInput.setInputFiles(FIXTURE_IMAGE);
  await imageUploadResponse;
  await expect(page.getByRole("button", { name: "Replace Cover Image" })).toBeVisible({ timeout: 10_000 });

  // Submit for review
  await page.getByRole("button", { name: "Submit for Review" }).click();
  await expect(page.getByText("Submitted")).toBeVisible({ timeout: 5_000 });

  return articleEditUrl;
}

// ── Test ───────────────────────────────────────────────────────────────────────

test("editor rejects article and author sees REJECTED status", async ({ browser }) => {
  const janCtx = await browser.newContext();
  const emmaCtx = await browser.newContext();

  const jan = await janCtx.newPage();
  const emma = await emmaCtx.newPage();

  const articleTitle = `E2E Rejection ${Date.now()}`;

  // ── 1. Jan logs in, creates and submits article ──────────────────────────────

  await loginNewspaper(jan, JAN.email, JAN.password);
  const articleEditUrl = await createAndSubmitArticle(jan, articleTitle);

  // Jan checks article is visible as SUBMITTED
  await jan.goto(`${BASE}/${NEWSPAPER}/author-dashboard?section=my-articles&status=SUBMITTED`);
  await expect(jan.getByText(articleTitle)).toBeVisible({ timeout: 5_000 });

  // ── 2. Emma (NEWSPAPER_MANAGER) assigns herself as editor ───────────────────

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

  // ── 3. Emma (EDITOR) rejects the article in Review Queue ────────────────────

  await emma.goto(`${BASE}/${NEWSPAPER}/author-dashboard?section=review-queue`);
  await expect(emma.getByRole("heading", { name: "Review Queue" })).toBeVisible();

  const reviewRow = emma.locator(`text=${articleTitle}`).locator("..").locator("..");
  await reviewRow.getByRole("button", { name: "Review" }).click();

  // Click "Reject" button to select REJECT decision
  await emma.getByRole("button", { name: "Reject" }).click();

  // Fill the required note (required for REJECT decision)
  await emma.getByPlaceholder("Note is required for this decision…").fill("This article needs significant improvements before it can be published.");

  // Submit the rejection
  const reviewResponse = emma.waitForResponse((r) => r.url().includes("/review") && r.status() === 200);
  await emma.getByRole("button", { name: "Submit" }).click();
  await reviewResponse;

  // ── 4. Jan sees the article as REJECTED ─────────────────────────────────────

  await jan.goto(`${BASE}/${NEWSPAPER}/author-dashboard?section=my-articles&status=REJECTED`);
  await expect(jan.getByText(articleTitle)).toBeVisible({ timeout: 5_000 });

  // ── 5. Verify the edit page is read-only for a REJECTED article ─────────────

  await jan.goto(articleEditUrl);
  await expect(jan.getByRole("button", { name: "Submit for Review" })).not.toBeVisible({ timeout: 5_000 });
  await expect(jan.getByRole("button", { name: "Save Draft" })).not.toBeVisible({ timeout: 5_000 });

  // ── Cleanup ───────────────────────────────────────────────────────────────────

  await janCtx.close();
  await emmaCtx.close();
});

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
  await expect(emma.getByRole("heading", { name: "Review Queue" })).toBeVisible();
  const reviewRow = emma.locator(`text=${articleTitle}`).locator("..").locator("..");
  await reviewRow.getByRole("button", { name: "Review" }).click();
  await emma.getByRole("button", { name: "Approve", exact: true }).click();
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

  const rejectResponse = emma.waitForResponse((r) => r.url().includes("/approve") && r.status() === 200);
  await emma.getByRole("button", { name: "Submit" }).click();
  await rejectResponse;

  // ── 5. Jan sees article as REJECTED ─────────────────────────────────────────
  await jan.goto(`${BASE}/${NEWSPAPER}/author-dashboard?section=my-articles&status=REJECTED`);
  await expect(jan.getByText(articleTitle)).toBeVisible({ timeout: 5_000 });

  await janCtx.close();
  await emmaCtx.close();
});
