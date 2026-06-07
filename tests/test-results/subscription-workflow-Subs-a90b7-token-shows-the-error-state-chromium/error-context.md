# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: subscription-workflow.spec.ts >> Subscription workflow >> confirm page with invalid token shows the error state
- Location: e2e/subscription-workflow.spec.ts:36:2

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/already been used|expired|invalid|no token/i)
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "to.be.visible" with timeout 10000ms
  - waiting for getByText(/already been used|expired|invalid|no token/i)

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - link "ClaudeDaily" [ref=e6] [cursor=pointer]:
        - /url: /claudedaily
      - navigation [ref=e7]:
        - link "Home" [ref=e8] [cursor=pointer]:
          - /url: /claudedaily
        - link "AI & Machine Learning" [ref=e9] [cursor=pointer]:
          - /url: /claudedaily/category/ai-machine-learning
        - link "New Tech & Gadgets" [ref=e10] [cursor=pointer]:
          - /url: /claudedaily/category/new-tech-gadgets
        - link "Software & Coding" [ref=e11] [cursor=pointer]:
          - /url: /claudedaily/category/software-coding
        - link "Cybersecurity" [ref=e12] [cursor=pointer]:
          - /url: /claudedaily/category/cybersecurity
      - generic [ref=e14]:
        - img [ref=e15]
        - textbox "Search articles…" [ref=e18]
      - generic [ref=e19]:
        - button "Toggle dark mode" [ref=e20]:
          - img [ref=e21]
        - generic [ref=e23]:
          - link "Log in" [ref=e24] [cursor=pointer]:
            - /url: /claudedaily/login
          - link "Sign up" [ref=e25] [cursor=pointer]:
            - /url: /claudedaily/register
  - generic [ref=e27]:
    - heading "Activation failed" [level=2] [ref=e28]
    - paragraph [ref=e29]: Something went wrong. Please try again.
    - link "Back to homepage" [ref=e30] [cursor=pointer]:
      - /url: /claudedaily
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { login } from "./helpers/auth";
  3  | 
  4  | const newspaper = process.env.TEST_NEWSPAPER ?? "claudedaily";
  5  | const email = process.env.TEST_EMAIL ?? "jan.novak@claudedaily.cz";
  6  | const password = process.env.TEST_PASSWORD ?? "test1234";
  7  | 
  8  | test.describe("Subscription workflow", () => {
  9  |   test("Subscribe button is visible in navbar for an authenticated user", async ({ page }) => {
  10 |     await login(page, newspaper, email, password);
  11 |     await page.goto(`/${newspaper}`);
  12 | 
  13 |     await expect(page.getByRole("button", { name: "Subscribe" })).toBeVisible({ timeout: 5_000 });
  14 |   });
  15 | 
  16 |   test("clicking Subscribe button sends the request and shows a confirmation", async ({ page }) => {
  17 |     await login(page, newspaper, email, password);
  18 |     await page.goto(`/${newspaper}`);
  19 | 
  20 |     const subscribeBtn = page.getByRole("button", { name: "Subscribe" });
  21 |     await expect(subscribeBtn).toBeVisible({ timeout: 5_000 });
  22 | 
  23 |     const responsePromise = page.waitForResponse(
  24 |       (r) => r.url().includes("/subscription/request") && r.request().method() === "POST"
  25 |     );
  26 |     await subscribeBtn.click();
  27 |     const response = await responsePromise;
  28 |     expect(response.status()).toBe(200);
  29 | 
  30 |     // Button changes to reflect the sent state or a success message appears
  31 |     await expect(
  32 |       page.getByText(/QR code sent|Check your email|Subscription/i)
  33 |     ).toBeVisible({ timeout: 5_000 });
  34 |   });
  35 | 
  36 |   test("confirm page with invalid token shows the error state", async ({ page }) => {
  37 |     const fakeToken = "00000000-0000-0000-0000-000000000000";
  38 |     await page.goto(`/${newspaper}/subscription/confirm?token=${fakeToken}`);
  39 | 
  40 |     await expect(
  41 |       page.getByText(/already been used|expired|invalid|no token/i)
> 42 |     ).toBeVisible({ timeout: 10_000 });
     |      ^ Error: expect(locator).toBeVisible() failed
  43 |   });
  44 | 
  45 |   test("confirm page without a token shows the error state", async ({ page }) => {
  46 |     await page.goto(`/${newspaper}/subscription/confirm`);
  47 | 
  48 |     await expect(
  49 |       page.getByText(/already been used|expired|invalid|no token/i)
  50 |     ).toBeVisible({ timeout: 5_000 });
  51 |   });
  52 | });
  53 | 
```