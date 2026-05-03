import type { Page } from "@playwright/test";

export async function login(page: Page, newspaper: string, email: string, password: string) {
  await page.goto(`/${newspaper}/login`);
  await page.getByLabel("Email Address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"));
}
