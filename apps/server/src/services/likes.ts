import { likes, articles } from "../db/schema";
import { eq, and, count } from "drizzle-orm";
import { logger } from "../utils/logger";
import { audit } from "../utils/audit";
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from "../errors";
import type { AuthUser } from "./context";
import type { Tx } from "../db/rls";

export async function likeArticle(
    tx: Tx,
    newspaperId: string,
    articleId: string,
    user: AuthUser | null,
) {
    if (!user) {
        logger.warn("Like failed: unauthorized", { articleId, newspaperId });
        throw new UnauthorizedError("UNAUTHORIZED");
    }

    if (user.newspaperId !== newspaperId) {
        logger.warn("Like failed: forbidden (cross-newspaper)", {
            userId: user.id,
            userNewspaperId: user.newspaperId,
            targetNewspaperId: newspaperId,
        });
        throw new ForbiddenError("FORBIDDEN");
    }

    const article = await tx.query.articles.findFirst({
        where: and(
            eq(articles.id, articleId),
            eq(articles.newspaperId, newspaperId),
            eq(articles.state, "PUBLISHED"),
        ),
    });
    if (!article) {
        logger.warn("Like failed: article not found", { userId: user.id, articleId, newspaperId });
        throw new NotFoundError("ARTICLE_NOT_FOUND");
    }

    const existing = await tx.query.likes.findFirst({
        where: and(eq(likes.userId, user.id), eq(likes.articleId, articleId)),
    });
    if (existing) {
        logger.warn("Like failed: already liked", { userId: user.id, articleId });
        throw new ConflictError("ALREADY_LIKED");
    }

    await tx.insert(likes).values({ userId: user.id, articleId });

    const [result] = await tx
        .select({ count: count() })
        .from(likes)
        .where(eq(likes.articleId, articleId));

    logger.info("Article liked", { userId: user.id, articleId });
    await audit({
        userId: user.id,
        operationType: "ARTICLE_LIKE",
        targetObjectId: articleId,
        result: "SUCCESS",
    });

    return { likes_count: Number(result!.count) };
}

export async function unlikeArticle(
    tx: Tx,
    articleId: string,
    user: AuthUser | null,
) {
    if (!user) {
        logger.warn("Unlike failed: unauthorized", { articleId });
        throw new UnauthorizedError("UNAUTHORIZED");
    }

    const article = await tx.query.articles.findFirst({
        where: and(
            eq(articles.id, articleId),
            eq(articles.state, "PUBLISHED"),
        ),
    });
    if (!article) {
        logger.warn("Unlike failed: article not found", { userId: user.id, articleId });
        throw new NotFoundError("LIKE_NOT_FOUND");
    }

    const existing = await tx.query.likes.findFirst({
        where: and(eq(likes.userId, user.id), eq(likes.articleId, articleId)),
    });
    if (!existing) {
        logger.warn("Unlike failed: like not found", { userId: user.id, articleId });
        throw new NotFoundError("LIKE_NOT_FOUND");
    }

    await tx.delete(likes).where(
        and(eq(likes.userId, user.id), eq(likes.articleId, articleId)),
    );

    const [result] = await tx
        .select({ count: count() })
        .from(likes)
        .where(eq(likes.articleId, articleId));

    logger.info("Article unliked", { userId: user.id, articleId });
    await audit({
        userId: user.id,
        operationType: "ARTICLE_UNLIKE",
        targetObjectId: articleId,
        result: "SUCCESS",
    });

    return { likes_count: Number(result!.count) };
}
