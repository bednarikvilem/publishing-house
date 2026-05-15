import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { likeRouteParams } from "../schemas/likes";
import * as likeService from "../services/likes";

export const likeRoutes = new Elysia({ detail: { tags: ["Likes"] } })
    .use(authMiddleware)

    // POST /api/newspapers/:newspaper_id/articles/:article_id/likes
    .post(
        "/api/newspapers/:newspaper_id/articles/:article_id/likes",
        async ({ params, user, set }) => {
            const result = await likeService.likeArticle(
                params.newspaper_id,
                params.article_id,
                user,
            );
            set.status = 201;
            return result;
        }, {
        params: likeRouteParams,
    })

    // DELETE /api/newspapers/:newspaper_id/articles/:article_id/likes
    .delete(
        "/api/newspapers/:newspaper_id/articles/:article_id/likes",
        ({ params, user }) => likeService.unlikeArticle(params.article_id, user), {
        params: likeRouteParams,
    });
