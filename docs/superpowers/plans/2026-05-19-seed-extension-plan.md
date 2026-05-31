# Implementation Plan: Seed Extension

**Spec:** `docs/superpowers/specs/2026-05-19-seed-extension-design.md`

## Steps

1. **Modify `apps/server/src/db/seeds/seedUsers.ts`**
   - Replace single-batch random-newspaper logic with a loop over all newspapers
   - Create exactly 100 users per newspaper, each with `newspaperId` set to that newspaper

2. **Modify `apps/server/src/db/seeds/seedUserRoles.ts`**
   - Change `"VISITOR"` → `"REGISTERED_USER"`

3. **Create `apps/server/src/db/seeds/seedLikes.ts`**
   - Query PUBLISHED articles with non-null `publicationDate`
   - For each article, sample 10–50 unique users from same newspaper
   - Insert likes with `createdAt` between `publicationDate` and now

4. **Create `apps/server/src/db/seeds/seedComments.ts`**
   - Same article pool
   - For each article, generate 5–20 comments from random same-newspaper users
   - Insert comments with `createdAt` between `publicationDate` and now

5. **Update `apps/server/src/db/seed.ts`**
   - Import and call `seedLikes` and `seedComments` after `seedArticleReviews`
