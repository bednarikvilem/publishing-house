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
