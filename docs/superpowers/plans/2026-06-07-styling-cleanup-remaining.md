# Styling Cleanup — Remaining Issues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all remaining arbitrary Tailwind values (hardcoded hex colors, tracking, leading, magic margins) that were not addressed in the 2026-06-06 plan, upgrading the `fix/styling` branch to ✅ Good on the Styling category.

**Architecture:** This project uses Tailwind CSS v4 with `@theme inline` tokens defined in `apps/web/styles/globals.css`. Custom tokens for `--tracking-*` and `--leading-*` already exist from the previous plan but were never applied to `.tsx` files. The `destructive` design token (CSS variable) is already configured and used elsewhere in the codebase. All changes are purely class-string replacements — no logic changes.

**Tech Stack:** Tailwind CSS v4, React 19, TypeScript, Bun

---

### Scope

This plan covers **4 categories of remaining issues** identified across all three reviews (REVIEW_ORG.md, REVIEW.md, REVIEW_2026-06-07.md):

| # | Issue | Files affected | Count |
|---|-------|----------------|-------|
| 1 | Hardcoded hex `#dc2626` in arbitrary classes | `ArticleEditorPage.tsx` | 2 |
| 2 | Arbitrary `tracking-[…px]` values (tokens exist but not applied) | `ArticlePage.tsx`, `SearchResultsPage.tsx`, `CategoryPage.tsx` | 7 |
| 3 | Arbitrary `leading-[…]` values (tokens exist but not applied) | `ArticlePage.tsx`, `CategoryPage.tsx`, `EditorialQueueSection.tsx`, `MyArticlesSection.tsx`, `ReviewQueueSection.tsx` | 12 |
| 4 | Magic margin `ml-[9.75rem]` in stats component | `HorizBar.tsx` | 1 |

### What is NOT in scope

- `ring-[3px]`, `translate-y-[2px]` in `components/ui/*.tsx` — these are shadcn/Base UI generated patterns
- `w-[100px]`, `min-h-[140px]` in `APITester.tsx` — dev tool, not production UI
- `w-[var(--...)]`, `max-w-[var(--...)]`, `h-[var(--...)]` — these reference CSS custom properties and are the correct Tailwind v4 pattern
- Dynamic `style={{ width: \`${pct}%\` }}` in stats components — cannot be static classes
- `style={{ height: 1 }}` sentinel div — acceptable non-presentational use

### File Map

| File | Action | What changes |
|------|--------|--------------|
| `apps/web/src/pages/ArticleEditorPage.tsx` | Modify | Replace 2× `border-[#dc2626]/20 bg-[#dc262608]` with `border-destructive/20 bg-destructive/5` |
| `apps/web/src/pages/ArticlePage.tsx` | Modify | Replace 7× tracking arbitraries → tokens, 6× leading arbitraries → tokens |
| `apps/web/src/pages/SearchResultsPage.tsx` | Modify | Replace 1× `tracking-[-0.5px]` → `tracking-tight-px` |
| `apps/web/src/pages/CategoryPage.tsx` | Modify | Replace 2× tracking, 2× leading arbitraries → tokens |
| `apps/web/src/pages/dashboard/EditorialQueueSection.tsx` | Modify | Replace 1× `leading-[1.4]` → `leading-md` |
| `apps/web/src/pages/dashboard/MyArticlesSection.tsx` | Modify | Replace 2× `leading-[1.4]` → `leading-md` |
| `apps/web/src/pages/dashboard/ReviewQueueSection.tsx` | Modify | Replace 1× `leading-[1.4]` → `leading-md` |
| `apps/web/src/components/stats/HorizBar.tsx` | Modify | Replace `ml-[9.75rem]` with layout-based alignment using `pl-39` (= `w-36` label + `gap-3`) |

### Token Reference (already defined in `apps/web/styles/globals.css`)

| Arbitrary class | Token class | CSS variable |
|----------------|-------------|--------------|
| `tracking-[-0.3px]` | `tracking-snug` | `--tracking-snug: -0.3px` |
| `tracking-[-0.5px]` | `tracking-tight-px` | `--tracking-tight-px: -0.5px` |
| `tracking-[-1px]` | `tracking-tighter-px` | `--tracking-tighter-px: -1px` |
| `tracking-[0.5px]` | `tracking-wide-sm` | `--tracking-wide-sm: 0.5px` |
| `leading-[1.15]` | `leading-2xs` | `--leading-2xs: 1.15` |
| `leading-[1.2]` | `leading-xs` | `--leading-xs: 1.2` |
| `leading-[1.4]` | `leading-md` | `--leading-md: 1.4` |
| `leading-[1.6]` | `leading-relaxed` | Standard Tailwind (1.625 ≈ 1.6) |
| `leading-[1.7]` | `leading-lg` | `--leading-lg: 1.7` |
| `leading-[1.8]` | `leading-xl` | `--leading-xl: 1.8` |

---

## Task 1: Replace Hardcoded Hex Colors in ArticleEditorPage

**Files:**
- Modify: `apps/web/src/pages/ArticleEditorPage.tsx:492,566`

The color `#dc2626` is Tailwind's red-600, which maps to the `destructive` design token. The `08` suffix in `bg-[#dc262608]` is ~3% opacity — `bg-destructive/5` (5% opacity) is the closest token-based equivalent and matches the design intent.

- [ ] **Step 1: Verify current state**

```bash
grep -n 'dc2626' apps/web/src/pages/ArticleEditorPage.tsx
```

Expected output:
```
492:          <div className="rounded-lg border border-[#dc2626]/20 bg-[#dc262608] px-5 py-4">
566:          <div className="rounded-lg border border-[#dc2626]/20 bg-[#dc262608] px-4 py-3">
```

- [ ] **Step 2: Replace line 492**

In `apps/web/src/pages/ArticleEditorPage.tsx`, change line 492 from:
```tsx
          <div className="rounded-lg border border-[#dc2626]/20 bg-[#dc262608] px-5 py-4">
```
to:
```tsx
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-5 py-4">
```

- [ ] **Step 3: Replace line 566**

In `apps/web/src/pages/ArticleEditorPage.tsx`, change line 566 from:
```tsx
          <div className="rounded-lg border border-[#dc2626]/20 bg-[#dc262608] px-4 py-3">
```
to:
```tsx
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
```

- [ ] **Step 4: Verify no hex arbitraries remain**

```bash
grep -rn '\[#[0-9a-fA-F]' apps/web/src/ --include="*.tsx" | grep -v 'node_modules\|ui/'
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/ArticleEditorPage.tsx
git commit -m "refactor: replace hardcoded hex color classes with destructive design token"
```

---

## Task 2: Replace Arbitrary Tracking Classes

**Files:**
- Modify: `apps/web/src/pages/ArticlePage.tsx:42,43,313,317`
- Modify: `apps/web/src/pages/SearchResultsPage.tsx:70`
- Modify: `apps/web/src/pages/CategoryPage.tsx:84,131`

All target tokens are already defined in `apps/web/styles/globals.css:61-64`.

- [ ] **Step 1: Verify current counts**

```bash
grep -rn 'tracking-\[' apps/web/src/ --include="*.tsx" | grep -v 'node_modules\|ui/'
```

Expected: 7 matches across 3 files.

- [ ] **Step 2: Bulk-replace all tracking arbitraries**

```bash
find apps/web/src -name "*.tsx" | xargs sed -i 's/tracking-\[-0\.3px\]/tracking-snug/g'
find apps/web/src -name "*.tsx" | xargs sed -i 's/tracking-\[-0\.5px\]/tracking-tight-px/g'
find apps/web/src -name "*.tsx" | xargs sed -i 's/tracking-\[-1px\]/tracking-tighter-px/g'
find apps/web/src -name "*.tsx" | xargs sed -i 's/tracking-\[0\.5px\]/tracking-wide-sm/g'
```

- [ ] **Step 3: Verify zero remaining arbitrary tracking classes**

```bash
grep -rn 'tracking-\[' apps/web/src/ --include="*.tsx" | grep -v 'node_modules\|ui/'
```

Expected: no output.

- [ ] **Step 4: Spot-check key files**

```bash
grep -n 'tracking-' apps/web/src/pages/ArticlePage.tsx | head -5
grep -n 'tracking-' apps/web/src/pages/CategoryPage.tsx | head -3
grep -n 'tracking-' apps/web/src/pages/SearchResultsPage.tsx | head -2
```

Expected: all lines show token classes (`tracking-snug`, `tracking-tight-px`, `tracking-tighter-px`, `tracking-wide-sm`), no `tracking-[` patterns.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/ArticlePage.tsx apps/web/src/pages/SearchResultsPage.tsx apps/web/src/pages/CategoryPage.tsx
git commit -m "refactor: replace arbitrary tracking classes with theme token classes"
```

---

## Task 3: Replace Arbitrary Leading Classes

**Files:**
- Modify: `apps/web/src/pages/ArticlePage.tsx:46,73,80,317,349,429`
- Modify: `apps/web/src/pages/CategoryPage.tsx:131,134`
- Modify: `apps/web/src/pages/dashboard/EditorialQueueSection.tsx:145`
- Modify: `apps/web/src/pages/dashboard/MyArticlesSection.tsx:113,117`
- Modify: `apps/web/src/pages/dashboard/ReviewQueueSection.tsx:110`

All target tokens are already defined in `apps/web/styles/globals.css:67-72`.

Note: `leading-[1.6]` maps to standard Tailwind `leading-relaxed` (1.625) — the 0.025 difference is sub-pixel and visually identical.

- [ ] **Step 1: Verify current counts**

```bash
grep -rn 'leading-\[' apps/web/src/ --include="*.tsx" | grep -v 'node_modules\|ui/'
```

Expected: 12 matches across 5 files.

- [ ] **Step 2: Bulk-replace all leading arbitraries**

```bash
find apps/web/src -name "*.tsx" | xargs sed -i 's/leading-\[1\.15\]/leading-2xs/g'
find apps/web/src -name "*.tsx" | xargs sed -i 's/leading-\[1\.2\]/leading-xs/g'
find apps/web/src -name "*.tsx" | xargs sed -i 's/leading-\[1\.4\]/leading-md/g'
find apps/web/src -name "*.tsx" | xargs sed -i 's/leading-\[1\.6\]/leading-relaxed/g'
find apps/web/src -name "*.tsx" | xargs sed -i 's/leading-\[1\.7\]/leading-lg/g'
find apps/web/src -name "*.tsx" | xargs sed -i 's/leading-\[1\.8\]/leading-xl/g'
```

- [ ] **Step 3: Verify zero remaining arbitrary leading classes**

```bash
grep -rn 'leading-\[' apps/web/src/ --include="*.tsx" | grep -v 'node_modules\|ui/'
```

Expected: no output.

- [ ] **Step 4: Spot-check ArticlePage (most changes)**

```bash
grep -n 'leading-' apps/web/src/pages/ArticlePage.tsx
```

Expected output (6 lines, all using tokens):
```
46:  paragraph: "text-foreground text-base leading-xl my-1",
73:              <ContentEditable className="text-foreground text-base leading-xl outline-none" />
80:        <p className="text-foreground text-base leading-xl">{content}</p>
317:          <h1 className="max-w-[var(--layout-article-title-max-width)] text-4xl-plus leading-2xs font-extrabold tracking-tight-px text-white">
349:        <p className="text-foreground mb-6 text-lg leading-lg">
429:                  <p className="text-foreground text-sm leading-relaxed">{comment.content}</p>
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/ArticlePage.tsx apps/web/src/pages/CategoryPage.tsx apps/web/src/pages/dashboard/EditorialQueueSection.tsx apps/web/src/pages/dashboard/MyArticlesSection.tsx apps/web/src/pages/dashboard/ReviewQueueSection.tsx
git commit -m "refactor: replace arbitrary leading classes with theme token classes"
```

---

## Task 4: Fix Magic Margin in HorizBar

**Files:**
- Modify: `apps/web/src/components/stats/HorizBar.tsx:20`

The `ml-[9.75rem]` exists to align the subtitle text under the bar (past the `w-36` = 9rem label + `gap-3` = 0.75rem gap = 9.75rem). The magic number couples to sibling layout values. A better approach: use `pl-39` (Tailwind v4 supports arbitrary spacing scale values, and 39 × 0.25rem = 9.75rem). However, the cleanest fix is to restructure the subtitle into the flex row using a matching grid or padding on the label column.

The simplest non-breaking fix: replace `ml-[9.75rem]` with `pl-39` — but Tailwind v4 only generates classes for values in the default scale. Since `39` is not a standard Tailwind spacing value, we'll use `ml-[9.75rem]` → add a CSS variable `--spacing-label-offset: 9.75rem` to the theme, then use `ml-(--spacing-label-offset)`. 

Actually, the most pragmatic fix: wrap the subtitle in the same flex container so it naturally aligns. But that changes the DOM structure. The **safest minimal fix** is to convert the magic number to use the Tailwind v4 arbitrary property syntax with a descriptive name, or simply keep the existing spacing but document why.

After reconsidering: Tailwind v4 supports `ml-[9.75rem]` as arbitrary — this is a spacing value, not a color. Arbitrary spacing values that correspond to layout geometry are less of a smell than arbitrary colors or font sizes. The real issue is coupling. The cleanest fix that doesn't change DOM:

Replace the magic number by co-locating the subtitle inside the flex row.

- [ ] **Step 1: Read the current component**

```bash
cat apps/web/src/components/stats/HorizBar.tsx
```

Current code:
```tsx
export function HorizBar({ label, value, max, sub }: {
  label: string;
  value: number;
  max: number;
  sub?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="w-36 text-sm text-foreground truncate">{label}</span>
        <div className="flex-1 bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-8 text-right text-sm font-medium text-foreground">{value}</span>
      </div>
      {sub && <p className="text-muted-foreground text-xs mt-0.5 ml-[9.75rem]">{sub}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Restructure to eliminate magic number**

Replace the entire component in `apps/web/src/components/stats/HorizBar.tsx` with:

```tsx
export function HorizBar({ label, value, max, sub }: {
  label: string;
  value: number;
  max: number;
  sub?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex gap-3">
      <div className="flex w-36 shrink-0 flex-col">
        <span className="text-sm text-foreground truncate">{label}</span>
        {sub && <p className="text-muted-foreground text-xs mt-0.5">{sub}</p>}
      </div>
      <div className="flex flex-1 items-center gap-3">
        <div className="flex-1 bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-8 text-right text-sm font-medium text-foreground">{value}</span>
      </div>
    </div>
  );
}
```

This moves the subtitle into the label column, which naturally aligns it under the label text without any magic margin. The bar and value stay in their own flex container.

- [ ] **Step 3: Verify no magic margins remain**

```bash
grep -rn 'ml-\[' apps/web/src/ --include="*.tsx" | grep -v 'node_modules\|ui/'
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/stats/HorizBar.tsx
git commit -m "refactor: eliminate magic margin in HorizBar by restructuring flex layout"
```

---

## Task 5: Final Audit and Verification

- [ ] **Step 1: Run comprehensive arbitrary value scan**

```bash
echo "=== HEX COLORS ==="
grep -rn '\[#[0-9a-fA-F]' apps/web/src/ --include="*.tsx" | grep -v 'node_modules\|ui/'
echo "=== TRACKING ARBITRARY ==="
grep -rn 'tracking-\[' apps/web/src/ --include="*.tsx" | grep -v 'node_modules\|ui/'
echo "=== LEADING ARBITRARY ==="
grep -rn 'leading-\[' apps/web/src/ --include="*.tsx" | grep -v 'node_modules\|ui/'
echo "=== MAGIC MARGINS ==="
grep -rn 'ml-\[' apps/web/src/ --include="*.tsx" | grep -v 'node_modules\|ui/'
echo "=== INLINE FONT STYLES ==="
grep -rn 'style={{ fontFamily' apps/web/src/ --include="*.tsx"
echo "=== ARBITRARY TEXT SIZES ==="
grep -rn 'text-\[[0-9]*px\]' apps/web/src/ --include="*.tsx" | grep -v 'node_modules\|ui/'
```

Expected: all 6 sections produce no output.

- [ ] **Step 2: Visual smoke test**

Start the dev server and visually verify:
```bash
cd apps/web && bun run dev
```

Check these pages in a browser:
1. Article editor page — the error/warning boxes should have a subtle red border and background
2. Article view page — headings, body text, and comments should have correct spacing
3. Category page — hero heading and featured article card text should look unchanged
4. Search results page — heading should have correct letter-spacing
5. Dashboard editorial queue — article perex text should have correct line height
6. Statistics section — HorizBar subtitle should align under the label text

- [ ] **Step 3: Stop dev server and final commit if any fixups needed**

```bash
git add -A && git status
```

If there are changes:
```bash
git commit -m "fix: styling cleanup post-verification fixups"
```
