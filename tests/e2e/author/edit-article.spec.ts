import { test, expect } from "@playwright/test";
import { login } from "../helpers/auth";

const newspaper = process.env.TEST_NEWSPAPER!;
const authorEmail = process.env.TEST_AUTHOR_EMAIL!;
const authorPassword = process.env.TEST_AUTHOR_PASSWORD!;

test.describe("Edit article", () => {
  test("edits a draft article title from the dashboard", async ({ page }) => {
    await login(page, newspaper, authorEmail, authorPassword);
    await page.goto(`/${newspaper}/author-dashboard?section=my-articles&status=DRAFT`);

    const editLink = page.locator("a[aria-label='Edit article']").first();
    await expect(editLink).toBeVisible();
    await editLink.click();

    await expect(page).toHaveURL(new RegExp(`/${newspaper}/articles/.+/edit`));

    const titleInput = page.locator("input[placeholder='Article title…']");
    const updatedTitle = `Edited E2E ${Date.now()}`;
    await titleInput.fill(updatedTitle);

    await page.getByRole("button", { name: "Save Draft" }).click();
    await page.waitForTimeout(1000);

    await page.goto(`/${newspaper}/author-dashboard?section=my-articles&status=DRAFT`);
    await expect(page.getByText(updatedTitle)).toBeVisible();
  });
});
