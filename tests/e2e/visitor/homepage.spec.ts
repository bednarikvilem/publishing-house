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
