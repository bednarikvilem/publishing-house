import { db } from "../db";
import { articleViews, articles } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { NotFoundError } from "../errors";
import type { AuthUser } from "./context";

export async function recordView(
    newspaperId: string,
    articleId: string,
    user: AuthUser | null,
    body: { read_completed?: boolean } | undefined,
) {
    const article = await db.query.articles.findFirst({
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

    await db.insert(articleViews).values({
        articleId,
        userId: user?.id ?? null,
        readCompleted,
    });

    return { recorded: true };
}
