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
