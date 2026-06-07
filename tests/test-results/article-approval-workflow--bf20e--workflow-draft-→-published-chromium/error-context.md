# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: article-approval-workflow.spec.ts >> full article approval workflow: draft → published
- Location: e2e/article-approval-workflow.spec.ts:35:0

# Error details

```
Error: forResponse: Target page, context or browser has been closed
```

# Test source

```ts
  10  | const EMMA = { email: "emma.bednarikova@email.cz", password: "test1234" };
  11  | const DIRECTOR = { email: "director@claudedaily.cz", password: "test1234" };
  12  | 
  13  | const FIXTURE_IMAGE = path.resolve(__dirname, "../fixtures/test-cover.png");
  14  | 
  15  | // ── Helpers ────────────────────────────────────────────────────────────────────
  16  | 
  17  | async function loginNewspaper(page: Page, email: string, password: string) {
  18  |   await page.goto(`${BASE}/${NEWSPAPER}/login`);
  19  |   await page.getByLabel("Email Address").fill(email);
  20  |   await page.getByLabel("Password").fill(password);
  21  |   await page.getByRole("button", { name: "Sign In" }).click();
  22  |   await page.waitForURL((url) => !url.pathname.endsWith("/login"));
  23  | }
  24  | 
  25  | async function loginDirector(page: Page, email: string, password: string) {
  26  |   await page.goto(`${BASE}/director`);
  27  |   await page.getByLabel("Email Address").fill(email);
  28  |   await page.getByLabel("Password").fill(password);
  29  |   await page.getByRole("button", { name: "Sign In" }).click();
  30  |   await page.waitForURL(`${BASE}/director/dashboard`);
  31  | }
  32  | 
  33  | // ── Test ───────────────────────────────────────────────────────────────────────
  34  | 
  35  | test("full article approval workflow: draft → published", async ({ browser }) => {
  36  |   test.setTimeout(120_000);
  37  |   const janCtx = await browser.newContext();
  38  |   const emmaCtx = await browser.newContext();
  39  |   const directorCtx = await browser.newContext();
  40  | 
  41  |   const jan = await janCtx.newPage();
  42  |   const emma = await emmaCtx.newPage();
  43  |   const director = await directorCtx.newPage();
  44  | 
  45  |   const articleTitle = `E2E Workflow ${Date.now()}`;
  46  | 
  47  |   // ── 1. Jan logs in and creates a draft ──────────────────────────────────────
  48  | 
  49  |   await loginNewspaper(jan, JAN.email, JAN.password);
  50  | 
  51  |   await jan.goto(`${BASE}/${NEWSPAPER}/articles/new`);
  52  |   await jan.locator("input[placeholder='Article title…']").fill(articleTitle);
  53  |   await jan.locator("textarea[placeholder*='Short introduction']").fill("E2E test perex");
  54  |   await jan.locator("[contenteditable='true']").click();
  55  |   await jan.keyboard.type("E2E test article body.");
  56  |   await jan.locator("select").first().selectOption({ index: 1 });
  57  |   await jan.getByRole("button", { name: "Save Draft" }).click();
  58  |   await jan.waitForURL((url) => /\/articles\/.+\/edit/.test(url.pathname));
  59  | 
  60  |   // Save the edit URL so we can return to it later
  61  |   const articleEditUrl = jan.url();
  62  | 
  63  |   // Wait for the cover image upload button to be available (sidebar renders after page load)
  64  |   await expect(jan.getByRole("button", { name: "Upload Cover Image" })).toBeVisible({ timeout: 5_000 });
  65  | 
  66  |   // Upload cover image via the hidden file input next to the Upload button
  67  |   const uploadButton = jan.getByRole("button", { name: "Upload Cover Image" });
  68  |   const coverInput = uploadButton.locator("..").locator('input[type="file"]');
  69  |   const imageUploadResponse = jan.waitForResponse((r) => r.url().includes("/images") && r.status() === 201);
  70  |   await coverInput.setInputFiles(FIXTURE_IMAGE);
  71  |   await imageUploadResponse;
  72  |   await expect(jan.getByRole("button", { name: "Replace Cover Image" })).toBeVisible({ timeout: 10_000 });
  73  | 
  74  |   // ── 2. Jan checks article is visible as DRAFT ────────────────────────────────
  75  | 
  76  |   await jan.goto(`${BASE}/${NEWSPAPER}/author-dashboard?section=my-articles&status=DRAFT`);
  77  |   await expect(jan.getByText(articleTitle)).toBeVisible({ timeout: 5_000 });
  78  | 
  79  |   // ── 3. Jan submits the article for review ────────────────────────────────────
  80  | 
  81  |   // Return to the edit page and click Submit for Review
  82  |   await jan.goto(articleEditUrl);
  83  |   // Wait for the article to fully load before submitting
  84  |   await expect(jan.getByText("Draft", { exact: true })).toBeVisible({ timeout: 10_000 });
  85  |   const submitResponse = jan.waitForResponse(
  86  |     (r) => r.url().includes("/submit") && r.request().method() === "POST"
  87  |   );
  88  |   await jan.getByRole("button", { name: "Submit for Review" }).click();
  89  |   const submitRes = await submitResponse;
  90  |   expect(submitRes.status()).toBe(200);
  91  |   // Wait for navigation to author dashboard after successful submit
  92  |   await jan.waitForURL((url) => url.pathname.includes("/author-dashboard"), { timeout: 10_000 });
  93  | 
  94  |   // Jan checks article is visible as SUBMITTED
  95  |   await jan.goto(`${BASE}/${NEWSPAPER}/author-dashboard?section=my-articles&status=SUBMITTED`);
  96  |   await expect(jan.getByText(articleTitle)).toBeVisible({ timeout: 5_000 });
  97  | 
  98  |   // ── 4. Emma (NEWSPAPER_MANAGER) assigns herself as editor ───────────────────
  99  | 
  100 |   await loginNewspaper(emma, EMMA.email, EMMA.password);
  101 |   await emma.goto(`${BASE}/${NEWSPAPER}/author-dashboard?section=editorial-queue`);
  102 |   await expect(emma.getByRole("heading", { name: "Editorial Queue" })).toBeVisible();
  103 | 
  104 |   // Find the article row and click Assign Editor
  105 |   const articleRow = emma.locator(`text=${articleTitle}`).locator("..").locator("..");
  106 |   await articleRow.getByRole("button", { name: "Assign Editor" }).click();
  107 | 
  108 |   // Select Emma herself from the editor dropdown
  109 |   await emma.locator("select").filter({ hasText: "Select an editor…" }).selectOption({ label: "Emma Bednarikova" });
> 110 |   const assignResponse = emma.waitForResponse((r) => r.url().includes("/assign-editor") && r.status() === 200);
      |                              ^ Error: forResponse: Target page, context or browser has been closed
  111 |   await emma.getByRole("button", { name: "Assign", exact: true }).click();
  112 |   await assignResponse;
  113 | 
  114 |   // Jan checks article is now IN_REVIEW
  115 |   await jan.goto(`${BASE}/${NEWSPAPER}/author-dashboard?section=my-articles&status=IN_REVIEW`);
  116 |   await expect(jan.getByText(articleTitle)).toBeVisible({ timeout: 5_000 });
  117 | 
  118 |   // ── 5. Emma (EDITOR) approves in Review Queue ────────────────────────────────
  119 | 
  120 |   await emma.goto(`${BASE}/${NEWSPAPER}/author-dashboard?section=review-queue`);
  121 |   await expect(emma.getByRole("heading", { name: "Review Queue" })).toBeVisible();
  122 | 
  123 |   const reviewRow = emma.locator(`text=${articleTitle}`).locator("..").locator("..");
  124 |   await reviewRow.getByRole("button", { name: "Review" }).click();
  125 | 
  126 |   // APPROVE is the default decision — just click Submit
  127 |   const reviewResponse = emma.waitForResponse((r) => r.url().includes("/review") && r.status() === 200);
  128 |   await emma.getByRole("button", { name: "Submit" }).click();
  129 |   await reviewResponse;
  130 | 
  131 |   // Jan checks article visible as Approved (APPROVED_BY_EDITOR shown under "Approved" filter)
  132 |   await jan.goto(`${BASE}/${NEWSPAPER}/author-dashboard?section=my-articles&status=APPROVED_BY_EDITOR`);
  133 |   await expect(jan.getByText(articleTitle)).toBeVisible({ timeout: 5_000 });
  134 | 
  135 |   // ── 6. Emma (NEWSPAPER_MANAGER) approves in Editorial Queue ─────────────────
  136 | 
  137 |   await emma.goto(`${BASE}/${NEWSPAPER}/author-dashboard?section=editorial-queue`);
  138 | 
  139 |   const managerRow = emma.locator(`text=${articleTitle}`).locator("..").locator("..");
  140 |   await managerRow.getByRole("button", { name: "Review" }).click();
  141 | 
  142 |   // APPROVE is the default decision — just click Submit
  143 |   const managerApproveResponse = emma.waitForResponse((r) => r.url().includes("/approve") && r.status() === 200);
  144 |   await emma.getByRole("button", { name: "Submit" }).click();
  145 |   await managerApproveResponse;
  146 | 
  147 |   // ── 7. Director logs in and approves (APPROVED_BY_MANAGER → APPROVED_BY_DIRECTOR) ──
  148 | 
  149 |   await loginDirector(director, DIRECTOR.email, DIRECTOR.password);
  150 | 
  151 |   // Select ClaudeDaily newspaper in sidebar
  152 |   await director.getByRole("button", { name: /ClaudeDaily/i }).click();
  153 |   // Should auto-navigate to Approval Queue
  154 |   await expect(director.getByRole("heading", { name: "Approval Queue" })).toBeVisible({ timeout: 5_000 });
  155 |   await expect(director.getByText(articleTitle)).toBeVisible({ timeout: 5_000 });
  156 | 
  157 |   const approvalRow = director.locator(`text=${articleTitle}`).locator("..").locator("..");
  158 |   await approvalRow.getByRole("button", { name: "Decide" }).click();
  159 | 
  160 |   // APPROVE is already selected by default
  161 |   const directorApproveResponse = director.waitForResponse((r) => r.url().includes("/approve") && r.status() === 200);
  162 |   await director.getByRole("button", { name: "Submit" }).click();
  163 |   await directorApproveResponse;
  164 | 
  165 |   // ── 8. Director publishes the article ────────────────────────────────────────
  166 | 
  167 |   await director.getByRole("button", { name: "Publication Queue" }).click();
  168 |   await expect(director.getByRole("heading", { name: "Publication Queue" })).toBeVisible();
  169 |   await expect(director.getByText(articleTitle)).toBeVisible({ timeout: 5_000 });
  170 | 
  171 |   // Handle the confirm() dialog
  172 |   director.once("dialog", (dialog) => dialog.accept());
  173 |   const publishResponse = director.waitForResponse((r) => r.url().includes("/publish") && r.status() === 200);
  174 |   await director.getByRole("button", { name: "Publish" }).click();
  175 |   await publishResponse;
  176 | 
  177 |   // ── 9. Article appears on the newspaper homepage ─────────────────────────────
  178 | 
  179 |   await jan.goto(`${BASE}/${NEWSPAPER}/`);
  180 |   await expect(jan.getByText(articleTitle)).toBeVisible({ timeout: 5_000 });
  181 | 
  182 |   // ── Cleanup ───────────────────────────────────────────────────────────────────
  183 | 
  184 |   await janCtx.close();
  185 |   await emmaCtx.close();
  186 |   await directorCtx.close();
  187 | });
  188 | 
```