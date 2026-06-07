import { test, expect } from "@playwright/test";
import { login } from "../helpers/auth";

const newspaper = process.env.TEST_NEWSPAPER!;
const email = process.env.TEST_EMAIL!;
const password = process.env.TEST_PASSWORD!;

test.describe("Login flow", () => {
  test("logs in with valid credentials and redirects away from login page", async ({ page }) => {
    await login(page, newspaper, email, password);
    expect(page.url()).not.toContain("/login");
    await expect(page).toHaveURL(new RegExp(`/${newspaper}`));
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto(`/${newspaper}/login`);
    // Wait for the newspaper to load so the form submission isn't silently skipped
    await page.waitForResponse((r) => r.url().includes("/api/newspapers/by-slug/"));
    await page.getByLabel("Email Address").fill("wrong@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    const loginResp = page.waitForResponse(
      (r) => r.url().includes("/api/auth/login") && r.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Sign In" }).click();
    await loginResp;
    await expect(page.getByText("Invalid email or password.")).toBeVisible({ timeout: 10_000 });
  });
});
