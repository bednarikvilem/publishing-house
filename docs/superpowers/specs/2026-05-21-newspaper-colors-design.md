# Newspaper Brand Colors — Design Spec

**Date:** 2026-05-21
**Branch:** feature/newspaper_colors
**Status:** Approved

---

## Overview

Each newspaper in the publishing house gets an optional primary accent color chosen from a curated preset palette. The color is set by the Director or System Administrator. It applies only to the public-facing newspaper pages (homepage, article, author, category, search); the portal/admin pages are unaffected.

---

## 1. Data Model

### newspapers table

Add one column:

| Column | Type | Default | Constraint |
|---|---|---|---|
| `primary_color` | `varchar(50)` | `NULL` | One of the valid preset keys or NULL |

Valid preset keys: `"blue"`, `"rose"`, `"emerald"`, `"violet"`, `"orange"`, `"teal"`.  
`NULL` means the newspaper uses the default amber theme.

**Migration:** Add the column to `apps/server/src/db/schema.ts` and apply with `bun db:push`.

**API contract:** `docs/API.md` must be updated to include the new `PATCH /api/newspapers/:newspaper_id` endpoint and the extended response shape for the two existing GET endpoints.

---

## 2. API

### Extended responses

Both `GET /api/newspapers/by-slug/:slug` and `GET /api/newspapers/:newspaper_id` extend their response body to include:

```json
{
  "id": "...",
  "name": "Daily Tech",
  "slug": "daily-tech",
  "primary_color": "blue"
}
```

`primary_color` is `string | null`.

### New endpoint

**`PATCH /api/newspapers/:newspaper_id`**

- **Auth required:** Yes — `DIRECTOR` or `SYSTEM_ADMINISTRATOR`
- **Body:**
  ```json
  { "primary_color": "blue" }
  ```
  `primary_color` must be one of the 6 valid preset keys or `null` (to reset to default). Any other value returns `400 BAD_REQUEST` with `{ "error": "INVALID_COLOR" }`.
- **Responses:**
  - `200 OK` — `{ "id": "...", "name": "...", "slug": "...", "primary_color": "blue" }`
  - `400 Bad Request` — invalid preset key
  - `401 Unauthorized` — no token
  - `403 Forbidden` — caller is not Director or Admin
  - `404 Not Found` — newspaper does not exist

---

## 3. CSS Theme Classes

Six preset classes added to `apps/web/styles/globals.css`. Each overrides only `--primary`, `--primary-foreground`, and `--ring`. The existing amber values in `:root` remain the default (no class needed).

```css
.theme-blue    { --primary: oklch(0.623 0.214 255.6); --primary-foreground: oklch(0.98 0.01 255); --ring: oklch(0.623 0.214 255.6); }
.theme-rose    { --primary: oklch(0.645 0.246 16.4);  --primary-foreground: oklch(0.98 0.01 16);  --ring: oklch(0.645 0.246 16.4); }
.theme-emerald { --primary: oklch(0.696 0.17 162.5);  --primary-foreground: oklch(0.98 0.01 162); --ring: oklch(0.696 0.17 162.5); }
.theme-violet  { --primary: oklch(0.606 0.228 293.5); --primary-foreground: oklch(0.98 0.01 293); --ring: oklch(0.606 0.228 293.5); }
.theme-orange  { --primary: oklch(0.749 0.207 58.0);  --primary-foreground: oklch(0.38 0.07 57);  --ring: oklch(0.749 0.207 58.0); }
.theme-teal    { --primary: oklch(0.704 0.14 202.1);  --primary-foreground: oklch(0.98 0.01 202); --ring: oklch(0.704 0.14 202.1); }
```

These override the CSS variables that both `:root` and `.dark` resolve to, so no dark-mode-specific rules are needed for the presets.

---

## 4. Frontend — Applying the Theme

### Type change

`apps/web/src/types/index.ts` — extend the `Newspaper` interface:

```ts
export interface Newspaper {
  id: string;
  name: string;
  slug: string;
  primary_color: string | null;
}
```

No changes to `useNewspaper` — it returns the full newspaper object from the API.

### Pages to update

Each newspaper-facing page has a single root `<div className="bg-background text-foreground min-h-screen w-full">`. Extend the className to include the theme class when set:

```tsx
<div className={`bg-background text-foreground min-h-screen w-full${newspaper?.primary_color ? ` theme-${newspaper.primary_color}` : ""}`}>
```

Pages requiring this change (add a `useNewspaper()` call first if the page does not already have one):
- `apps/web/src/pages/NewspaperHomepage.tsx`
- `apps/web/src/pages/ArticlePage.tsx`
- `apps/web/src/pages/AuthorPage.tsx`
- `apps/web/src/pages/CategoryPage.tsx`
- `apps/web/src/pages/SearchResultsPage.tsx`
- `apps/web/src/pages/LoginPage.tsx`
- `apps/web/src/pages/SignUpPage.tsx`

Portal/admin pages (`DashboardPage`, `DirectorDashboardPage`, `AdminDashboardPage`, etc.) are under separate routes and do not call `useNewspaper` — they are not affected.

---

## 5. Director UI

### Sidebar tab

Add `"branding"` to the per-newspaper tab list in `DirectorDashboardPage`. The sidebar sub-navigation becomes:
- Approval Queue
- Publication Queue
- Statistics
- **Branding** ← new

The `ActiveView` union type gains `"branding"` as a valid tab value.

`NewspaperEntry` in the Director page extends to include `primary_color: string | null`.

### BrandingSection component

New file: `apps/web/src/pages/director/BrandingSection.tsx`

Props: `{ newspaperId: string; currentColor: string | null }`

Renders:
- Section title: "Newspaper Branding"
- Sub-heading: "Accent Color"
- A row of 7 clickable swatches:
  - **Default** (amber — no class applied, visually uses the current amber primary)
  - **Blue**, **Rose**, **Emerald**, **Violet**, **Orange**, **Teal**
- The active swatch has a ring indicator
- On click: calls `PATCH /api/newspapers/:newspaper_id` with `{ primary_color: key | null }`
- Shows a brief "Saved" inline confirmation after a successful update
- Manages its own local `selectedColor` state initialised from the `currentColor` prop; on successful PATCH the local state updates (no prop mutation)

The swatch colors are hardcoded in the component using the same oklch values as the CSS classes (inline style for the swatch circle preview).

---

## Preset Reference

| Key | Display name | oklch primary |
|---|---|---|
| `null` | Default (Amber) | `oklch(0.852 0.199 91.936)` |
| `"blue"` | Blue | `oklch(0.623 0.214 255.6)` |
| `"rose"` | Rose | `oklch(0.645 0.246 16.4)` |
| `"emerald"` | Emerald | `oklch(0.696 0.17 162.5)` |
| `"violet"` | Violet | `oklch(0.606 0.228 293.5)` |
| `"orange"` | Orange | `oklch(0.749 0.207 58.0)` |
| `"teal"` | Teal | `oklch(0.704 0.14 202.1)` |
