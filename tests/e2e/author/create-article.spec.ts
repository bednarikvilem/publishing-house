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

    const contentEditor = page.locator("[contenteditable='true']");
    await contentEditor.click();
    await page.keyboard.type("E2E test article content");

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
