import { test, expect, type Page } from "@playwright/test";

const BASE = "http://localhost:5173";
const ADMIN = { email: "admin@newspapers.com", password: "test1234" };

async function loginAdmin(page: Page) {
  await page.goto(`${BASE}/admin`);
  await page.getByLabel("Email Address").fill(ADMIN.email);
  await page.getByLabel("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(`${BASE}/admin/dashboard`);
}

test.describe("admin role management", () => {
  test.describe.configure({ mode: "serial" });

  test("admin assigns EDITOR role to a newspaper user", async ({ page }) => {
    // ── 1. Admin logs in ──────────────────────────────────────────────────────
    await loginAdmin(page);

    // ── 2. Navigate to ClaudeDaily newspaper users ────────────────────────────
    await page.getByRole("button", { name: /ClaudeDaily/i }).click();

    await expect(page.getByText("Users — ClaudeDaily")).toBeVisible({ timeout: 5000 });

    // Wait for the user list to finish loading (at least one Assign Role button)
    const firstAssignBtn = page.getByRole("button", { name: "Assign Role" }).first();
    await expect(firstAssignBtn).toBeVisible({ timeout: 10_000 });

    // Use the first user row (parent of the Assign Role button)
    const userRow = firstAssignBtn.locator("..").locator("..");

    // ── 3. Pre-cleanup: ensure Jan does not already have EDITOR ───────────────
    // Pre-cleanup: remove EDITOR if Jan already has it from a previous run
    const editorBadge = userRow.getByText("EDITOR");
    if (await editorBadge.isVisible()) {
      page.once("dialog", (dialog) => dialog.accept());
      const removeResp = page.waitForResponse(
        (r) => r.url().includes("/roles/EDITOR") && r.request().method() === "DELETE" && r.status() === 200
      );
      await userRow.getByRole("button", { name: "Remove EDITOR" }).click();
      await removeResp;
    }

    // ── 4. Assign EDITOR role to Jan ──────────────────────────────────────────
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

    // ── 5. Verify EDITOR badge is visible ─────────────────────────────────────
    await expect(userRow.getByText("EDITOR")).toBeVisible({ timeout: 5000 });
  });

  test("admin removes EDITOR role from a newspaper user", async ({ page }) => {
    await loginAdmin(page);

    // ── 1. Navigate to ClaudeDaily newspaper users ────────────────────────────
    await page.getByRole("button", { name: /ClaudeDaily/i }).click();
    await expect(page.getByText("Users — ClaudeDaily")).toBeVisible({ timeout: 5_000 });

    // Wait for the user list to finish loading (at least one Assign Role button)
    const firstAssignBtn = page.getByRole("button", { name: "Assign Role" }).first();
    await expect(firstAssignBtn).toBeVisible({ timeout: 10_000 });

    // ── 2. Use the first user row (parent of the Assign Role button) ─────────────
    const userRow = firstAssignBtn.locator("..").locator("..");

    // ── 3. Ensure Jan has EDITOR role (assign it if missing) ──────────────────
    const editorBadge = userRow.getByText("EDITOR");
    if (!(await editorBadge.isVisible())) {
      await userRow.getByRole("button", { name: "Assign Role" }).click();
      await page.locator("select").filter({ hasText: "Select a role…" }).selectOption("EDITOR");
      await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes("/roles") && r.request().method() === "POST" && r.status() === 200
        ),
        page.getByRole("button", { name: "Assign", exact: true }).click(),
      ]);
      await expect(editorBadge).toBeVisible({ timeout: 5_000 });
    }

    // ── 4. Remove EDITOR role ─────────────────────────────────────────────────
    page.once("dialog", (dialog) => dialog.accept());
    const removeResp = page.waitForResponse(
      (r) => r.url().includes("/roles/EDITOR") && r.request().method() === "DELETE" && r.status() === 200
    );
    await userRow.getByRole("button", { name: "Remove EDITOR" }).click();
    await removeResp;

    // ── 5. Verify EDITOR badge is gone ───────────────────────────────────────
    await expect(editorBadge).not.toBeVisible({ timeout: 5_000 });
  });
});
