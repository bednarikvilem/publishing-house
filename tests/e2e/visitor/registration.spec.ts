import { test, expect } from "@playwright/test";

const newspaper = process.env.TEST_NEWSPAPER!;
const existingEmail = process.env.TEST_EMAIL!;

test.describe("Registration", () => {
  test("registers a new user and shows verification message", async ({ page }) => {
    await page.goto(`/${newspaper}/register`);

    // Wait for newspaper data to load from API before filling form
    await page.waitForResponse((res) => res.url().includes("/api/newspapers/by-slug/"));

    const uniqueEmail = `test+${Date.now()}@example.com`;
    const uniqueUsername = `testuser${Date.now()}`;

    await page.getByLabel("Full Name").fill("E2E Test User");
    await page.getByLabel("Username").fill(uniqueUsername);
    await page.getByLabel("Email Address").fill(uniqueEmail);
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm Password").fill("password123");
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page.getByText("Check your email")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(uniqueEmail)).toBeVisible();
  });

  test("shows error when registering with an existing email", async ({ page }) => {
    await page.goto(`/${newspaper}/register`);

    await page.getByLabel("Username").fill(`dup${Date.now()}`);
    await page.getByLabel("Email Address").fill(existingEmail);
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm Password").fill("password123");
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page.getByText("This email is already registered")).toBeVisible();
  });
});
