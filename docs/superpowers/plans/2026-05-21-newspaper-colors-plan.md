# Newspaper Brand Colors — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-05-21-newspaper-colors-design.md`
**Branch:** `feature/newspaper_colors`

---

## Step 1 — DB schema: add `primary_color` to newspapers

**File:** `apps/server/src/db/schema.ts`

In the `newspapers` pgTable definition, add:
```ts
primaryColor: varchar("primary_color", { length: 50 }),
```
(nullable by default — no `.notNull()`)

**Run:** `bun db:push` from `apps/server/` to apply the migration.

---

## Step 2 — Backend service: expose `primary_color` in GET responses

**File:** `apps/server/src/services/newspapers.ts`

In `listNewspapers`, `getNewspaperBySlug`, and `getNewspaperById`, extend every returned object to include `primary_color: n.primaryColor ?? null`.

---

## Step 3 — Backend route + service: `PATCH /api/newspapers/:newspaper_id`

**Files:**
- `apps/server/src/schemas/newspapers.ts` — add a Zod/Elysia body schema:
  ```ts
  const VALID_COLORS = ["blue", "rose", "emerald", "violet", "orange", "teal"] as const;
  // body: { primary_color: one of VALID_COLORS | null }
  ```
- `apps/server/src/services/newspapers.ts` — add `updateNewspaperColor(newspaperId, color, user, roles)`:
  - Requires `DIRECTOR` or `SYSTEM_ADMINISTRATOR`
  - Validates color against `VALID_COLORS` (or `null`)
  - Returns `400 BAD_REQUEST` with `{ error: "INVALID_COLOR" }` for unknown values
  - Updates the row, returns the full newspaper object including `primary_color`
- `apps/server/src/routes/newspapers.ts` — register:
  ```ts
  .patch("/api/newspapers/:newspaper_id", ...)
  ```

---

## Step 4 — Update `docs/API.md`

Add documentation for:
1. `PATCH /api/newspapers/:newspaper_id` — full spec (auth, body, responses)
2. Extended response shape (add `"primary_color"` field) in `GET /api/newspapers/by-slug/:slug` and `GET /api/newspapers/:newspaper_id` examples

---

## Step 5 — Frontend type

**File:** `apps/web/src/types/index.ts`

Extend the `Newspaper` interface:
```ts
export interface Newspaper {
  id: string;
  name: string;
  slug: string;
  primary_color: string | null;
}
```

---

## Step 6 — CSS preset classes

**File:** `apps/web/styles/globals.css`

Append after the `.dark { … }` block:
```css
.theme-blue    { --primary: oklch(0.623 0.214 255.6); --primary-foreground: oklch(0.98 0.01 255); --ring: oklch(0.623 0.214 255.6); }
.theme-rose    { --primary: oklch(0.645 0.246 16.4);  --primary-foreground: oklch(0.98 0.01 16);  --ring: oklch(0.645 0.246 16.4); }
.theme-emerald { --primary: oklch(0.696 0.17 162.5);  --primary-foreground: oklch(0.98 0.01 162); --ring: oklch(0.696 0.17 162.5); }
.theme-violet  { --primary: oklch(0.606 0.228 293.5); --primary-foreground: oklch(0.98 0.01 293); --ring: oklch(0.606 0.228 293.5); }
.theme-orange  { --primary: oklch(0.749 0.207 58.0);  --primary-foreground: oklch(0.38 0.07 57);  --ring: oklch(0.749 0.207 58.0); }
.theme-teal    { --primary: oklch(0.704 0.14 202.1);  --primary-foreground: oklch(0.98 0.01 202); --ring: oklch(0.704 0.14 202.1); }
```

---

## Step 7 — Apply theme class to newspaper-facing pages

For each page below, change every root `<div className="bg-background text-foreground min-h-screen w-full">` to:
```tsx
<div className={`bg-background text-foreground min-h-screen w-full${newspaper?.primary_color ? ` theme-${newspaper.primary_color}` : ""}`}>
```

Pages (all already call `useNewspaper` and expose `newspaper`):
- `apps/web/src/pages/NewspaperHomepage.tsx` — 1 root div
- `apps/web/src/pages/ArticlePage.tsx` — 3 root divs (not-found, restricted, and main return)
- `apps/web/src/pages/AuthorPage.tsx` — 3 root divs (loading, not-found, main)
- `apps/web/src/pages/CategoryPage.tsx` — 1 root div
- `apps/web/src/pages/SearchResultsPage.tsx` — 1 root div
- `apps/web/src/pages/LoginPage.tsx` — 2 root divs (loading guard + main)
- `apps/web/src/pages/SignUpPage.tsx` — 2 root divs (loading guard + main)

---

## Step 8 — BrandingSection component

**New file:** `apps/web/src/pages/director/BrandingSection.tsx`

Props: `{ newspaperId: string; currentColor: string | null }`

Preset map (hardcoded in the file):
```ts
const PRESETS = [
  { key: null,       label: "Default",  color: "oklch(0.852 0.199 91.936)" },
  { key: "blue",     label: "Blue",     color: "oklch(0.623 0.214 255.6)" },
  { key: "rose",     label: "Rose",     color: "oklch(0.645 0.246 16.4)" },
  { key: "emerald",  label: "Emerald",  color: "oklch(0.696 0.17 162.5)" },
  { key: "violet",   label: "Violet",   color: "oklch(0.606 0.228 293.5)" },
  { key: "orange",   label: "Orange",   color: "oklch(0.749 0.207 58.0)" },
  { key: "teal",     label: "Teal",     color: "oklch(0.704 0.14 202.1)" },
];
```

Behaviour:
- `selectedColor` local state initialised from `currentColor` prop
- On swatch click: call `PATCH /api/newspapers/:newspaper_id` with `{ primary_color: key }`, on success update `selectedColor` and briefly show "Saved"
- Active swatch: highlighted with a `ring-2 ring-offset-2` ring using Tailwind classes
- Layout: `SectionTitle` + label row of circular swatch buttons

---

## Step 9 — Wire BrandingSection into DirectorDashboardPage

**File:** `apps/web/src/pages/DirectorDashboardPage.tsx`

Changes:
1. Extend `NewspaperEntry` type: add `primary_color: string | null`
2. Add `"branding"` to the `ActiveView` tab union
3. Add "Branding" button to the per-newspaper sub-navigation in the sidebar (alongside Approval Queue, Publication Queue, Statistics)
4. Add a render branch: `selectedTab === "branding"` → `<BrandingSection newspaperId={selectedNewspaper.id} currentColor={selectedNewspaper.primary_color} />`
5. Import `BrandingSection`

---

## Order of execution

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9

Steps 1–4 are backend; steps 5–9 are frontend. They are independent and can be done in either order, but completing step 5 before step 7 avoids a TypeScript error on `newspaper.primary_color`.
