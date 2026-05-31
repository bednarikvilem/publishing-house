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
