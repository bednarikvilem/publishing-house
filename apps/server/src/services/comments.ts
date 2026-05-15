import { db } from "../db";
import { comments, articles, newspapers } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../utils/logger";
import { audit } from "../utils/audit";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "../errors";
import type { AuthUser, Roles } from "./context";
import type { Static } from "elysia";
import type { commentBody } from "../schemas/comments";

export async function postComment(
    newspaperId: string,
    articleId: string,
    user: AuthUser | null,
    body: Static<typeof commentBody>,
) {
    if (!user) {
        logger.warn("Comment post failed: unauthorized", { articleId });
        throw new UnauthorizedError("UNAUTHORIZED");
    }

    const article = await db.query.articles.findFirst({
        where: and(
            eq(articles.id, articleId),
            eq(articles.newspaperId, newspaperId),
            eq(articles.state, "PUBLISHED"),
        ),
    });
    if (!article) {
        logger.warn("Comment post failed: article not found", {
            userId: user?.id,
            articleId,
            newspaperId,
        });
        throw new NotFoundError("ARTICLE_NOT_FOUND");
    }

    if (user.newspaperId !== newspaperId) {
        logger.warn("Comment post failed: forbidden (cross-newspaper)", {
            userId: user.id,
            userNewspaperId: user.newspaperId,
            targetNewspaperId: newspaperId,
        });
        throw new ForbiddenError("FORBIDDEN");
    }

    const { content } = body;

    const [comment] = await db
        .insert(comments)
        .values({ articleId, userId: user.id, content })
        .returning();

    await audit({ userId: user.id, operationType: "COMMENT_POSTED", targetObjectId: comment!.id, result: "SUCCESS" });
    logger.info("Comment posted", { commentId: comment!.id, articleId, userId: user.id });

    return {
        id: comment!.id,
        content: comment!.content,
        created_at: comment!.createdAt,
        author: { id: user.id, username: user.username },
    };
}

export async function deleteComment(
    articleId: string,
    commentId: string,
    user: AuthUser | null,
    roles: Roles,
) {
    if (!user) {
        logger.warn("Comment delete failed: unauthorized", {});
        throw new UnauthorizedError("UNAUTHORIZED");
    }

    const comment = await db.query.comments.findFirst({
        where: eq(comments.id, commentId),
    });
    if (!comment) {
        logger.warn("Comment delete failed: not found", { commentId });
        throw new NotFoundError("COMMENT_NOT_FOUND");
    }

    if (comment.articleId !== articleId) {
        logger.warn("Comment delete failed: article mismatch", { commentId, articleId });
        throw new NotFoundError("COMMENT_NOT_FOUND");
    }

    const canDelete =
        comment.userId === user.id ||
        roles.includes("EDITOR") ||
        roles.includes("NEWSPAPER_MANAGER") ||
        roles.includes("SYSTEM_ADMINISTRATOR");

    if (!canDelete) {
        logger.warn("Comment delete failed: forbidden", {
            userId: user.id,
            commentOwnerId: comment.userId,
            roles,
        });
        throw new ForbiddenError("FORBIDDEN");
    }

    await db.delete(comments).where(eq(comments.id, commentId));

    await audit({ userId: user.id, operationType: "COMMENT_DELETED", targetObjectId: commentId, result: "SUCCESS" });
    logger.info("Comment deleted", { commentId, deletedBy: user.id });
}

export async function listCommentsForModeration(
    newspaperId: string,
    user: AuthUser | null,
    roles: Roles,
    query: { page: number; limit: number; article_id?: string },
) {
    if (!user) {
        logger.warn("Comment moderation fetch failed: unauthorized", {});
        throw new UnauthorizedError("UNAUTHORIZED");
    }

    const hasAccess =
        roles.includes("EDITOR") ||
        roles.includes("NEWSPAPER_MANAGER") ||
        roles.includes("SYSTEM_ADMINISTRATOR");
    if (!hasAccess) {
        logger.warn("Comment moderation fetch failed: forbidden", { userId: user.id, roles });
        throw new ForbiddenError("FORBIDDEN");
    }

    const newspaper = await db.query.newspapers.findFirst({
        where: eq(newspapers.id, newspaperId),
    });
    if (!newspaper) {
        logger.warn("Comment moderation fetch failed: newspaper not found", { newspaperId });
        throw new NotFoundError("NEWSPAPER_NOT_FOUND");
    }

    const { page, limit, article_id } = query;
    const offset = (page - 1) * limit;

    // TODO, DB should be called instead of loading all
    const allComments = await db.query.comments.findMany({
        with: { article: true, user: true },
    });

    const filtered = allComments.filter((c: any) => {
        const isInNewspaper = c.article?.newspaperId === newspaperId;
        const matchesArticle = article_id ? c.articleId === article_id : true;
        return isInNewspaper && matchesArticle;
    });

    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit);

    return {
        data: paged.map((c: any) => ({
            id: c.id,
            content: c.content,
            created_at: c.createdAt,
            author: { id: c.user?.id, username: c.user?.username },
            article: { id: c.article?.id, title: c.article?.title },
        })),
        pagination: {
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit),
        },
    };
}
