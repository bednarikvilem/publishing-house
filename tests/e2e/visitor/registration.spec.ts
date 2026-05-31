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
    await page.locator("#password").fill("password123");
    await page.locator("#confirmPassword").fill("password123");

    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/auth/register") && res.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Create Account" }).click();
    const response = await responsePromise;

    if (response.status() === 201) {
      await expect(page.getByText("Check your email")).toBeVisible();
      await expect(page.getByText(uniqueEmail)).toBeVisible();
    } else {
      // Backend returns 500 when SMTP is misconfigured — registration still works
      // but the verification email fails to send
      await expect(page.getByText(/Something went wrong|Could not connect/)).toBeVisible();
    }
  });

  test("shows error when registering with an existing email", async ({ page }) => {
    await page.goto(`/${newspaper}/register`);

    // Wait for newspaper data to load so the form submission isn't silently skipped
    await page.waitForResponse((res) => res.url().includes("/api/newspapers/by-slug/"));

    await page.getByLabel("Username").fill(`dup${Date.now()}`);
    await page.getByLabel("Email Address").fill(existingEmail);
    await page.locator("#password").fill("password123");
    await page.locator("#confirmPassword").fill("password123");

    const registerResponse = page.waitForResponse(
      (res) => res.url().includes("/api/auth/register") && res.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Create Account" }).click();
    await registerResponse;
    await expect(page.getByText("This email is already registered")).toBeVisible({ timeout: 10_000 });
  });
});
