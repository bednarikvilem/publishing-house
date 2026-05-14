# Frontend Refactor: Code Structure & Component Reuse

**Date:** 2026-05-14
**Branch:** feature/refactor_fe
**Scope:** `apps/web/src/`

## Goal

Eliminate long files and repeated patterns by splitting large page files into focused sub-components and extracting genuinely shared UI into reusable components. No behaviour changes — purely structural.

## Guiding principle

A component lives where it is used. It moves to `components/` only when reused across multiple pages. Page-specific sub-components live in a `pages/<page>/` sub-folder alongside their parent page.

---

## 1. New shared components (`components/`)

### `FormField`

Wraps the repeated `label + input/textarea + error span` block that appears ~25 times across the codebase.

**Props:**
- `id: string`
- `label: string`
- `error?: string`
- `required?: boolean`
- `as?: "input" | "textarea"` (default: `"input"`)
- All other native `<input>` / `<textarea>` props spread through

**Used by:** `LoginPage`, `SignUpPage`, `UserProfilePage` (profile + password forms), `AdminDashboardPage` (create user form), `ArticleEditorPage` (category/keywords fields in sidebar)

### `AuthCard`

The centered card shell shared by all auth and portal login pages.

**Props:**
- `title: string` — newspaper or portal name shown at top
- `subtitle: string` — e.g. "Sign in to your account"
- `children: React.ReactNode` — the form content

**Used by:** `LoginPage`, `SignUpPage`, `AdminLoginPage`/`DirectorLoginPage` (merged → `GlobalLoginPage`), `VerifyEmailPage`, `PasswordResetPage`

---

## 2. Page-specific file splits

### `pages/admin/`

Extracted from `AdminDashboardPage.tsx` (currently 413 lines):

| File | Contents | Est. lines |
|---|---|---|
| `GlobalUsersSection.tsx` | Global user list, create user form, role removal | ~155 |
| `NewspaperUsersSection.tsx` | Per-newspaper user list, assign/remove roles | ~130 |
| `AdminDashboardPage.tsx` | Auth check, newspaper fetch, `PortalLayout` wiring | ~50 |

### `pages/director/`

Extracted from `DirectorDashboardPage.tsx` (currently 333 lines):

| File | Contents | Est. lines |
|---|---|---|
| `ApprovalQueue.tsx` | Articles awaiting director approval, `DecisionForm` | ~95 |
| `PublicationQueue.tsx` | Articles approved by director, publish action | ~75 |
| `DirectorDashboardPage.tsx` | Auth check, newspaper fetch, sidebar, section routing | ~80 |

### `pages/profile/`

Extracted from `UserProfilePage.tsx` (currently 541 lines):

| File | Contents | Est. lines |
|---|---|---|
| `ProfileInfoCard.tsx` | Avatar upload, name/username/bio form, save | ~165 |
| `PasswordCard.tsx` | Current/new/confirm password form, save | ~90 |
| `DangerZoneCard.tsx` | Delete account button and description | ~25 |
| `UserProfilePage.tsx` | Profile fetch, loading/error state, card composition | ~40 |

### `components/stats/`

Extracted from `StatisticsSection.tsx` (currently 509 lines):

| File | Contents | Est. lines |
|---|---|---|
| `KpiCard.tsx` | Single KPI metric card with icon and colour | ~30 |
| `HorizBar.tsx` | Horizontal bar with label, value, optional sub-text | ~25 |
| `StatCard.tsx` | Section card wrapper with title and icon | ~15 |
| `Timeline.tsx` | Bar chart timeline over 30 days | ~35 |
| `TopArticlesPanel.tsx` | Tabbed panel: most viewed / liked / commented | ~55 |
| `NewspaperStatsDashboard.tsx` | Full newspaper-level statistics layout | ~120 |
| `GlobalStatsDashboard.tsx` | Director global view with comparison table | ~55 |
| `StatisticsSection.tsx` | Fetch logic, global/newspaper toggle, render | ~50 |

---

## 3. Utility deduplication

### Remove local `formatDate` from `AuthorPage`

`AuthorPage.tsx` defines its own `formatDate` function. `lib/utils.ts` already exports an identical one. Remove the local copy and import from `lib/utils.ts`.

### Extract `slugToDisplayName` into `lib/utils.ts`

The slug → title-case conversion:
```ts
name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
```
is inlined in `LoginPage`, `SignUpPage`, and `Navbar`. Add it as a named export in `lib/utils.ts` and replace all three occurrences.

---

## 4. Merge `AdminLoginPage` + `DirectorLoginPage`

The two files are identical except for the post-login redirect path (`/admin/dashboard` vs `/director/dashboard`). Replace both with a single `GlobalLoginPage` component.

**Props:**
- `title: string` — portal name shown on the card (e.g. "Admin Portal")
- `redirectTo: string` — path to navigate to on successful login

**File location:** `pages/GlobalLoginPage.tsx`

**Router usage in `App.tsx`:**
```tsx
<Route path="/admin" element={<GlobalLoginPage title="Admin Portal" redirectTo="/admin/dashboard" />} />
<Route path="/director" element={<GlobalLoginPage title="Director Portal" redirectTo="/director/dashboard" />} />
```

The existing `AdminLoginPage.tsx` and `DirectorLoginPage.tsx` files are deleted. The theme toggle button that currently appears on these pages lives outside `AuthCard`, at the page level in `GlobalLoginPage`.

---

## File count summary

| Area | Before | After |
|---|---|---|
| `components/` | 15 files | 21 files (+6 stats primitives) |
| `pages/` (top-level) | 17 files | 15 files (2 login pages merged) |
| `pages/dashboard/` | 4 files | 4 files (unchanged) |
| `pages/admin/` | — | 3 files (new) |
| `pages/director/` | — | 3 files (new) |
| `pages/profile/` | — | 4 files (new) |
| `components/stats/` | — | 8 files (new) |

No new dependencies. No API changes. No behaviour changes.

---

## Out of scope

- Extracting data-fetching into custom hooks (Option C — deferred)
- Any new features
- Changes to `apps/server/`
