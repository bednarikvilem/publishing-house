import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import {
	commentCreateParams,
	commentDeleteParams,
	commentModerationParams,
	commentBody,
	commentModerationQuery,
} from "../schemas/comments";
import * as commentService from "../services/comments";

export const commentRoutes = new Elysia({ detail: { tags: ["Comments"] } })
    .use(authMiddleware)

    // POST /api/newspapers/:newspaper_id/articles/:article_id/comments — REGISTERED_USER
    .post(
        "/api/newspapers/:newspaper_id/articles/:article_id/comments",
        async ({ params, user, body, withDb, set }) => {
            const result = await withDb((tx) =>
                commentService.postComment(tx, params.newspaper_id, params.article_id, user, body),
            );
            set.status = 201;
            return result;
        }, {
        params: commentCreateParams,
        body: commentBody,
    })

    // DELETE /api/newspapers/:newspaper_id/articles/:article_id/comments/:comment_id
    .delete(
        "/api/newspapers/:newspaper_id/articles/:article_id/comments/:comment_id",
        async ({ params, user, roles, withDb, set }) => {
            await withDb((tx) =>
                commentService.deleteComment(tx, params.article_id, params.comment_id, user, roles),
            );
            set.status = 204;
            return null;
        }, {
        params: commentDeleteParams,
    })

    // GET /api/newspapers/:newspaper_id/comments — moderation (EDITOR, MANAGER, SYSTEM_ADMIN)
    .get("/api/newspapers/:newspaper_id/comments", ({ params, user, roles, query, withDb }) =>
        withDb((tx) => commentService.listCommentsForModeration(tx, params.newspaper_id, user, roles, query)), {
        params: commentModerationParams,
        query: commentModerationQuery,
    });
