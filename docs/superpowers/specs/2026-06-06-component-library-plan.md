# Component Library Adoption — Implementation Plan

**Spec:** `2026-06-06-component-library-design.md`
**Branch:** `fix/component_library`

---

## Phase 1 — New `components/ui/` files

### Step 1: `badge.tsx`

Create `apps/web/src/components/ui/badge.tsx`.

- Use `cva` (already installed) to define variants.
- Base class: inline-flex, rounded-full, border, text-xs, font-semibold, px-2.5 py-0.5.
- **Variants:**
  - `default` — `bg-primary text-primary-foreground`
  - `secondary` — `bg-secondary text-secondary-foreground`
  - `outline` — `border-border text-foreground`
  - `destructive` — `bg-destructive/10 text-destructive`
- **Article-status variants** (one per `ArticleStatus` enum value):
  - `draft` — zinc/muted tones
  - `submitted` — blue tones
  - `in-review` — indigo/violet tones
  - `approved-editor` — sky tones
  - `approved-manager` — teal tones
  - `approved-director` — emerald tones
  - `published` — green tones
  - `rejected` — red tones
- Export `Badge` and `badgeVariants`.

### Step 2: `table.tsx`

Create `apps/web/src/components/ui/table.tsx`.

- All exports are thin wrappers over native HTML table elements with `cn()` applied.
- Outer wrapper: `<div className="relative w-full overflow-auto">` containing `<table>`.
- `TableHeader` → `<thead>`, `TableBody` → `<tbody>`, `TableFooter` → `<tfoot>`.
- `TableRow` — includes hover state: `hover:bg-muted/50 transition-colors`.
- `TableHead` → `<th>` with `text-muted-foreground h-10 px-4 text-left text-xs font-medium`.
- `TableCell` → `<td>` with `p-4 align-middle text-sm`.
- `TableCaption` → `<caption>` with `text-muted-foreground mt-4 text-sm`.
- Export all above.

### Step 3: `toast.tsx` and `toaster.tsx`

Create `apps/web/src/components/ui/toast.tsx`:

- Built on `@base-ui/react/toast`.
- Styled subcomponents: `ToastRoot`, `ToastTitle`, `ToastDescription`, `ToastClose`, `ToastViewport`.
- Variants on `ToastRoot`: `default`, `success` (green border-left accent), `error` (destructive border-left accent).

Create `apps/web/src/components/ui/toaster.tsx`:

- Wraps `Toast.Provider` with a fixed `<ToastViewport>` in the bottom-right corner.
- Exports:
  - `Toaster` — the provider+viewport component mounted in `frontend.tsx`.
  - `useToast()` — hook returning `{ toast }` where `toast({ title, description, variant })` queues a notification.

### Step 4: `dialog.tsx`

Create `apps/web/src/components/ui/dialog.tsx`:

- Built on `@base-ui/react/alert-dialog`.
- Styled subcomponents following the existing `select.tsx` pattern:
  - `Dialog` → `AlertDialog.Root`
  - `DialogTrigger` → `AlertDialog.Trigger`
  - `DialogContent` → `AlertDialog.Popup` inside `AlertDialog.Backdrop` + `AlertDialog.Portal`
  - `DialogHeader` — `<div className="flex flex-col gap-1.5">`
  - `DialogFooter` — `<div className="flex justify-end gap-2">`
  - `DialogTitle` → `AlertDialog.Title`
  - `DialogDescription` → `AlertDialog.Description`
  - `DialogClose` → `AlertDialog.Close`
- The backdrop: `fixed inset-0 bg-black/40 data-open:animate-in data-closed:animate-out`.
- The popup: centered card with `p-6 rounded-2xl shadow-xl bg-background`.

---

## Phase 2 — Mount Toaster

### Step 5: `frontend.tsx`

Add `<Toaster />` inside the `QueryClientProvider` in `apps/web/src/frontend.tsx`, just before the closing tag. This makes toasts available app-wide.

---

## Phase 3 — Update `FormField.tsx`

### Step 6: `FormField.tsx`

File: `apps/web/src/components/FormField.tsx`.

- Remove the `inputClass` and `textareaClass` string constants.
- Import `Input` from `@/components/ui/input` and `Textarea` from `@/components/ui/textarea`.
- Replace the raw `<input>` element with `<Input>`. Pass `aria-invalid={!!error}` and spread `rest`.
- Replace the raw `<textarea>` element with `<Textarea>`. Same pattern.
- The label and error message markup is unchanged.

---

## Phase 4 — Adoption Sweep

Work through files in this order (toast-only files first, then heavier refactors).

### Step 7: `ReviewQueueSection.tsx`
- Import `useToast` from `@/components/ui/toaster`.
- Replace `alert("Failed to submit review. Please try again.")` with `toast({ title: "Error", description: "Failed to submit review. Please try again.", variant: "error" })`.

### Step 8: `PublicationQueue.tsx`
- Import `useToast`.
- Replace `alert("Failed to publish article.")` with a toast.

### Step 9: `CategoriesSection.tsx`
- Import `useToast`.
- Replace all 4 `alert()` calls with toast. Map:
  - "Failed to create category." → error toast
  - "Failed to update category." → error toast
  - "Cannot delete: articles are assigned to this category." → error toast (or `default` variant with descriptive message)
  - "Failed to delete category." → error toast

### Step 10: `DecisionForm.tsx`
- Import `Button` from `@/components/ui/button` and `Textarea` from `@/components/ui/textarea`.
- Replace the 3 decision-choice `<button>` elements with `Button` (use `variant="outline"` for inactive, keep active state via `data-active` or conditional `variant`).
- Replace the "Cancel" and "Submit" `<button>` elements with `Button variant="outline"` and `Button` (default) respectively.
- Replace the raw `<textarea>` with `<Textarea>`.

### Step 11: `AdminDashboardPage.tsx`
- Import `Button`.
- Replace the 3 tab-navigation `<button>` elements with `Button variant="outline"` or `variant="ghost"`.

### Step 12: `DirectorDashboardPage.tsx`
- Import `Button`.
- Replace all 6 raw `<button>` elements with `Button`. Use `variant="outline"` for tab buttons, `variant="ghost"` for smaller actions.

### Step 13: `ApprovalQueue.tsx`
- Import `Button` and `useToast`.
- Replace the raw `<button className="border-border ...">` with `Button variant="outline"`.
- Replace `alert("Failed to submit decision.")` with an error toast.

### Step 14: `GlobalUsersSection.tsx`
- Import `Button`, `Select`/`SelectTrigger`/`SelectContent`/`SelectItem`/`SelectValue`, `useToast`, `Dialog`/`DialogTrigger`/`DialogContent`/`DialogHeader`/`DialogFooter`/`DialogTitle`/`DialogDescription`/`DialogClose`.
- Replace the raw `<select>` for role assignment with the `Select` component.
- Replace raw `<button>` elements with `Button`.
- Replace all 5 `alert()` calls with toasts.
- Wrap the "remove role" action in a `Dialog` confirmation (trigger: existing ×  button; dialog content: "Remove role X from this user?" with Cancel/Confirm buttons).

### Step 15: `NewspaperUsersSection.tsx`
- Import `useToast` and `Dialog` components.
- Replace all 4 `alert()` calls with toasts.
- Wrap the "remove role" action in a `Dialog` confirmation.

### Step 16: `EditorialQueueSection.tsx`
- Import `Button`, `Select` components, `useToast`, `Badge`.
- Replace raw `<button>` elements with `Button`.
- Replace raw `<select>` (editor assignment) with `Select`.
- Replace all 3 `alert()` calls with toasts.
- Replace hand-rolled status spans with `<Badge variant={statusToVariant(status)}>`.
- Add a `statusToVariant` mapping function (maps `ArticleStatus` string → badge variant name).

### Step 17: `ArticlePage.tsx`
- Import `Button` and `Textarea`.
- Replace the like `<button>` and comment-submit `<button>` with `Button`.
- Replace the comment `<textarea>` with `<Textarea>`.

### Step 18: `MyArticlesSection.tsx`
- Import `Badge`.
- Replace inline status span elements with `<Badge variant={statusToVariant(status)}>`.
- Reuse the same `statusToVariant` helper (extract to `src/lib/articleStatus.ts` so both `EditorialQueueSection` and `MyArticlesSection` share it).

### Step 19: `ArticleEditorPage.tsx`
- Import `Badge`.
- Replace the inline article-status badge in the editor sidebar with `<Badge variant={statusToVariant(articleStatus)}>`.

### Step 20: `CategoryBadge.tsx`
- Import `Badge` from `@/components/ui/badge`.
- Refactor the component to render `<Badge variant="secondary" className={...}>` internally instead of a hand-rolled `<span>`.

---

## Phase 5 — Shared Utility

### Step 21: `src/lib/articleStatus.ts`

Extract the `statusToVariant` function so it isn't duplicated between `EditorialQueueSection`, `MyArticlesSection`, and `ArticleEditorPage`.

```ts
// Maps ArticleStatus enum values to Badge variant names
export function statusToVariant(status: string): string {
  const map: Record<string, string> = {
    DRAFT: "draft",
    SUBMITTED: "submitted",
    IN_REVIEW: "in-review",
    APPROVED_BY_EDITOR: "approved-editor",
    APPROVED_BY_MANAGER: "approved-manager",
    APPROVED_BY_DIRECTOR: "approved-director",
    PUBLISHED: "published",
    REJECTED: "rejected",
  };
  return map[status] ?? "secondary";
}
```

---

## Phase 6 — Review File Updates

### Step 22: Update `REVIEW.md`

In the Component Library section:
- Change status from `⚠️ Concerns` to `✅ Good` in the summary table.
- Update findings text to describe the current state (UI components now used consistently, 4 new components added).

### Step 23: Update `REVIEW_ORG.md`

Same change as Step 22 for the older review file.

---

## Implementation order rationale

- New components first (Steps 1–4) so every adoption step can import them cleanly.
- `Toaster` mount (Step 5) before any toast call site.
- `FormField.tsx` early (Step 6) since it's used across many forms.
- Toast-only files before heavier refactors — quick wins that reduce `alert()` count fast.
- Shared `articleStatus.ts` extracted at Step 21, after both consumers (Steps 16 and 18) are written, to avoid extracting prematurely.
