import { test, expect } from "@playwright/test";
import { login } from "../helpers/auth";

const newspaper = process.env.TEST_NEWSPAPER!;
const email = process.env.TEST_EMAIL!;
const password = process.env.TEST_PASSWORD!;

test.describe("User profile", () => {
  test("displays current user info", async ({ page }) => {
    await login(page, newspaper, email, password);
    await page.goto(`/${newspaper}/profile`);

    await expect(page.getByText("My Profile")).toBeVisible();
    await expect(page.getByLabel("Email Address")).toHaveValue(email);
  });

  test("updates first name and persists after reload", async ({ page }) => {
    await login(page, newspaper, email, password);
    await page.goto(`/${newspaper}/profile`);

    const originalFirstName = await page.getByLabel("First Name").inputValue();
    const newFirstName = `E2E${Date.now()}`;
    await page.getByLabel("First Name").fill(newFirstName);
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Profile updated successfully")).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("First Name")).toHaveValue(newFirstName);

    // Restore original name
    await page.getByLabel("First Name").fill(originalFirstName);
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Profile updated successfully")).toBeVisible();
  });
});
