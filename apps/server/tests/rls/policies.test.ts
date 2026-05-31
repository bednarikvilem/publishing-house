import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../src/db";
import { withRls } from "../../src/db/rls";
import {
    newspapers, users, userRoles,
    articles, articleReviews, comments, likes,
} from "../../src/db/schema";

const npA = randomUUID();
const npB = randomUUID();

const uAdmin = randomUUID();
const uAuthorA1 = randomUUID();
const uAuthorA2 = randomUUID();
const uEditorA = randomUUID();
const uManagerA = randomUUID();
const uManagerB = randomUUID();
const uAuthorB1 = randomUUID();

const aDraftA1 = randomUUID();
const aDraftA2 = randomUUID();
const aSubmittedA1 = randomUUID();
const aInReviewA1 = randomUUID();
const aInReviewA2 = randomUUID();
const aPublishedA1 = randomUUID();
const aSubmittedB1 = randomUUID();

const allUsers = [uAdmin, uAuthorA1, uAuthorA2, uEditorA, uManagerA, uManagerB, uAuthorB1];
const allArticles = [aDraftA1, aDraftA2, aSubmittedA1, aInReviewA1, aInReviewA2, aPublishedA1, aSubmittedB1];

const session = (userId: string | null, newspaperId: string | null, roles: string[]) =>
    ({ userId, newspaperId, roles });

beforeAll(async () => {
    await db.insert(newspapers).values([
        { id: npA, name: "NP A", slug: `np-a-${npA.slice(0, 8)}` },
        { id: npB, name: "NP B", slug: `np-b-${npB.slice(0, 8)}` },
    ]);

    await db.insert(users).values([
        { id: uAdmin, newspaperId: null, email: `admin-${uAdmin}@t.test`, username: `admin-${uAdmin.slice(0, 8)}`, passwordHash: "x" },
        { id: uAuthorA1, newspaperId: npA, email: `a1-${uAuthorA1}@t.test`, username: `a1-${uAuthorA1.slice(0, 8)}`, passwordHash: "x" },
        { id: uAuthorA2, newspaperId: npA, email: `a2-${uAuthorA2}@t.test`, username: `a2-${uAuthorA2.slice(0, 8)}`, passwordHash: "x" },
        { id: uEditorA, newspaperId: npA, email: `e-${uEditorA}@t.test`, username: `e-${uEditorA.slice(0, 8)}`, passwordHash: "x" },
        { id: uManagerA, newspaperId: npA, email: `m-${uManagerA}@t.test`, username: `m-${uManagerA.slice(0, 8)}`, passwordHash: "x" },
        { id: uManagerB, newspaperId: npB, email: `mb-${uManagerB}@t.test`, username: `mb-${uManagerB.slice(0, 8)}`, passwordHash: "x" },
        { id: uAuthorB1, newspaperId: npB, email: `b1-${uAuthorB1}@t.test`, username: `b1-${uAuthorB1.slice(0, 8)}`, passwordHash: "x" },
    ]);

    await db.insert(userRoles).values([
        { userId: uAuthorA1, newspaperId: npA, role: "AUTHOR" },
        { userId: uAuthorA2, newspaperId: npA, role: "AUTHOR" },
        { userId: uEditorA, newspaperId: npA, role: "EDITOR" },
        { userId: uManagerA, newspaperId: npA, role: "NEWSPAPER_MANAGER" },
        { userId: uManagerB, newspaperId: npB, role: "NEWSPAPER_MANAGER" },
        { userId: uAuthorB1, newspaperId: npB, role: "AUTHOR" },
    ]);

    const mkArticle = (id: string, authorId: string, newspaperId: string, state: "DRAFT"|"SUBMITTED"|"IN_REVIEW"|"PUBLISHED") => ({
        id, title: `t-${id.slice(0, 8)}`, perex: "p", content: "c",
        authorId, newspaperId, state,
    });
    await db.insert(articles).values([
        mkArticle(aDraftA1, uAuthorA1, npA, "DRAFT"),
        mkArticle(aDraftA2, uAuthorA2, npA, "DRAFT"),
        mkArticle(aSubmittedA1, uAuthorA1, npA, "SUBMITTED"),
        mkArticle(aInReviewA1, uAuthorA1, npA, "IN_REVIEW"),
        mkArticle(aInReviewA2, uAuthorA2, npA, "IN_REVIEW"),
        mkArticle(aPublishedA1, uAuthorA1, npA, "PUBLISHED"),
        mkArticle(aSubmittedB1, uAuthorB1, npB, "SUBMITTED"),
    ]);

    await db.insert(articleReviews).values({
        articleId: aInReviewA1, reviewerId: uEditorA, decision: null,
    });
});

afterAll(async () => {
    await db.delete(likes).where(inArray(likes.articleId, allArticles));
    await db.delete(comments).where(inArray(comments.articleId, allArticles));
    await db.delete(articleReviews).where(inArray(articleReviews.articleId, allArticles));
    await db.delete(articles).where(inArray(articles.id, allArticles));
    await db.delete(userRoles).where(inArray(userRoles.userId, allUsers));
    await db.delete(users).where(inArray(users.id, allUsers));
    await db.delete(newspapers).where(inArray(newspapers.id, [npA, npB]));
});

const selectArticleIds = (s: ReturnType<typeof session>) =>
    withRls(s, async (tx) => {
        const rows = await tx.select({ id: articles.id }).from(articles).where(inArray(articles.id, allArticles));
        return rows.map(r => r.id).sort();
    });

describe("articles RLS", () => {
    test("anonymous visitor sees only PUBLISHED", async () => {
        const visible = await selectArticleIds(session(null, null, []));
        expect(visible).toEqual([aPublishedA1].sort());
    });

    test("registered user (not author/editor) sees only PUBLISHED", async () => {
        const visible = await selectArticleIds(session(uAuthorB1, npB, ["REGISTERED_USER"]));
        expect(visible).toContain(aPublishedA1);
        expect(visible).not.toContain(aDraftA1);
        expect(visible).not.toContain(aDraftA2);
        expect(visible).not.toContain(aSubmittedA1);
    });

    test("author sees own drafts plus PUBLISHED, not other authors' drafts", async () => {
        const visible = await selectArticleIds(session(uAuthorA1, npA, ["AUTHOR"]));
        expect(visible).toContain(aDraftA1);
        expect(visible).toContain(aSubmittedA1);
        expect(visible).toContain(aInReviewA1);
        expect(visible).toContain(aPublishedA1);
        expect(visible).not.toContain(aDraftA2);
        expect(visible).not.toContain(aInReviewA2);
    });

    test("editor sees IN_REVIEW articles only when assigned as reviewer", async () => {
        const visible = await selectArticleIds(session(uEditorA, npA, ["EDITOR"]));
        expect(visible).toContain(aInReviewA1);
        expect(visible).not.toContain(aInReviewA2);
        expect(visible).not.toContain(aDraftA1);
    });

    test("manager sees SUBMITTED in own newspaper, not in other newspaper", async () => {
        const visible = await selectArticleIds(session(uManagerA, npA, ["NEWSPAPER_MANAGER"]));
        expect(visible).toContain(aSubmittedA1);
        expect(visible).not.toContain(aSubmittedB1);
        expect(visible).not.toContain(aDraftA1);
    });

    test("admin sees everything in the fixture", async () => {
        const visible = await selectArticleIds(session(uAdmin, null, ["SYSTEM_ADMINISTRATOR"]));
        expect(visible.sort()).toEqual(allArticles.slice().sort());
    });
});

describe("comments / likes RLS", () => {
    test("commenting on a non-PUBLISHED article is rejected", async () => {
        const newCommentId = randomUUID();
        await expect(
            withRls(session(uAuthorA1, npA, ["AUTHOR"]), async (tx) =>
                tx.insert(comments).values({
                    id: newCommentId, articleId: aDraftA1, userId: uAuthorA1, content: "x",
                })
            )
        ).rejects.toThrow();
    });

    test("liking on a PUBLISHED article is allowed; on DRAFT it is rejected", async () => {
        await withRls(session(uAuthorA2, npA, ["AUTHOR"]), async (tx) =>
            tx.insert(likes).values({ articleId: aPublishedA1, userId: uAuthorA2 })
        );

        await expect(
            withRls(session(uAuthorA2, npA, ["AUTHOR"]), async (tx) =>
                tx.insert(likes).values({ articleId: aDraftA1, userId: uAuthorA2 })
            )
        ).rejects.toThrow();
    });
});

describe("user_roles RLS", () => {
    test("a user sees only their own roles; cannot see other newspaper's roles", async () => {
        const rows = await withRls(session(uAuthorA1, npA, ["AUTHOR"]), async (tx) =>
            tx.select().from(userRoles).where(eq(userRoles.userId, uManagerB))
        );
        expect(rows).toHaveLength(0);
    });

    test("manager sees roles within their own newspaper", async () => {
        const rows = await withRls(session(uManagerA, npA, ["NEWSPAPER_MANAGER"]), async (tx) =>
            tx.select().from(userRoles).where(eq(userRoles.newspaperId, npA))
        );
        const userIds = rows.map(r => r.userId).sort();
        expect(userIds).toContain(uAuthorA1);
        expect(userIds).toContain(uAuthorA2);
        expect(userIds).toContain(uEditorA);
        expect(userIds).toContain(uManagerA);
    });
});
