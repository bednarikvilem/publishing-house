# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visitor/registration.spec.ts >> Registration >> registers a new user and shows verification message
- Location: e2e/visitor/registration.spec.ts:7:2

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Check your email')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "to.be.visible" with timeout 10000ms
  - waiting for getByText('Check your email')

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
        - link "Pokemon" [ref=e9] [cursor=pointer]:
          - /url: /claudedaily/category/pokemon
      - generic [ref=e11]:
        - img [ref=e12]
        - textbox "Search articles…" [ref=e15]
      - generic [ref=e16]:
        - button "Toggle dark mode" [ref=e17]:
          - img [ref=e18]
        - generic [ref=e20]:
          - link "Log in" [ref=e21] [cursor=pointer]:
            - /url: /claudedaily/login
          - link "Sign up" [ref=e22] [cursor=pointer]:
            - /url: /claudedaily/register
  - generic [ref=e24]:
    - generic [ref=e25]:
      - generic [ref=e26]: Claudedaily
      - generic [ref=e27]: Create your account
    - generic [ref=e28]:
      - generic [ref=e29]:
        - generic [ref=e30]: Full Name
        - textbox "Full Name" [ref=e31]:
          - /placeholder: John Doe
          - text: E2E Test User
      - generic [ref=e32]:
        - generic [ref=e33]: Username
        - textbox "Username" [ref=e34]:
          - /placeholder: jannovak
          - text: testuser1778082290503
      - generic [ref=e35]:
        - generic [ref=e36]: Email Address
        - textbox "Email Address" [ref=e37]:
          - /placeholder: you@example.com
          - text: test+1778082290503@example.com
      - generic [ref=e38]:
        - generic [ref=e39]: Password
        - textbox "Password" [ref=e40]:
          - /placeholder: Enter your password
          - text: password123
      - generic [ref=e41]:
        - generic [ref=e42]: Confirm Password
        - textbox "Confirm Password" [ref=e43]:
          - /placeholder: Confirm your password
          - text: password123
      - paragraph [ref=e44]: By signing up, you agree to our Terms & Privacy Policy
      - paragraph [ref=e45]: Could not connect to the server. Please try again later.
      - button "Create Account" [ref=e46]
      - generic [ref=e49]: or
      - button "Sign up with Google" [ref=e51]
    - paragraph [ref=e52]:
      - text: Already have an account?
      - link "Sign in" [ref=e53] [cursor=pointer]:
        - /url: /claudedaily/login
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | const newspaper = process.env.TEST_NEWSPAPER!;
  4  | const existingEmail = process.env.TEST_EMAIL!;
  5  | 
  6  | test.describe("Registration", () => {
  7  |   test("registers a new user and shows verification message", async ({ page }) => {
  8  |     await page.goto(`/${newspaper}/register`);
  9  | 
  10 |     // Wait for newspaper data to load from API before filling form
  11 |     await page.waitForResponse((res) => res.url().includes("/api/newspapers/by-slug/"));
  12 | 
  13 |     const uniqueEmail = `test+${Date.now()}@example.com`;
  14 |     const uniqueUsername = `testuser${Date.now()}`;
  15 | 
  16 |     await page.getByLabel("Full Name").fill("E2E Test User");
  17 |     await page.getByLabel("Username").fill(uniqueUsername);
  18 |     await page.getByLabel("Email Address").fill(uniqueEmail);
  19 |     await page.getByLabel("Password", { exact: true }).fill("password123");
  20 |     await page.getByLabel("Confirm Password").fill("password123");
  21 |     await page.getByRole("button", { name: "Create Account" }).click();
  22 | 
> 23 |     await expect(page.getByText("Check your email")).toBeVisible({ timeout: 10000 });
     |                                                     ^ Error: expect(locator).toBeVisible() failed
  24 |     await expect(page.getByText(uniqueEmail)).toBeVisible();
  25 |   });
  26 | 
  27 |   test("shows error when registering with an existing email", async ({ page }) => {
  28 |     await page.goto(`/${newspaper}/register`);
  29 | 
  30 |     await page.getByLabel("Username").fill(`dup${Date.now()}`);
  31 |     await page.getByLabel("Email Address").fill(existingEmail);
  32 |     await page.getByLabel("Password", { exact: true }).fill("password123");
  33 |     await page.getByLabel("Confirm Password").fill("password123");
  34 |     await page.getByRole("button", { name: "Create Account" }).click();
  35 | 
  36 |     await expect(page.getByText("This email is already registered")).toBeVisible();
  37 |   });
  38 | });
  39 | 
```