# Authors, Editors & Articles Seed Extension

**Date:** 2026-05-19
**Topic:** Replace random-author and article seeds with per-newspaper counts

---

## Overview

Replace the current `seedRandomAuthors(10)` (10 authors total, random newspaper) and `seedArticles()` (3–14 articles/author, mixed states) with richer, per-newspaper data:

- **15 authors per newspaper** + **5 editors per newspaper**
- **~30 articles per author** (25–35 range), states DRAFT or PUBLISHED only

---

## Changes

### 1. `seedRandomAuthors.ts` — rewritten in-place

**New signature:** `seedRandomAuthors(authorsPerNewspaper: number)`

**Behaviour:**

- Iterates over all newspapers in the database.
- For each newspaper, creates `authorsPerNewspaper` users with `AUTHOR` role + a `newspaperAuthors` profile entry (biography, no profile picture).
- For each newspaper, creates a fixed **5 editor users** with `EDITOR` role (hardcoded constant `EDITORS_PER_NEWSPAPER = 5`).
- All created users have `email_verified: true`.
- Roles are inserted via `userRoles` with `onConflictDoNothing` (same as current).

Counts with 4 newspapers: 60 authors + 20 editors = 80 new users.

### 2. `seedArticles.ts` — rewritten in-place

**New behaviour:**

- Queries all `newspaperAuthors` (same as current).
- For each author, generates between **25 and 35 articles**.
- State distribution per author's batch:
  - ~2/3 `PUBLISHED` — `publicationDate` set to a past date via `faker.date.past()`
  - ~1/3 `DRAFT` — `publicationDate` left null
- Each article gets one primary image (picsum URL, same pattern as current).
- Removes the old two-loop structure (batch 1 random state, batch 2 all-published).

### 3. `seed.ts` — updated

- Change `seedRandomAuthors(10)` → `seedRandomAuthors(15)`.
- `seedArticles()` call stays unchanged (function signature is unchanged).

---

## Volume Estimates (4 newspapers)

| Entity | Count |
|---|---|
| Authors | 60 |
| Editors | 20 |
| Articles (total) | 60 × avg 30 = ~1 800 |
| PUBLISHED articles | ~1 200 |
| DRAFT articles | ~600 |
| Images | ~1 800 (one per article) |

---

## Constraints

| Constraint | Enforcement |
|---|---|
| PUBLISHED articles have a publicationDate | set `publicationDate = faker.date.past()` for published |
| DRAFT articles have no publicationDate | leave `publicationDate` null |
| Authors scoped to correct newspaper | `newspaperId` set from the loop variable |
| Editors scoped to correct newspaper | same |
