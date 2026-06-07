# Styling Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate inline `fontFamily` styles, define Tailwind v4 theme tokens for all arbitrary pixel values (font-size, tracking, leading), bulk-replace 295+ arbitrary-value classes, and document the accessibility-correct `!important` in `index.css`.

**Architecture:** This is a Tailwind v4 project (uses `@import "tailwindcss"` and `@theme inline` in `apps/web/styles/globals.css`). Custom tokens are defined in CSS via the `@theme inline` block — there is no `tailwind.config.js`. Tokens become utility classes automatically (e.g. `--text-2xs` → `text-2xs`, `--font-outfit` → `font-outfit`).

**Tech Stack:** Tailwind CSS v4, React 19, TypeScript, Bun, `@fontsource` packages

---

### File Map

| File | Action | What changes |
|------|--------|--------------|
| `apps/web/styles/globals.css` | Modify | Add `--font-outfit`, `--text-*`, `--tracking-*`, `--leading-*` tokens to `@theme inline` |
| `apps/web/src/index.css` | Modify | Add accessibility comment to `!important` block |
| `apps/web/src/components/PortalLayout.tsx` | Modify | Remove 3× inline `style={{ fontFamily }}`, add `font-outfit` class |
| `apps/web/src/components/AuthCard.tsx` | Modify | Remove inline `style={{ fontFamily }}`, add `font-outfit` class |
| `apps/web/src/pages/UserProfilePage.tsx` | Modify | Remove inline `style={{ fontFamily }}`, add `font-outfit` class |
| `apps/web/src/pages/profile/ProfileInfoCard.tsx` | Modify | Remove inline `style={{ fontFamily }}`, add `font-outfit` class |
| `apps/web/src/pages/profile/PasswordCard.tsx` | Modify | Remove inline `style={{ fontFamily }}`, add `font-outfit` class |
| `apps/web/src/pages/profile/DangerZoneCard.tsx` | Modify | Remove inline `style={{ fontFamily }}`, add `font-outfit` class |
| All `apps/web/src/**/*.tsx` | Modify | Bulk-replace arbitrary text-size, tracking, leading classes |

---

### Token Mapping Reference

**Font-size (arbitrary → token):**

| Arbitrary class | Maps to | Notes |
|-----------------|---------|-------|
| `text-[11px]` | `text-3xs` | Custom token (0.6875rem) |
| `text-[12px]` | `text-xs` | Standard Tailwind (0.75rem) |
| `text-[13px]` | `text-2xs` | Custom token (0.8125rem) |
| `text-[14px]` | `text-sm` | Standard Tailwind (0.875rem) |
| `text-[15px]` | `text-xs-plus` | Custom token (0.9375rem) |
| `text-[16px]` | `text-base` | Standard Tailwind (1rem) |
| `text-[18px]` | `text-lg` | Standard Tailwind (1.125rem) |
| `text-[20px]` | `text-xl` | Standard Tailwind (1.25rem) |
| `text-[22px]` | `text-xl-plus` | Custom token (1.375rem) |
| `text-[24px]` | `text-2xl` | Standard Tailwind (1.5rem) |
| `text-[26px]` | `text-2xl-plus` | Custom token (1.625rem) |
| `text-[28px]` | `text-3xl-minus` | Custom token (1.75rem) |
| `text-[32px]` | `text-3xl-plus` | Custom token (2rem) |
| `text-[40px]` | `text-4xl-plus` | Custom token (2.5rem) |
| `text-[48px]` | `text-5xl` | Standard Tailwind (3rem) |

**Tracking (arbitrary → token):**

| Arbitrary class | Maps to | Notes |
|-----------------|---------|-------|
| `tracking-[-0.3px]` | `tracking-snug` | Custom token |
| `tracking-[-0.5px]` | `tracking-tight-px` | Custom token |
| `tracking-[-1px]` | `tracking-tighter-px` | Custom token |
| `tracking-[0.5px]` | `tracking-wide-sm` | Custom token |

**Leading (arbitrary → token):**

| Arbitrary class | Maps to | Notes |
|-----------------|---------|-------|
| `leading-[1.15]` | `leading-2xs` | Custom token |
| `leading-[1.2]` | `leading-xs` | Custom token |
| `leading-[1.3]` | `leading-sm` | Custom token |
| `leading-[1.4]` | `leading-md` | Custom token |
| `leading-[1.5]` | `leading-normal` | Standard Tailwind |
| `leading-[1.6]` | `leading-relaxed` | Standard Tailwind (1.625 — close enough) |
| `leading-[1.7]` | `leading-lg` | Custom token |
| `leading-[1.8]` | `leading-xl` | Custom token |

---

## Task 1: Install Outfit Font Package

**Files:**
- Modify: `apps/web/package.json` (via `bun add`)

- [ ] **Step 1: Install the Outfit font package**

```bash
cd apps/web && bun add @fontsource/outfit
```

Expected output: package added to `apps/web/package.json` under `dependencies`.

- [ ] **Step 2: Verify the package installed**

```bash
ls apps/web/node_modules/@fontsource/outfit/index.css 2>/dev/null && echo "OK" || echo "MISSING"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json apps/web/bun.lock
git commit -m "chore: install @fontsource/outfit"
```

---

## Task 2: Add Outfit Font Import and All Theme Tokens

**Files:**
- Modify: `apps/web/styles/globals.css`

- [ ] **Step 1: Verify the current `@theme inline` block end**

```bash
grep -n "@theme\|--font-\|--text-\|--tracking-\|--leading-\|^}" apps/web/styles/globals.css | head -30
```

Expected: shows `@theme inline {` block with `--font-sans: ...` and `--radius-*` entries, then `}`.

- [ ] **Step 2: Add Outfit import at the top of globals.css (after existing @fontsource import)**

In `apps/web/styles/globals.css`, after the line:
```css
@import "@fontsource-variable/inter";
```

Add:
```css
@import "@fontsource/outfit";
```

- [ ] **Step 3: Add all custom tokens to the `@theme inline` block**

In `apps/web/styles/globals.css`, inside the `@theme inline { ... }` block, after the existing `--font-sans: "Inter Variable", sans-serif;` line, add:

```css
  /* Typography: font families */
  --font-outfit: "Outfit", "Inter Variable", sans-serif;

  /* Typography: font sizes (non-standard Tailwind sizes) */
  --text-3xs: 0.6875rem;    /* 11px */
  --text-2xs: 0.8125rem;    /* 13px */
  --text-xs-plus: 0.9375rem; /* 15px */
  --text-xl-plus: 1.375rem;  /* 22px */
  --text-2xl-plus: 1.625rem; /* 26px */
  --text-3xl-minus: 1.75rem; /* 28px */
  --text-3xl-plus: 2rem;     /* 32px */
  --text-4xl-plus: 2.5rem;   /* 40px */

  /* Typography: letter-spacing tokens */
  --tracking-snug: -0.3px;
  --tracking-tight-px: -0.5px;
  --tracking-tighter-px: -1px;
  --tracking-wide-sm: 0.5px;

  /* Typography: line-height tokens */
  --leading-2xs: 1.15;
  --leading-xs: 1.2;
  --leading-sm: 1.3;
  --leading-md: 1.4;
  --leading-lg: 1.7;
  --leading-xl: 1.8;
```

- [ ] **Step 4: Verify the CSS is valid by running the dev server briefly**

```bash
cd apps/web && bun run dev &
sleep 5 && curl -s http://localhost:5173 | head -5 && kill %1
```

Expected: HTML response without CSS compilation errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/styles/globals.css
git commit -m "feat: add Outfit font and typography theme tokens to globals.css"
```

---

## Task 3: Remove Inline fontFamily Styles

**Files:**
- Modify: `apps/web/src/components/PortalLayout.tsx`
- Modify: `apps/web/src/components/AuthCard.tsx`
- Modify: `apps/web/src/pages/UserProfilePage.tsx`
- Modify: `apps/web/src/pages/profile/ProfileInfoCard.tsx`
- Modify: `apps/web/src/pages/profile/PasswordCard.tsx`
- Modify: `apps/web/src/pages/profile/DangerZoneCard.tsx`

- [ ] **Step 1: Check all occurrences before editing**

```bash
grep -n 'style={{ fontFamily' apps/web/src/components/PortalLayout.tsx apps/web/src/components/AuthCard.tsx apps/web/src/pages/UserProfilePage.tsx apps/web/src/pages/profile/ProfileInfoCard.tsx apps/web/src/pages/profile/PasswordCard.tsx apps/web/src/pages/profile/DangerZoneCard.tsx
```

Expected: 8 lines showing the inline style.

- [ ] **Step 2: Remove inline fontFamily from PortalLayout.tsx and add font-outfit class**

In `apps/web/src/components/PortalLayout.tsx`, for each of the 3 elements that have `style={{ fontFamily: "Outfit, Inter, sans-serif" }}`:

Remove the `style={{ fontFamily: "Outfit, Inter, sans-serif" }}` prop and add `font-outfit` to the `className` string on that same element.

Example — if before:
```tsx
<div
  className="text-foreground text-[16px] font-black tracking-[-0.5px]"
  style={{ fontFamily: "Outfit, Inter, sans-serif" }}
>
```

After:
```tsx
<div className="text-foreground text-[16px] font-black tracking-[-0.5px] font-outfit">
```

Do this for all 3 occurrences in `PortalLayout.tsx` (lines 21, 47, 81).

- [ ] **Step 3: Remove inline fontFamily from AuthCard.tsx**

In `apps/web/src/components/AuthCard.tsx` line 14, remove `style={{ fontFamily: "Outfit, Inter, sans-serif" }}` and add `font-outfit` to the element's `className`.

- [ ] **Step 4: Remove inline fontFamily from UserProfilePage.tsx**

In `apps/web/src/pages/UserProfilePage.tsx` line 42, remove `style={{ fontFamily: "Outfit, Inter, sans-serif" }}` and add `font-outfit` to the element's `className`.

- [ ] **Step 5: Remove inline fontFamily from ProfileInfoCard.tsx**

In `apps/web/src/pages/profile/ProfileInfoCard.tsx` line 129, remove `style={{ fontFamily: "Outfit, Inter, sans-serif" }}` and add `font-outfit` to the element's `className`.

- [ ] **Step 6: Remove inline fontFamily from PasswordCard.tsx**

In `apps/web/src/pages/profile/PasswordCard.tsx` line 64, remove `style={{ fontFamily: "Outfit, Inter, sans-serif" }}` and add `font-outfit` to the element's `className`.

- [ ] **Step 7: Remove inline fontFamily from DangerZoneCard.tsx**

In `apps/web/src/pages/profile/DangerZoneCard.tsx` line 6, remove `style={{ fontFamily: "Outfit, Inter, sans-serif" }}` and add `font-outfit` to the element's `className`.

- [ ] **Step 8: Verify no inline fontFamily remains**

```bash
grep -rn 'style={{ fontFamily' apps/web/src/
```

Expected: no output.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/PortalLayout.tsx apps/web/src/components/AuthCard.tsx apps/web/src/pages/UserProfilePage.tsx apps/web/src/pages/profile/ProfileInfoCard.tsx apps/web/src/pages/profile/PasswordCard.tsx apps/web/src/pages/profile/DangerZoneCard.tsx
git commit -m "refactor: replace inline fontFamily styles with font-outfit Tailwind class"
```

---

## Task 4: Bulk-Replace Arbitrary Font-Size Classes (Standard Mappings)

These are exact 1:1 matches to standard Tailwind utilities — safe to replace globally.

**Files:** All `apps/web/src/**/*.tsx`

- [ ] **Step 1: Check counts before replacing**

```bash
grep -rn 'text-\[12px\]' apps/web/src/ | wc -l
grep -rn 'text-\[14px\]' apps/web/src/ | wc -l
grep -rn 'text-\[16px\]' apps/web/src/ | wc -l
grep -rn 'text-\[18px\]' apps/web/src/ | wc -l
grep -rn 'text-\[20px\]' apps/web/src/ | wc -l
grep -rn 'text-\[24px\]' apps/web/src/ | wc -l
grep -rn 'text-\[48px\]' apps/web/src/ | wc -l
```

Expected output (from pre-scan):
```
40
88
6
6
2
3
1
```

- [ ] **Step 2: Replace text-[12px] → text-xs**

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/text-\[12px\]/text-xs/g'
```

- [ ] **Step 3: Replace text-[14px] → text-sm**

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/text-\[14px\]/text-sm/g'
```

- [ ] **Step 4: Replace text-[16px] → text-base**

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/text-\[16px\]/text-base/g'
```

- [ ] **Step 5: Replace text-[18px] → text-lg**

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/text-\[18px\]/text-lg/g'
```

- [ ] **Step 6: Replace text-[20px] → text-xl**

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/text-\[20px\]/text-xl/g'
```

- [ ] **Step 7: Replace text-[24px] → text-2xl**

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/text-\[24px\]/text-2xl/g'
```

- [ ] **Step 8: Replace text-[48px] → text-5xl**

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/text-\[48px\]/text-5xl/g'
```

- [ ] **Step 9: Verify zero remaining standard-mapped arbitrary sizes**

```bash
grep -rn 'text-\[12px\]\|text-\[14px\]\|text-\[16px\]\|text-\[18px\]\|text-\[20px\]\|text-\[24px\]\|text-\[48px\]' apps/web/src/
```

Expected: no output.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/
git commit -m "refactor: replace standard-mapped arbitrary font-size classes with Tailwind utilities"
```

---

## Task 5: Bulk-Replace Arbitrary Font-Size Classes (Custom Token Mappings)

**Files:** All `apps/web/src/**/*.tsx`

- [ ] **Step 1: Check counts before replacing**

```bash
grep -rn 'text-\[11px\]' apps/web/src/ | wc -l
grep -rn 'text-\[13px\]' apps/web/src/ | wc -l
grep -rn 'text-\[15px\]' apps/web/src/ | wc -l
grep -rn 'text-\[22px\]' apps/web/src/ | wc -l
grep -rn 'text-\[26px\]' apps/web/src/ | wc -l
grep -rn 'text-\[28px\]' apps/web/src/ | wc -l
grep -rn 'text-\[32px\]' apps/web/src/ | wc -l
grep -rn 'text-\[40px\]' apps/web/src/ | wc -l
```

- [ ] **Step 2: Replace text-[11px] → text-3xs**

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/text-\[11px\]/text-3xs/g'
```

- [ ] **Step 3: Replace text-[13px] → text-2xs**

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/text-\[13px\]/text-2xs/g'
```

- [ ] **Step 4: Replace text-[15px] → text-xs-plus**

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/text-\[15px\]/text-xs-plus/g'
```

- [ ] **Step 5: Replace text-[22px] → text-xl-plus**

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/text-\[22px\]/text-xl-plus/g'
```

- [ ] **Step 6: Replace text-[26px] → text-2xl-plus**

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/text-\[26px\]/text-2xl-plus/g'
```

- [ ] **Step 7: Replace text-[28px] → text-3xl-minus**

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/text-\[28px\]/text-3xl-minus/g'
```

- [ ] **Step 8: Replace text-[32px] → text-3xl-plus**

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/text-\[32px\]/text-3xl-plus/g'
```

- [ ] **Step 9: Replace text-[40px] → text-4xl-plus**

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/text-\[40px\]/text-4xl-plus/g'
```

- [ ] **Step 10: Verify zero remaining arbitrary text-size classes**

```bash
grep -rn 'text-\[[0-9]*px\]' apps/web/src/
```

Expected: no output.

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/
git commit -m "refactor: replace custom-mapped arbitrary font-size classes with theme token classes"
```

---

## Task 6: Bulk-Replace Arbitrary Tracking Classes

**Files:** All `apps/web/src/**/*.tsx`

- [ ] **Step 1: Check counts before replacing**

```bash
grep -rn 'tracking-\[' apps/web/src/ | grep -oP 'tracking-\[[^\]]+\]' | sort | uniq -c
```

Expected:
```
11 tracking-[-0.5px]
 2 tracking-[-1px]
 2 tracking-[-0.3px]
 1 tracking-[0.5px]
```

- [ ] **Step 2: Replace tracking-[-0.3px] → tracking-snug**

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/tracking-\[-0\.3px\]/tracking-snug/g'
```

- [ ] **Step 3: Replace tracking-[-0.5px] → tracking-tight-px**

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/tracking-\[-0\.5px\]/tracking-tight-px/g'
```

- [ ] **Step 4: Replace tracking-[-1px] → tracking-tighter-px**

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/tracking-\[-1px\]/tracking-tighter-px/g'
```

- [ ] **Step 5: Replace tracking-[0.5px] → tracking-wide-sm**

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/tracking-\[0\.5px\]/tracking-wide-sm/g'
```

- [ ] **Step 6: Verify zero remaining arbitrary tracking classes**

```bash
grep -rn 'tracking-\[' apps/web/src/
```

Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/
git commit -m "refactor: replace arbitrary tracking classes with theme token classes"
```

---

## Task 7: Bulk-Replace Arbitrary Leading Classes

**Files:** All `apps/web/src/**/*.tsx`

- [ ] **Step 1: Check counts before replacing**

```bash
grep -rn 'leading-\[' apps/web/src/ | grep -oP 'leading-\[[^\]]+\]' | sort | uniq -c
```

Expected:
```
2 leading-[1.15]
2 leading-[1.2]
1 leading-[1.3]
5 leading-[1.4]   (wait, check the actual counts)
...
```

- [ ] **Step 2: Replace leading-[1.5] → leading-normal**

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/leading-\[1\.5\]/leading-normal/g'
```

- [ ] **Step 3: Replace leading-[1.6] → leading-relaxed**

Note: Tailwind's `leading-relaxed` is 1.625, not exactly 1.6. The visual difference is negligible (0.4px at 16px font-size). If pixel-perfect is required, use the `leading-lg` custom token instead.

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/leading-\[1\.6\]/leading-relaxed/g'
```

- [ ] **Step 4: Replace leading-[1.15] → leading-2xs**

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/leading-\[1\.15\]/leading-2xs/g'
```

- [ ] **Step 5: Replace leading-[1.2] → leading-xs**

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/leading-\[1\.2\]/leading-xs/g'
```

- [ ] **Step 6: Replace leading-[1.3] → leading-sm**

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/leading-\[1\.3\]/leading-sm/g'
```

- [ ] **Step 7: Replace leading-[1.4] → leading-md**

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/leading-\[1\.4\]/leading-md/g'
```

- [ ] **Step 8: Replace leading-[1.7] → leading-lg**

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/leading-\[1\.7\]/leading-lg/g'
```

- [ ] **Step 9: Replace leading-[1.8] → leading-xl**

```bash
find apps/web/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's/leading-\[1\.8\]/leading-xl/g'
```

- [ ] **Step 10: Verify zero remaining arbitrary leading classes**

```bash
grep -rn 'leading-\[' apps/web/src/
```

Expected: no output.

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/
git commit -m "refactor: replace arbitrary leading classes with theme token classes"
```

---

## Task 8: Document the !important Block in index.css

**Files:**
- Modify: `apps/web/src/index.css`

- [ ] **Step 1: View the current block**

The block at line 27–33 of `apps/web/src/index.css` currently reads:

```css
@media (prefers-reduced-motion) {
  *,
  ::before,
  ::after {
    animation: none !important;
  }
}
```

- [ ] **Step 2: Add an accessibility comment**

Replace the block with:

```css
/* Accessibility: users who prefer reduced motion must have ALL animations
   disabled, including those set with high specificity or inline styles.
   The !important is intentional — remove only if using the Motion API
   (prefers-reduced-motion) to gate animations individually instead. */
@media (prefers-reduced-motion) {
  *,
  ::before,
  ::after {
    animation: none !important;
  }
}
```

- [ ] **Step 3: Verify the file looks correct**

```bash
grep -A8 'prefers-reduced-motion' apps/web/src/index.css
```

Expected: comment + media block with `!important`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/index.css
git commit -m "docs: document accessibility intent of animation !important in index.css"
```

---

## Task 9: Smoke Test — Visual Verification

- [ ] **Step 1: Start the dev server**

```bash
cd apps/web && bun run dev
```

- [ ] **Step 2: Open the app in a browser**

Navigate to `http://localhost:5173`. Check:
- Outfit font is visually distinct from Inter on headings in `PortalLayout` components
- Navigation text renders at correct sizes
- Article page headings render correctly
- No visual regressions on login, signup, or profile pages

- [ ] **Step 3: Check for any remaining arbitrary values**

```bash
grep -rn 'text-\[[0-9]*px\]\|leading-\[[0-9\.]*\]\|tracking-\[[-0-9\.]*px\]' apps/web/src/
```

Expected: no output.

- [ ] **Step 4: Final commit if any last fixups were made**

```bash
git add apps/web/src/
git commit -m "fix: styling cleanup post-verification fixups"
```
