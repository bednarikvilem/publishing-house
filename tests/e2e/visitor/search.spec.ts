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
