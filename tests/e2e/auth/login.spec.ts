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
    await page.getByLabel("Email Address").fill("wrong@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText("Invalid email or password")).toBeVisible();
  });
});
