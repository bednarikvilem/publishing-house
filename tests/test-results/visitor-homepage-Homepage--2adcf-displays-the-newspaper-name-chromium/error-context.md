# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visitor/homepage.spec.ts >> Homepage >> loads and displays the newspaper name
- Location: e2e/visitor/homepage.spec.ts:6:2

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('header')
Expected substring: "Claudedaily"
Received string:    "ClaudeDailyHomePokemonLog inSign up"
Timeout: 5000ms

Call log:
  - Expect "to.have.text" with timeout 5000ms
  - waiting for locator('header')
    2 × locator resolved to <header class="border-border bg-background relative z-10 border-b">…</header>
      - unexpected value "ClaudeDailyHomeLog inSign up"
    6 × locator resolved to <header class="border-border bg-background relative z-10 border-b">…</header>
      - unexpected value "ClaudeDailyHomePokemonLog inSign up"

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
  - generic [ref=e23]:
    - img [ref=e25]
    - generic [ref=e26]:
      - generic [ref=e27]: Featured
      - heading "Calamitas demens creber sono" [level=1] [ref=e28]
      - link "Thomas O'Connell Apr 26, 2026" [ref=e29] [cursor=pointer]:
        - /url: /claudedaily/authors/506160d4-3c85-49b4-bf45-c637653aa811
        - generic [ref=e31]:
          - generic [ref=e32]: Thomas O'Connell
          - generic [ref=e33]: Apr 26, 2026
      - paragraph [ref=e34]: Adsidue libero fugiat praesentium cohaero causa expedita.
      - link "Read Full Article" [ref=e35] [cursor=pointer]:
        - /url: /claudedaily/articles/01e5d6e4-ac42-4efb-b9f0-023a8e193522
        - text: Read Full Article
        - img [ref=e36]
  - generic [ref=e38]:
    - heading "Latest News" [level=2] [ref=e39]
    - generic [ref=e40]:
      - generic [ref=e41] [cursor=pointer]:
        - img [ref=e43]
        - generic [ref=e44]:
          - generic [ref=e45]: Pokemon
          - paragraph [ref=e46]: Bellum aureus cruciamentum tergum
          - paragraph [ref=e47]: Demulceo cuppedia cunae sopor cicuta.
          - generic [ref=e48]:
            - link "Thomas O'Connell" [ref=e49]:
              - /url: /claudedaily/authors/506160d4-3c85-49b4-bf45-c637653aa811
            - generic [ref=e50]: Apr 22, 2026
      - generic [ref=e51] [cursor=pointer]:
        - img [ref=e53]
        - generic [ref=e54]:
          - generic [ref=e55]: Pokemon
          - paragraph [ref=e56]: Tego cursim suadeo tamen vitae valens ullam
          - paragraph [ref=e57]: Pecco itaque enim apparatus.
          - generic [ref=e58]:
            - link "Reagan Kutch" [ref=e59]:
              - /url: /claudedaily/authors/72142f6f-f36b-4cb1-8e13-3a5237d1a063
            - generic [ref=e60]: Apr 14, 2026
      - generic [ref=e61] [cursor=pointer]:
        - img [ref=e63]
        - generic [ref=e64]:
          - generic [ref=e65]: Pokemon
          - paragraph [ref=e66]: Atque bellicus atqui aranea minima doloremque paulatim non
          - paragraph [ref=e67]: Tripudio stillicidium tergeo acsi sumptus adulescens numquam.
          - generic [ref=e68]:
            - link "Thomas O'Connell" [ref=e69]:
              - /url: /claudedaily/authors/506160d4-3c85-49b4-bf45-c637653aa811
            - generic [ref=e70]: Mar 12, 2026
      - generic [ref=e71] [cursor=pointer]:
        - img [ref=e73]
        - generic [ref=e74]:
          - generic [ref=e75]: Pokemon
          - paragraph [ref=e76]: Subnecto conculco aliquid textilis dolorem solum victus alo iste
          - paragraph [ref=e77]: Aurum valens despecto decumbo amplitudo titulus.
          - generic [ref=e78]:
            - link "Thomas O'Connell" [ref=e79]:
              - /url: /claudedaily/authors/506160d4-3c85-49b4-bf45-c637653aa811
            - generic [ref=e80]: Mar 2, 2026
      - generic [ref=e81] [cursor=pointer]:
        - img [ref=e83]
        - generic [ref=e84]:
          - generic [ref=e85]: Pokemon
          - paragraph [ref=e86]: Cuius cubo aptus delinquo
          - paragraph [ref=e87]: Stultus tutamen ipsa carus conspergo charisma.
          - generic [ref=e88]:
            - link "Lela Durgan" [ref=e89]:
              - /url: /claudedaily/authors/5a269125-41cf-4a7c-aad5-b679ec6f0449
            - generic [ref=e90]: Feb 24, 2026
      - generic [ref=e91] [cursor=pointer]:
        - img [ref=e93]
        - generic [ref=e94]:
          - generic [ref=e95]: Pokemon
          - paragraph [ref=e96]: Bellicus totidem nobis aspernatur
          - paragraph [ref=e97]: Utilis impedit cunae vereor aranea error.
          - generic [ref=e98]:
            - link "Thomas O'Connell" [ref=e99]:
              - /url: /claudedaily/authors/506160d4-3c85-49b4-bf45-c637653aa811
            - generic [ref=e100]: Feb 19, 2026
      - generic [ref=e101] [cursor=pointer]:
        - img [ref=e103]
        - generic [ref=e104]:
          - generic [ref=e105]: Pokemon
          - paragraph [ref=e106]: Blandior laudantium arma defungo pax
          - paragraph [ref=e107]: Altus peccatus appositus creber ceno iure tamisium illo decumbo.
          - generic [ref=e108]:
            - link "Lela Durgan" [ref=e109]:
              - /url: /claudedaily/authors/5a269125-41cf-4a7c-aad5-b679ec6f0449
            - generic [ref=e110]: Feb 16, 2026
      - generic [ref=e111] [cursor=pointer]:
        - img [ref=e113]
        - generic [ref=e114]:
          - generic [ref=e115]: Pokemon
          - paragraph [ref=e116]: Voveo videlicet degenero subiungo demonstro aureus
          - paragraph [ref=e117]: Tego barba attero tolero dedico super cum demo excepturi concido.
          - generic [ref=e118]:
            - link "Thomas O'Connell" [ref=e119]:
              - /url: /claudedaily/authors/506160d4-3c85-49b4-bf45-c637653aa811
            - generic [ref=e120]: Feb 11, 2026
      - generic [ref=e121] [cursor=pointer]:
        - img [ref=e123]
        - generic [ref=e124]:
          - generic [ref=e125]: Pokemon
          - paragraph [ref=e126]: Atavus spargo conturbo aduro ars
          - paragraph [ref=e127]: Adsum abbas aegrus aureus cubicularis tibi versus.
          - generic [ref=e128]:
            - link "Lela Durgan" [ref=e129]:
              - /url: /claudedaily/authors/5a269125-41cf-4a7c-aad5-b679ec6f0449
            - generic [ref=e130]: Feb 1, 2026
      - generic [ref=e131] [cursor=pointer]:
        - img [ref=e133]
        - generic [ref=e134]:
          - generic [ref=e135]: Pokemon
          - paragraph [ref=e136]: Voluptate coerceo astrum demergo callide amo
          - paragraph [ref=e137]: Alii coadunatio crur adstringo coniecto crur numquam infit voluptates deorsum.
          - generic [ref=e138]:
            - link "Reagan Kutch" [ref=e139]:
              - /url: /claudedaily/authors/72142f6f-f36b-4cb1-8e13-3a5237d1a063
            - generic [ref=e140]: Jan 21, 2026
      - generic [ref=e141] [cursor=pointer]:
        - img [ref=e143]
        - generic [ref=e144]:
          - generic [ref=e145]: Pokemon
          - paragraph [ref=e146]: Cimentarius vesco templum celo compono
          - paragraph [ref=e147]: Articulus umbra demoror verecundia crinis copia.
          - generic [ref=e148]:
            - link "Reagan Kutch" [ref=e149]:
              - /url: /claudedaily/authors/72142f6f-f36b-4cb1-8e13-3a5237d1a063
            - generic [ref=e150]: Dec 15, 2025
      - generic [ref=e151] [cursor=pointer]:
        - img [ref=e153]
        - generic [ref=e154]:
          - generic [ref=e155]: Pokemon
          - paragraph [ref=e156]: Deorsum tui cur tamisium peccatus advoco rem considero
          - paragraph [ref=e157]: Ascisco error adipiscor.
          - generic [ref=e158]:
            - link "Lela Durgan" [ref=e159]:
              - /url: /claudedaily/authors/5a269125-41cf-4a7c-aad5-b679ec6f0449
            - generic [ref=e160]: Dec 7, 2025
      - generic [ref=e161] [cursor=pointer]:
        - img [ref=e163]
        - generic [ref=e164]:
          - generic [ref=e165]: Pokemon
          - paragraph [ref=e166]: Trans turpis iste volutabrum
          - paragraph [ref=e167]: Baiulus quos ceno ademptio deserunt crastinus arma cubicularis supellex.
          - generic [ref=e168]:
            - link "Lela Durgan" [ref=e169]:
              - /url: /claudedaily/authors/5a269125-41cf-4a7c-aad5-b679ec6f0449
            - generic [ref=e170]: Nov 9, 2025
      - generic [ref=e171] [cursor=pointer]:
        - img [ref=e173]
        - generic [ref=e174]:
          - generic [ref=e175]: Pokemon
          - paragraph [ref=e176]: Creber quae degusto velum aro crinis officia audentia nam
          - paragraph [ref=e177]: Adamo stillicidium subiungo quia vereor amita ademptio cumque acies.
          - generic [ref=e178]:
            - link "Thomas O'Connell" [ref=e179]:
              - /url: /claudedaily/authors/506160d4-3c85-49b4-bf45-c637653aa811
            - generic [ref=e180]: Nov 5, 2025
      - generic [ref=e181] [cursor=pointer]:
        - img [ref=e183]
        - generic [ref=e184]:
          - generic [ref=e185]: Pokemon
          - paragraph [ref=e186]: Cognatus abeo atrox causa crur comparo sub vito illum vitium
          - paragraph [ref=e187]: Quae thesaurus campana deinde claustrum crepusculum cerno urbs adficio.
          - generic [ref=e188]:
            - link "Lela Durgan" [ref=e189]:
              - /url: /claudedaily/authors/5a269125-41cf-4a7c-aad5-b679ec6f0449
            - generic [ref=e190]: Oct 12, 2025
      - generic [ref=e191] [cursor=pointer]:
        - img [ref=e193]
        - generic [ref=e194]:
          - generic [ref=e195]: Pokemon
          - paragraph [ref=e196]: Velum auditor conventus aspicio vilis stips arma
          - paragraph [ref=e197]: Verbum quasi sublime.
          - generic [ref=e198]:
            - link "Lela Durgan" [ref=e199]:
              - /url: /claudedaily/authors/5a269125-41cf-4a7c-aad5-b679ec6f0449
            - generic [ref=e200]: Jul 29, 2025
      - generic [ref=e201] [cursor=pointer]:
        - img [ref=e203]
        - generic [ref=e204]:
          - generic [ref=e205]: Pokemon
          - paragraph [ref=e206]: Vigor quibusdam vos dolorem conventus dignissimos demulceo
          - paragraph [ref=e207]: Avarus ullam crinis audacia sordeo placeat utpote suppono aliquid valetudo.
          - generic [ref=e208]:
            - link "Reagan Kutch" [ref=e209]:
              - /url: /claudedaily/authors/72142f6f-f36b-4cb1-8e13-3a5237d1a063
            - generic [ref=e210]: Jul 27, 2025
      - generic [ref=e211] [cursor=pointer]:
        - img [ref=e213]
        - generic [ref=e214]:
          - generic [ref=e215]: Pokemon
          - paragraph [ref=e216]: Auxilium dolores bis vomica iste baiulus terga
          - paragraph [ref=e217]: Autem contigo abeo turbo vinculum color antea tollo.
          - generic [ref=e218]:
            - link "Reagan Kutch" [ref=e219]:
              - /url: /claudedaily/authors/72142f6f-f36b-4cb1-8e13-3a5237d1a063
            - generic [ref=e220]: Jul 4, 2025
      - generic [ref=e221] [cursor=pointer]:
        - img [ref=e223]
        - generic [ref=e224]:
          - generic [ref=e225]: Pokemon
          - paragraph [ref=e226]: Sed tracto comparo candidus tribuo ulciscor uredo umerus ipsam truculenter
          - paragraph [ref=e227]: Denuncio adipiscor civitas voco clementia vallum alius.
          - generic [ref=e228]:
            - link "Lela Durgan" [ref=e229]:
              - /url: /claudedaily/authors/5a269125-41cf-4a7c-aad5-b679ec6f0449
            - generic [ref=e230]: Jul 3, 2025
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | const newspaper = process.env.TEST_NEWSPAPER!;
  4  | 
  5  | test.describe("Homepage", () => {
  6  |   test("loads and displays the newspaper name", async ({ page }) => {
  7  |     await page.goto(`/${newspaper}`);
> 8  |     await expect(page.locator("header")).toContainText(
     |                                         ^ Error: expect(locator).toContainText(expected) failed
  9  |       newspaper.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  10 |     );
  11 |   });
  12 | 
  13 |   test("displays at least one article card with title and perex", async ({ page }) => {
  14 |     await page.goto(`/${newspaper}`);
  15 |     const articleCards = page.locator("[class*='rounded-xl'][class*='border'][class*='cursor-pointer']");
  16 |     await expect(articleCards.first()).toBeVisible();
  17 |     await expect(articleCards.first().locator("p.font-bold")).toBeVisible();
  18 |   });
  19 | 
  20 |   test("clicking a category filters the page", async ({ page }) => {
  21 |     await page.goto(`/${newspaper}`);
  22 |     const categoryLink = page.locator("header nav a").filter({ hasNotText: "Home" }).first();
  23 |     const categoryName = await categoryLink.textContent();
  24 |     await categoryLink.click();
  25 |     await expect(page).toHaveURL(new RegExp(`/${newspaper}/category/`));
  26 |     await expect(page.locator("body")).toContainText(categoryName!);
  27 |   });
  28 | });
  29 | 
```