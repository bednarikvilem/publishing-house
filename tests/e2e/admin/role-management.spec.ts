import { test, expect, Page } from "@playwright/test";

const BASE = "http://localhost:5173";
const ADMIN = { email: "admin@admin.cz", password: "admin1234" };
const TARGET_USER_NAME = "Jan Novak";

async function loginAdmin(page: Page) {
  await page.goto(`${BASE}/admin`);
  await page.getByLabel("Email Address").fill(ADMIN.email);
  await page.getByLabel("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(`${BASE}/admin/dashboard`);
}

test("admin assigns EDITOR role to a newspaper user", async ({ page }) => {
  await loginAdmin(page);

  await page.getByRole("button", { name: /ClaudeDaily/i }).click();

  await expect(page.getByText("Users — ClaudeDaily")).toBeVisible({ timeout: 5000 });

  const userRow = page
    .locator(`text=${TARGET_USER_NAME}`)
    .locator("..")
    .locator("..");

  await userRow.getByRole("button", { name: "Assign Role" }).click();

  await page
    .locator("select")
    .filter({ hasText: "Select a role…" })
    .selectOption("EDITOR");

  const [response] = await Promise.all([
    page.waitForResponse(
      (resp) => resp.url().includes("/roles") && resp.request().method() === "POST" && resp.status() === 200
    ),
    page.getByRole("button", { name: "Assign", exact: true }).click(),
  ]);

  await expect(userRow.getByText("EDITOR")).toBeVisible({ timeout: 5000 });
});
