# Implementation Plan: Frontend Refactor

Spec: `2026-05-14-frontend-refactor-design.md`

Steps are ordered so each step only depends on things already done. Each step is independently committable and safe to review on its own.

---

## Step 1 — Utility deduplication in `lib/utils.ts`

**Files changed:** `apps/web/src/lib/utils.ts`, `apps/web/src/pages/AuthorPage.tsx`

- Add `slugToDisplayName(slug: string): string` export to `lib/utils.ts`
- Remove the local `formatDate` function from `AuthorPage.tsx` and import from `lib/utils.ts`
- Replace the inlined slug conversion in `AuthorPage` (if present) with `slugToDisplayName`

---

## Step 2 — Create `FormField` component

**Files changed:** `apps/web/src/components/FormField.tsx` (new)

Create a component that wraps the repeated `label + input/textarea + error span` pattern.

```tsx
interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  as?: "input" | "textarea";
  textareaProps?: React.TextareaHTMLAttributes<HTMLTextAreaElement>;
}
```

The standard input className used across the codebase:
```
border-input bg-background text-foreground placeholder:text-muted-foreground
focus:ring-ring/50 focus:border-ring h-10 w-full rounded-md border px-3
text-[14px] focus:ring-2 focus:outline-none
```

The textarea variant uses the same base minus `h-10`, plus `resize-none py-2`.

---

## Step 3 — Create `AuthCard` component

**Files changed:** `apps/web/src/components/AuthCard.tsx` (new)

Wraps the centered card shell used by all auth pages:

```tsx
interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}
```

Renders:
```
min-h-screen centered layout
  └── max-w-[420px] card (border-border bg-card rounded-xl border p-10 shadow-sm)
        ├── title (text-[26px] font-black Outfit)
        ├── subtitle (text-muted-foreground text-[15px])
        └── children
```

Does NOT include the theme toggle — that stays at the page level.

---

## Step 4 — Split `StatisticsSection` into `components/stats/`

**Files changed:** 8 new files, `components/StatisticsSection.tsx` reduced to ~50 lines

Create `apps/web/src/components/stats/`:

1. `KpiCard.tsx` — extract `KpiCard` function + its `bg` color map
2. `HorizBar.tsx` — extract `HorizBar` function
3. `StatCard.tsx` — extract the local `Card` wrapper function (rename to `StatCard` to avoid collision with shadcn's `card.tsx`)
4. `Timeline.tsx` — extract `Timeline` function
5. `TopArticlesPanel.tsx` — extract `TopArticlesPanel` function (depends on `StatCard`, `HorizBar`, `Empty`)
6. `NewspaperStatsDashboard.tsx` — extract `NewspaperStatsDashboard` (depends on all above)
7. `GlobalStatsDashboard.tsx` — extract `GlobalStatsDashboard` (depends on `KpiCard`, `StatCard`)
8. Move the local SVG icon map `I` and `Empty` helper into a `stats/internal.tsx` (not exported, used only within this folder)

`StatisticsSection.tsx` keeps only: type imports, `useState`/`useEffect` fetch logic, the global/newspaper toggle UI, and renders `NewspaperStatsDashboard` or `GlobalStatsDashboard`.

All type interfaces (`ArticleStat`, `EditorStat`, `NewspaperStats`, `GlobalStats`) move to a `stats/types.ts` file.

---

## Step 5 — Split `UserProfilePage` into `pages/profile/`

**Files changed:** 4 new files, `UserProfilePage.tsx` reduced to ~40 lines

Create `apps/web/src/pages/profile/`:

1. `ProfileInfoCard.tsx` — avatar upload, name/username/bio form, save handler. Receives `profile` and an `onSaved` callback. Uses `FormField`.
2. `PasswordCard.tsx` — current/new/confirm password form, save handler. Self-contained (only needs auth token). Uses `FormField`.
3. `DangerZoneCard.tsx` — delete account button and description. Self-contained.

`UserProfilePage.tsx` keeps only: the `useEffect` to fetch profile, loading/error state, the incomplete-author warning banner, and renders the three cards.

Note: `ProfileInfoCard` needs the `splitFullName` helper — move it to `lib/utils.ts` or keep it local in `ProfileInfoCard.tsx`.

---

## Step 6 — Split `AdminDashboardPage` into `pages/admin/`

**Files changed:** 2 new files, `AdminDashboardPage.tsx` reduced to ~50 lines

Create `apps/web/src/pages/admin/`:

1. `GlobalUsersSection.tsx` — extract `GlobalUsersSection` function. Uses `FormField` for the create-user form fields.
2. `NewspaperUsersSection.tsx` — extract `NewspaperUsersSection` function.

`AdminDashboardPage.tsx` keeps only: auth check `useEffect`, newspapers fetch, `handleLogout`, sidebar JSX, and renders `GlobalUsersSection` or `NewspaperUsersSection`.

---

## Step 7 — Split `DirectorDashboardPage` into `pages/director/`

**Files changed:** 2 new files, `DirectorDashboardPage.tsx` reduced to ~80 lines

Create `apps/web/src/pages/director/`:

1. `ApprovalQueue.tsx` — extract `ApprovalQueue` function (queue fetch, `handleDecision`, list rendering).
2. `PublicationQueue.tsx` — extract `PublicationQueue` function (queue fetch, `handlePublish`, list rendering).

`DirectorDashboardPage.tsx` keeps only: auth check, newspapers fetch, `handleLogout`, sidebar JSX, and the section-routing render block.

---

## Step 8 — Merge login pages into `GlobalLoginPage`

**Files changed:** `pages/GlobalLoginPage.tsx` (new), `pages/AdminLoginPage.tsx` (deleted), `pages/DirectorLoginPage.tsx` (deleted), `App.tsx` (router updated)

1. Create `pages/GlobalLoginPage.tsx` accepting `title: string` and `redirectTo: string` props. Uses `AuthCard`. Keeps the theme toggle button at page level (outside `AuthCard`).
2. Delete `AdminLoginPage.tsx` and `DirectorLoginPage.tsx`.
3. In `App.tsx`, replace:
   ```tsx
   <Route path="/admin" element={<AdminLoginPage />} />
   <Route path="/director" element={<DirectorLoginPage />} />
   ```
   with:
   ```tsx
   <Route path="/admin" element={<GlobalLoginPage title="Admin Portal" redirectTo="/admin/dashboard" />} />
   <Route path="/director" element={<GlobalLoginPage title="Director Portal" redirectTo="/director/dashboard" />} />
   ```

---

## Step 9 — Update `LoginPage` and `SignUpPage` to use `FormField` + `AuthCard`

**Files changed:** `pages/LoginPage.tsx`, `pages/SignUpPage.tsx`

- Replace the centered card wrapper with `<AuthCard title={slugToDisplayName(newspaperName)} subtitle="…">`
- Replace each `label + input + error span` block with `<FormField …>`
- Import `slugToDisplayName` from `lib/utils.ts` (removes the local inline conversion)

---

## Step 10 — Update `VerifyEmailPage` and `PasswordResetPage` to use `AuthCard`

**Files changed:** `pages/VerifyEmailPage.tsx`, `pages/PasswordResetPage.tsx`

- Replace the centered card wrapper with `<AuthCard …>`
- Use `FormField` for any input fields in `PasswordResetPage`

---

## Step 11 — Update `Navbar` to use `slugToDisplayName`

**Files changed:** `components/Navbar.tsx`

- Replace the inlined slug conversion with `slugToDisplayName` from `lib/utils.ts`

---

## Step 12 — Update `ArticleEditorPage` `EditorSidebar` to use `FormField`

**Files changed:** `pages/ArticleEditorPage.tsx`

- Replace the category select and keywords input blocks in `EditorSidebar` with `FormField` (or at minimum the keywords `input + label` block — the category select is a `<select>`, which `FormField` may not cover; keep as-is if it doesn't fit cleanly)

---

## Ordering rationale

```
Step 1  (utils)          — no dependencies
Step 2  (FormField)      — no dependencies
Step 3  (AuthCard)       — no dependencies
Step 4  (stats split)    — no dependencies on 1-3
Step 5  (profile split)  — depends on Step 2 (FormField)
Step 6  (admin split)    — depends on Step 2 (FormField)
Step 7  (director split) — no dependencies on 1-3
Step 8  (GlobalLogin)    — depends on Step 3 (AuthCard)
Step 9  (Login/SignUp)   — depends on Steps 2, 3 (FormField + AuthCard)
Step 10 (Verify/Reset)   — depends on Step 3 (AuthCard)
Step 11 (Navbar)         — depends on Step 1 (slugToDisplayName)
Step 12 (EditorSidebar)  — depends on Step 2 (FormField)
```

Steps 1–4 can be done in any order or in parallel. Steps 5–12 depend on whichever of 1–4 they need.

---

## Definition of done

- No file in `apps/web/src/` exceeds ~200 lines (except `RichTextEditor.tsx` which is complex and out of scope)
- `components/` contains only components used by 2+ pages
- `FormField` is used everywhere the old `label + input + error` pattern appeared
- `AuthCard` is used by all 4 auth/login pages
- `AdminLoginPage.tsx` and `DirectorLoginPage.tsx` are deleted
- TypeScript compiles without errors (`bun run typecheck` or equivalent)
- No visual or behavioural changes
