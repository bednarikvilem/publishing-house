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
