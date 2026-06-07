# DB Seed Redesign

**Date:** 2026-06-01
**Status:** Approved

## Goal

Replace the current seed's hardcoded, generic data with five realistic themed newspapers. Article titles, author biographies, image URLs, and article keywords should all reflect each newspaper's topic domain. The change must be fully contained within `apps/server/src/db/seeds/`.

---

## Newspapers

| Name | Domain |
|------|--------|
| AudioWire | Music — Pop & Rock, Rap, Electronic, Live Events |
| The Statline | Football — Mundial, Premier League, LaLiga, Transfers & Rumors, Match Analysis |
| The Binge Ledger | TV — Drama, Comedy & Sitcoms, Sci-Fi & Fantasy, Reality TV |
| ClaudeDaily | Tech — AI & Machine Learning, New Tech & Gadgets, Software & Coding, Cybersecurity |
| The PokéScope | Pokémon — Video Games, Trading Card Game, Anime & Movies, Pokémon GO |

ClaudeDaily keeps its current name so that `seedEmma.ts`, `seedArticleReviews.ts`, and `seedE2eUsers.ts` require no changes.

---

## Architecture

### Single Source of Truth: `seeds/data/newspapers.ts`

One new file exports the `NEWSPAPERS` array. Every seed function that needs newspaper or category data imports from here. Adding or renaming a newspaper means editing this file only.

Structure per newspaper entry:

```ts
{
  name: string,
  slug: string,
  bioTemplates: string[],   // 4 templates, each with 3 {slot} placeholders
  bioWordBank: Record<string, string[]>,  // 4 options per slot → 4^4 = 256 combinations
  categories: Array<{
    name: string,
    slug: string,
    templates: string[],    // title sentence templates with {slot} placeholders
    wordBank: Record<string, string[]>,
    imageKeywords: string,  // comma-separated, used in loremflickr URL
  }>
}
```

### Title Generation

A shared `generateFromTemplate(template, wordBank)` helper replaces `{slot}` tokens with a random entry from `wordBank[slot]`:

```ts
function generateFromTemplate(template: string, wordBank: Record<string, string[]>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    faker.helpers.arrayElement(wordBank[key] ?? [key])
  );
}
```

Extracted to `seeds/helpers.ts` and imported by both `seedArticles.ts` and `seedRandomAuthors.ts`.

### Article Keywords

Instead of `faker.lorem.words(5)`, keywords are drawn from the category's `wordBank` values. Five random words are picked across all word lists in the category and joined with ", ".

### Article Images

Replaced with Loremflickr using the category's `imageKeywords`:

```ts
`https://loremflickr.com/800/600/${category.imageKeywords}?lock=${faker.number.int({ min: 1, max: 9999 })}`
```

The `lock` parameter ensures a unique stable image per article. No HTTP requests happen at seed time — the URL is stored as a string and fetched by the browser at display time.

### Author Biographies

`seedRandomAuthors.ts` receives the `NEWSPAPERS` config (or looks up the newspaper by name from the config) and calls `generateFromTemplate` with the newspaper's `bioTemplates` and `bioWordBank` instead of `faker.lorem.sentence()`.

---

## Changed Files

| File | Change |
|------|--------|
| `seeds/data/newspapers.ts` | **New.** Full config — newspapers, categories, templates, word banks, image keywords, bio templates. |
| `seeds/helpers.ts` | **New.** Exports `generateFromTemplate(template, wordBank)` helper. |
| `seedNewspaper.ts` | Replace hardcoded `SPECIFIC_NEWSPAPERS` array with a map over `NEWSPAPERS` config. |
| `seedArticleCategories.ts` | Full redesign. Each category is inserted with its correct `newspaperId` from the config mapping. No more random shuffle across newspapers. |
| `seedArticles.ts` | Use `generateFromTemplate` for titles. Draw keywords from category `wordBank`. Use `loremflickr` URL instead of picsum. |
| `seedRandomAuthors.ts` | Use `generateFromTemplate` with newspaper `bioTemplates` + `bioWordBank` for author biographies. |
| `seedAddAuthors.ts` | **Delete.** Not imported or called from `seed.ts` — dead code. |

## Unchanged Files

`seed.ts`, `seedEmma.ts`, `seedArticleReviews.ts`, `seedE2eUsers.ts`, `seedSystemAdmin.ts`, `seedUsers.ts`, `seedUserRoles.ts`, `seedLikes.ts`, `seedComments.ts`, `seedArticleViews.ts`

---

## Config Content Specification

Each category requires:
- At least **4 title templates**, each with 2–3 `{slot}` placeholders
- Each slot has at least **6 word bank entries** to ensure title variety at 100+ articles per newspaper
- `imageKeywords`: 2–3 comma-separated terms that produce relevant Loremflickr results

Each newspaper requires:
- **4 bio sentence templates**, each with exactly **3 `{slot}` placeholders**
- Each slot has exactly **4 options** → 4 × 4³ = 256 unique biography combinations

---

## Seed Execution Order

No changes to execution order in `seed.ts`. The config file is a pure data module with no DB calls.

---

## Out of Scope

- Article body content (perex, content fields) remains `faker.lorem` — not visible in listing views
- `seedArticleReviews.ts` remains scoped to ClaudeDaily only — that newspaper is used for detailed presentation
- No new newspaper-specific managers or directors are seeded
