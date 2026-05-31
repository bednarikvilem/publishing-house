import { articleViews, articles } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { NotFoundError } from "../errors";
import type { AuthUser } from "./context";
import type { Tx } from "../db/rls";

export async function recordView(
    tx: Tx,
    newspaperId: string,
    articleId: string,
    user: AuthUser | null,
    body: { read_completed?: boolean } | undefined,
) {
    const article = await tx.query.articles.findFirst({
        where: and(
            eq(articles.id, articleId),
            eq(articles.newspaperId, newspaperId),
            eq(articles.state, "PUBLISHED"),
        ),
    });
    if (!article) {
        throw new NotFoundError("ARTICLE_NOT_FOUND");
    }

    const readCompleted = body?.read_completed ?? false;

    // Promote an existing incomplete view from the same user instead of
    // double-counting when they reach the end of the article.
    if (readCompleted && user?.id) {
        const existing = await tx.query.articleViews.findFirst({
            where: and(
                eq(articleViews.articleId, articleId),
                eq(articleViews.userId, user.id),
                eq(articleViews.readCompleted, false),
            ),
        });

        if (existing) {
            await tx
                .update(articleViews)
                .set({ readCompleted: true })
                .where(eq(articleViews.id, existing.id));
            return { recorded: true, updated: true };
        }
    }

    await tx.insert(articleViews).values({
        articleId,
        userId: user?.id ?? null,
        readCompleted,
    });

    return { recorded: true, updated: false };
}
