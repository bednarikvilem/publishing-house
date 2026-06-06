# Component Library Adoption — Design Spec

**Date:** 2026-06-06
**Branch:** fix/component_library

---

## Problem

Both project reviews flag the Component Library as ⚠️ Concerns:

- Six UI wrapper components exist in `apps/web/src/components/ui/` (`Button`, `Input`, `Textarea`, `Card`, `Select`, `Label`) but are only used in `APITester.tsx`.
- Production pages hand-roll raw `<button>`, `<input>`, `<textarea>`, and `<select>` elements with duplicated Tailwind class strings.
- Thirteen `alert()` calls are used for error feedback across 7 files (cited explicitly in `REVIEW.md`).
- Article status labels and category tags are hand-rolled Tailwind spans with no shared abstraction.
- No Dialog/confirmation component exists for destructive actions.

---

## Goal

1. Add four new components to `components/ui/` that fill gaps in the current library.
2. Update `FormField.tsx` to use the existing `Input` and `Textarea` primitives.
3. Adopt the existing and new components in the specific files cited by the reviewers.
4. Update both review files to reflect the improvement.

---

## New Components (`apps/web/src/components/ui/`)

### `badge.tsx`

A `cva`-based styled `<span>` — no `@base-ui/react` primitive needed.

**Variants:**
- `default` — primary background, for general labels
- `secondary` — muted background
- `outline` — border only, transparent background
- `destructive` — red tones

**Semantic article-status variants** (map directly to `ArticleStatus` enum values):
- `draft`, `submitted`, `in-review`, `approved-editor`, `approved-manager`, `approved-director`, `published`, `rejected`

Each status variant has a distinct color so article state is scannable at a glance.

### `table.tsx`

Standard HTML `<table>` wrapped in a scroll container with Tailwind styling. No `@base-ui/react` primitive needed.

**Exports:** `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`

Used by queue sections that currently render article lists via `ListRow.tsx` and raw divs.

### `toast.tsx` + `toaster.tsx`

Built on `@base-ui/react/toast` (available in `@base-ui/react` v1.2+).

- `toast.tsx` — styled `Toast`, `ToastTitle`, `ToastDescription`, `ToastClose`, `ToastViewport` subcomponents.
- `toaster.tsx` — a `<Toaster />` component that wraps `Toast.Provider` and renders the viewport. Mounted once in `apps/web/src/frontend.tsx` so toasts are available app-wide.
- A `useToast()` hook exported from `toaster.tsx` is the call site API throughout the app.

**Toast types:** `success` (green), `error` (red/destructive), `default` (neutral).

### `dialog.tsx`

Built on `@base-ui/react/alert-dialog`.

**Exports:** `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`

Used for destructive-action confirmation flows (delete article, remove role). The consumer controls open state via `DialogTrigger` or controlled `open`/`onOpenChange` props.

---

## Existing Component Updates

### `FormField.tsx`

Replace the raw `<input>` and `<textarea>` elements with `Input` and `Textarea` from `components/ui/`. The wrapper structure (label, error message, required marker) is unchanged — only the inner element is swapped. This eliminates the duplicated Tailwind class strings (`inputClass`, `textareaClass`) currently defined at the top of the file.

---

## Adoption Targets

The following files are updated to use the component library. Scope is limited to files explicitly cited in the two review documents.

| File | Changes |
|---|---|
| `FormField.tsx` | raw `<input>` → `Input`; raw `<textarea>` → `Textarea` |
| `DecisionForm.tsx` | raw `<button>` → `Button`; raw `<textarea>` → `Textarea` |
| `GlobalUsersSection.tsx` | raw `<button>` → `Button`; raw `<select>` → `Select`; `alert()` → toast; remove-role confirmation → `Dialog` |
| `NewspaperUsersSection.tsx` | `alert()` → toast; remove-role confirmation → `Dialog` |
| `EditorialQueueSection.tsx` | raw `<button>` → `Button`; raw `<select>` → `Select`; `alert()` → toast; status spans → `Badge` |
| `ReviewQueueSection.tsx` | `alert()` → toast |
| `CategoriesSection.tsx` | `alert()` → toast |
| `ApprovalQueue.tsx` | raw `<button>` → `Button`; `alert()` → toast |
| `PublicationQueue.tsx` | `alert()` → toast |
| `AdminDashboardPage.tsx` | raw `<button>` → `Button` |
| `DirectorDashboardPage.tsx` | raw `<button>` → `Button` |
| `ArticlePage.tsx` | raw `<button>` → `Button`; raw `<textarea>` → `Textarea` |
| `MyArticlesSection.tsx` | status spans → `Badge` |
| `ArticleEditorPage.tsx` | inline status badge → `Badge` |
| `CategoryBadge.tsx` | refactored to use `Badge` from `ui/` internally |

---

## Review File Updates

After implementation, update both `REVIEW.md` and `REVIEW_ORG.md`:
- Component Library status: ⚠️ Concerns → ✅ Good
- Update the findings text to reflect that UI components are now used consistently.

---

## Out of Scope

- Form library (`react-hook-form`, TanStack Form) — separate concern tracked under Forms category.
- TanStack Query migration of raw `fetch` calls — separate concern tracked under Loading Data.
- Styling fixes (inline `fontFamily`, arbitrary pixel values) — separate concern tracked under Styling category.
- New pages or features not currently in the codebase.
