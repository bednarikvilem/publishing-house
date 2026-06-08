import { Elysia } from "elysia";
import { auth } from "../middleware/auth";
import { likeRouteParams } from "../schemas/likes";
import * as likeService from "../services/likes";

export const likeRoutes = new Elysia({ detail: { tags: ["Likes"] } })
    .use(auth)

    // POST /api/newspapers/:newspaper_id/articles/:article_id/likes
    .post(
        "/api/newspapers/:newspaper_id/articles/:article_id/likes",
        async ({ params, user, withDb, set }) => {
            const result = await withDb((tx) =>
                likeService.likeArticle(tx, params.newspaper_id, params.article_id, user),
            );
            set.status = 201;
            return result;
        }, {
        requireAuth: true,
        params: likeRouteParams,
    })

    // DELETE /api/newspapers/:newspaper_id/articles/:article_id/likes
    .delete(
        "/api/newspapers/:newspaper_id/articles/:article_id/likes",
        ({ params, user, withDb }) =>
            withDb((tx) => likeService.unlikeArticle(tx, params.article_id, user)), {
        requireAuth: true,
        params: likeRouteParams,
    });
