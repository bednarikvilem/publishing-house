import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

const newspaper = process.env.TEST_NEWSPAPER ?? "claudedaily";
const email = process.env.TEST_EMAIL ?? "jan.novak@claudedaily.cz";
const password = process.env.TEST_PASSWORD ?? "test1234";

test.describe("Subscription workflow", () => {
  test("Subscribe button is visible in navbar for an authenticated user", async ({ page }) => {
    await login(page, newspaper, email, password);
    await page.goto(`/${newspaper}`);

    await expect(page.getByRole("button", { name: "Subscribe" })).toBeVisible({ timeout: 5_000 });
  });

  test("clicking Subscribe button sends the request and shows a confirmation", async ({ page }) => {
    await login(page, newspaper, email, password);
    await page.goto(`/${newspaper}`);

    const subscribeBtn = page.getByRole("button", { name: "Subscribe" });
    await expect(subscribeBtn).toBeVisible({ timeout: 5_000 });

    const responsePromise = page.waitForResponse(
      (r) => r.url().includes("/subscription/request") && r.request().method() === "POST"
    );
    await subscribeBtn.click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);

    // Button changes to reflect the sent state or a success message appears
    await expect(
      page.getByText(/QR code sent|Check your email|Subscription/i)
    ).toBeVisible({ timeout: 5_000 });
  });

  test("confirm page with invalid token shows the error state", async ({ page }) => {
    const fakeToken = "00000000-0000-0000-0000-000000000000";
    await page.goto(`/${newspaper}/subscription/confirm?token=${fakeToken}`);

    await expect(
      page.getByText(/already been used|expired|invalid/i)
    ).toBeVisible({ timeout: 5_000 });
  });

  test("confirm page without a token shows the error state", async ({ page }) => {
    await page.goto(`/${newspaper}/subscription/confirm`);

    await expect(
      page.getByText(/already been used|expired|invalid/i)
    ).toBeVisible({ timeout: 5_000 });
  });
});
