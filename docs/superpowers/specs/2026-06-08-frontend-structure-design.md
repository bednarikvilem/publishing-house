# Frontend Structure Refactor — Design Spec

**Date:** 2026-06-08
**Branch:** devel

---

## Problem

Both project reviews flag Frontend Structure as a significant weakness:

- Seven files use raw `fetch + useEffect` instead of TanStack Query, violating the pattern documented in `docs/data_fetching.md`.
- Three page components exceed 400 lines by mixing data fetching, mutations, form state, and rendering in one file.
- Only 4 custom hooks exist for a codebase of this complexity; most logic lives inline in component bodies.
- `AuthorDashboardPage.tsx` has a hardcoded `NEWSPAPER_ID` constant.

---

## Goal

1. Create three shared hooks that eliminate repeated raw-fetch patterns.
2. Migrate five pages to use those hooks or inline `useQuery`.
3. Decompose the two largest page components (`ArticleEditorPage`, `ArticlePage`) into focused hooks + sub-components.
4. Extract the three queries/mutations from `EditorialQueueSection` into a dedicated hook.

---

## Approach: Bottom-up (shared hooks first)

Extract shared hooks first since they are reused across multiple pages. Once the hooks exist, each page migration is a straight swap. Decompose god components last, after the shared scaffolding is in place.

---

## Section 1 — New Shared Hooks (`src/hooks/`)

### `useUser()`

- **File:** `src/hooks/useUser.ts`
- **Query key:** `["me"]`
- **Enabled:** when `localStorage.getItem("token")` is non-null
- **Fetches:** `GET /api/users/me` via `client.api.users.me.get()`
- **Returns:** `{ user, isLoading, isError }`
- **Replaces:** raw `useEffect` in Navbar, DirectorDashboardPage, UserProfilePage

### `useSubscriptionStatus(newspaperId)`

- **File:** `src/hooks/useSubscriptionStatus.ts`
- **Query key:** `["subscription-status", newspaperId]`
- **Enabled:** when logged in (`!!token`) and `newspaperId` is non-null
- **Fetches:** `GET /api/newspapers/:id/subscription/status` via Eden
- **Returns:** `{ subscriptionStatus, isLoading }`
- **Replaces:** `getSubscriptionStatus` raw-fetch call in Navbar

### `useAuthorProfile()`

- **File:** `src/hooks/useAuthorProfile.ts`
- **Thin wrapper over `useUser`:** shares the same `["me"]` query key (no extra network request)
- **Adds:** `isProfileComplete: !!(user?.bio && user?.profile_picture)`
- **Returns:** `{ user, isProfileComplete, isLoading }`
- **Used by:** `ArticleEditorPage` to gate the "Submit for review" action

---

## Section 2 — Simple Page Migrations

### Navbar (`src/components/Navbar.tsx`)

- Drop `user` and `subscriptionStatus` `useState` + their `useEffect` (~20 lines)
- Use `useUser()` and `useSubscriptionStatus(newspaper?.id)`
- Newspaper-id guard (don't show user from a different newspaper) becomes a derived value:
  `const effectiveUser = loggedInNewspaperId === newspaper?.id ? user : null`

### DirectorDashboardPage (`src/pages/DirectorDashboardPage.tsx`)

- Drop both `useEffect` calls and `authChecked` state
- Use `useUser()` to read roles; redirect in a `useEffect` that depends on `[isLoading, user]`
- Replace newspapers `useEffect` with a `useQuery` on `client.api.newspapers.get()`
  - `queryKey: ["newspapers"]`, enabled when user has DIRECTOR role

### AuthorPage (`src/pages/AuthorPage.tsx`)

- Drop `author` state + `useEffect`
- Replace with `useQuery({ queryKey: ["author", newspaper?.id, authorId], ... })`
  using `client.api.newspapers({ newspaper_id }).authors({ author_id }).get()`

### UserProfilePage (`src/pages/UserProfilePage.tsx`)

- Drop `profile` state + `useEffect`
- Use `useUser()`; rename `user` → `profile` for the existing consumers downstream

### AuthorDashboardPage (`src/pages/AuthorDashboardPage.tsx`)

- Remove hardcoded `NEWSPAPER_ID` constant; use `useNewspaper().newspaper?.id`
- Replace `useEffect` + articles/pagination state with:
  `useQuery({ queryKey: ["my-articles", newspaperId, activeStatus, currentPage], ... })`
  using `client.api.newspapers({ newspaper_id }).articles.mine.get({ query: { status, page, limit } })`

---

## Section 3 — `ArticleEditorPage` Decomposition

**Target:** 658 lines → ~200 lines

### `useArticleEditor(articleId, newspaperId)` — `src/hooks/useArticleEditor.ts`

Owns all data loading and mutation logic:

- `useQuery` for categories (`["categories", newspaperId]`) — replaces first `useEffect`
- `useAuthorProfile()` — replaces second `useEffect`
- `useQuery` for article data (`["article-edit", newspaperId, articleId]`, enabled when `!isNew`) — replaces third `useEffect`; populates RHF via `useEffect` on query data
- `handleSave`, `handleSubmitForReview`, `handleDelete` wrapping `useMutation`

Returns: `{ categories, articleStatus, loading, loadError, isProfileComplete, handleSave, handleSubmitForReview, handleDelete, saving, submitting, deleting, serverError, setServerError }`

### `useImageUpload(articleId, newspaperId)` — `src/hooks/useImageUpload.ts`

Owns image state:

- `images` state, `uploadingImage` state, `fileInputRef`
- `handleImageUpload` and `handleImageDelete` functions
- Accepts `initialImages` to seed state when article query data arrives

Returns: `{ images, setImages, uploadingImage, fileInputRef, handleImageUpload, handleImageDelete }`

### `EditorSidebar` — `src/components/EditorSidebar.tsx`

Already a named sub-component in `ArticleEditorPage.tsx`. Move verbatim; no logic changes.

---

## Section 4 — `ArticlePage` Decomposition

**Target:** 494 lines → ~150 lines

### `CommentsSection` — `src/components/CommentsSection.tsx`

- Props: `articleId`, `newspaperId`, `initialComments`, `isLoggedIn`
- Owns RHF form for posting; comment post via `useMutation`
- Renders comment list + form + empty state

### `ArticleActions` — `src/components/ArticleActions.tsx`

- Props: `articleId`, `newspaperId`, `initialLikesCount`, `initialLikedByMe`, `isLoggedIn`
- Like toggle via `useMutation` with optimistic update + rollback (existing logic preserved)
- Renders heart button + count

### `ArticleContent` — `src/components/ArticleContent.tsx`

Already a named sub-component in `ArticlePage.tsx`. Move verbatim; no logic changes.

### Main `ArticlePage`

- Article fetch becomes `useQuery({ queryKey: ["article", newspaperId, articleId], ... })`
- Full-page error/loading branches stay in the page file (they render the full layout)
- Passes `article.comments`, `article.likes_count`, `article.liked_by_me` as initial props to sub-components

---

## Section 5 — `EditorialQueueSection` Hook Extraction

**Target:** 345 lines → ~150 lines

### `useEditorialQueue(newspaperId)` — `src/hooks/useEditorialQueue.ts`

Owns all three queries and mutations currently inline:

- `queueQuery` (`["editorial-queue", newspaperId, currentPage]`)
- `editorsQuery` (`["editors", newspaperId]`, enabled when `activeId !== null`)
- `assignEditor`, `toggleSubscriber`, `approve` mutations
- `activeId` state + `toggleActive` handler
- `invalidateQueue` helper

Returns: `{ articles, totalPages, total, editors, loadingEditors, activeId, toggleActive, assignEditor, toggleSubscriber, approve, isLoading, isError }`

The component body becomes one hook call + JSX. `AssignEditorForm` stays as a local sub-component (pure rendering, no logic).

---

## File map

| New file | Purpose |
|---|---|
| `src/hooks/useUser.ts` | Shared user query |
| `src/hooks/useSubscriptionStatus.ts` | Shared subscription query |
| `src/hooks/useAuthorProfile.ts` | Author profile completeness check |
| `src/hooks/useArticleEditor.ts` | Editor page data + mutations |
| `src/hooks/useImageUpload.ts` | Image state + handlers |
| `src/hooks/useEditorialQueue.ts` | Editorial queue data + mutations |
| `src/components/EditorSidebar.tsx` | Moved from ArticleEditorPage |
| `src/components/ArticleContent.tsx` | Moved from ArticlePage |
| `src/components/CommentsSection.tsx` | Extracted from ArticlePage |
| `src/components/ArticleActions.tsx` | Extracted from ArticlePage |

| Modified file | Change |
|---|---|
| `src/components/Navbar.tsx` | Replace useEffect with useUser + useSubscriptionStatus |
| `src/pages/DirectorDashboardPage.tsx` | Replace useEffect with useUser + useQuery |
| `src/pages/AuthorPage.tsx` | Replace useEffect with useQuery |
| `src/pages/UserProfilePage.tsx` | Replace useEffect with useUser |
| `src/pages/AuthorDashboardPage.tsx` | Fix hardcoded ID; replace useEffect with useQuery |
| `src/pages/ArticleEditorPage.tsx` | Wire useArticleEditor + useImageUpload; import EditorSidebar |
| `src/pages/ArticlePage.tsx` | Wire useQuery; import sub-components |
| `src/pages/dashboard/EditorialQueueSection.tsx` | Wire useEditorialQueue |
