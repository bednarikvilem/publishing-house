# Seed Extension Design

**Date:** 2026-05-19
**Topic:** Extended database seeds — registered users, likes, comments

---

## Overview

Extend the existing seed pipeline to produce a richer, more realistic dataset:
- Replace VISITOR-role users with 100 REGISTERED_USER accounts per newspaper
- Add high-volume likes (10–50 per published article) with realistic timestamps
- Add high-volume comments (5–20 per published article) with realistic timestamps

All timestamps for likes and comments must be strictly after the article's `publicationDate`.

---

## Changes

### 1. `seedUsers.ts` — modified

**Current behaviour:** Creates N random users (default 20) assigned to random newspapers.

**New behaviour:** Iterates over all newspapers in the database and creates exactly 100 users per newspaper. Each user row carries the specific `newspaperId` of its newspaper, satisfying the unique index on `(email, newspaper_id)`. Because the same email address may end up in multiple newspapers as separate rows, `faker.internet.email()` is called fresh for each user — uniqueness within a single newspaper is statistically guaranteed by faker but not enforced at seed time (the DB constraint will surface any collision).

Count: 4 newspapers × 100 users = 400 users.

### 2. `seedUserRoles.ts` — modified

**Current behaviour:** Assigns `"VISITOR"` to every user that has a `newspaperId`.

**New behaviour:** Assigns `"REGISTERED_USER"` instead. No structural change — the query and mapping logic remain identical.

### 3. `seedLikes.ts` — new file

- Queries all articles with `state = "PUBLISHED"` and a non-null `publicationDate`, joined with their `newspaperId`.
- For each article, queries all users belonging to the same `newspaperId`.
- Picks a random subset of 10–50 of those users (clamped to the actual user pool size if smaller).
- Deduplicates the subset (no duplicate `(userId, articleId)` pairs — enforced by the PK).
- For each selected user, inserts a like with `createdAt = faker.date.between({ from: article.publicationDate, to: new Date() })`.
- Batch-inserts all likes for efficiency.

### 4. `seedComments.ts` — new file

- Same article pool as likes (PUBLISHED + non-null `publicationDate`).
- For each article, generates 5–20 comment rows.
- Each comment picks a random user from that newspaper's user pool; the same user may comment multiple times (no dedup).
- `createdAt = faker.date.between({ from: article.publicationDate, to: new Date() })`.
- `content` generated with `faker.lorem.sentences({ min: 1, max: 4 })`.
- Batch-inserts all comments per article.

### 5. `seed.ts` — updated

Add `seedLikes` and `seedComments` imports and calls after `seedArticleReviews` (articles and users must already exist).

```
seedSystemAdmin
seedNewspapers
seedNewArticleCategory
seedUsers          ← creates 100 users/newspaper
seedAsignRoles     ← assigns REGISTERED_USER
seedRandomAuthors
seedArticles
seedEmma
seedArticleReviews
seedLikes          ← new
seedComments       ← new
seedE2eUsers
```

---

## Constraints

| Constraint | Enforcement |
|---|---|
| Like timestamp after `publicationDate` | `faker.date.between` lower bound = `publicationDate` |
| Comment timestamp after `publicationDate` | same |
| No duplicate likes | deduplicate sampled user set before insert |
| Only published articles get likes/comments | filter on `state = "PUBLISHED"` and non-null `publicationDate` |
| Users are newspaper-scoped | likes/comments sampled from same-newspaper users only |

---

## Volume Estimates (with 4 newspapers, 10 random authors total, avg 5 articles/author/batch)

`seedRandomAuthors(10)` creates 10 authors spread across all 4 newspapers. Each author gets two article batches in `seedArticles`: the first with state randomly weighted toward DRAFT (1/3 PUBLISHED), the second fully PUBLISHED.

- Users: ~400 registered users
- Authors: 10 total
- Articles: ~100 total; ~70 PUBLISHED (all of batch 2 + ~1/3 of batch 1)
- Likes: 70 × avg 30 = ~2 100
- Comments: 70 × avg 12 = ~840
