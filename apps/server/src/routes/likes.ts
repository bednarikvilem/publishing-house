import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { db } from "../db";
import { likes, articles } from "../db/schema";
import { eq, and, count } from "drizzle-orm";
import { likeRouteParams } from "../schemas/likes";
import { logger } from "../utils/logger";
import { audit } from "../utils/audit";

export const likeRoutes = new Elysia({ detail: { tags: ["Likes"] } })
    .use(authMiddleware)

    // POST /api/newspapers/:newspaper_id/articles/:article_id/likes
    .post(
        "/api/newspapers/:newspaper_id/articles/:article_id/likes",
        async ({ params, user }) => {
            if (!user) {
                logger.warn("Like failed: unauthorized", {
                    articleId: params.article_id,
                    newspaperId: params.newspaper_id,
                });

                return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
            }

            if (user.newspaperId !== params.newspaper_id) {
                logger.warn("Like failed: forbidden (cross-newspaper)", {
                    userId: user.id,
                    userNewspaperId: user.newspaperId,
                    targetNewspaperId: params.newspaper_id,
                });

                return Response.json({ error: "FORBIDDEN" }, { status: 403 });
            }

            const article = await db.query.articles.findFirst({
                where: and(
                    eq(articles.id, params.article_id),
                    eq(articles.newspaperId, params.newspaper_id),
                    eq(articles.state, "PUBLISHED")
                ),
            });
            if (!article) {
                logger.warn("Like failed: article not found", {
                    userId: user.id,
                    articleId: params.article_id,
                    newspaperId: params.newspaper_id,
                });

                return Response.json({ error: "ARTICLE_NOT_FOUND" }, { status: 404 });
            }

            const existing = await db.query.likes.findFirst({
                where: and(eq(likes.userId, user.id), eq(likes.articleId, params.article_id)),
            });
            if (existing) {
                logger.warn("Like failed: already liked", {
                    userId: user.id,
                    articleId: params.article_id,
                });

                return Response.json({ error: "ALREADY_LIKED" }, { status: 409 });
            }

            await db.insert(likes).values({ userId: user.id, articleId: params.article_id });

            const [result] = await db
                .select({ count: count() })
                .from(likes)
                .where(eq(likes.articleId, params.article_id));

            logger.info("Article liked", {
                userId: user.id,
                articleId: params.article_id,
            });
            await audit({
                userId: user.id,
                operationType: "ARTICLE_LIKE",
                targetObjectId: params.article_id,
                result: "SUCCESS",
            });

            return Response.json({ likes_count: Number(result!.count) }, { status: 201 });
        }, {
			params: likeRouteParams,
		})

    // DELETE /api/newspapers/:newspaper_id/articles/:article_id/likes
    .delete(
        "/api/newspapers/:newspaper_id/articles/:article_id/likes",
        async ({ params, user }) => {
            if (!user) {
                logger.warn("Unlike failed: unauthorized", {
                    articleId: params.article_id,
                });

                return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
            }

            const article = await db.query.articles.findFirst({
                where: and(
                    eq(articles.id, params.article_id),
                    eq(articles.state, "PUBLISHED")
                ),
            });
            if (!article) {
                logger.warn("Unlike failed: article not found", {
                    userId: user.id,
                    articleId: params.article_id,
                });

                return Response.json({ error: "LIKE_NOT_FOUND" }, { status: 404 });
            }

            const existing = await db.query.likes.findFirst({
                where: and(eq(likes.userId, user.id), eq(likes.articleId, params.article_id)),
            });
            if (!existing) {
                logger.warn("Unlike failed: like not found", {
                    userId: user.id,
                    articleId: params.article_id,
                });

                return Response.json({ error: "LIKE_NOT_FOUND" }, { status: 404 });
            }

            await db.delete(likes).where(
                and(eq(likes.userId, user.id), eq(likes.articleId, params.article_id))
            );

            const [result] = await db
                .select({ count: count() })
                .from(likes)
                .where(eq(likes.articleId, params.article_id));

            logger.info("Article unliked", {
                userId: user.id,
                articleId: params.article_id,
            });
            await audit({
                userId: user.id,
                operationType: "ARTICLE_UNLIKE",
                targetObjectId: params.article_id,
                result: "SUCCESS",
            });

            return Response.json({ likes_count: Number(result!.count) });
        }, {
			params: likeRouteParams,
		});
