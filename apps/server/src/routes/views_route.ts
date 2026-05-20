import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { t } from "elysia";
import * as viewService from "../services/views";

const viewParams = t.Object({
    newspaper_id: t.String({ format: "uuid" }),
    article_id: t.String({ format: "uuid" }),
});

const viewBody = t.Object({
    read_completed: t.Optional(t.Boolean()),
});

export const viewRoutes = new Elysia({ detail: { tags: ["Articles"] } })
    .use(authMiddleware)

    // POST /api/newspapers/:newspaper_id/articles/:article_id/views
    // Called by the frontend on article open (read_completed: false)
    // and again when the user scrolls to the end (read_completed: true).
    // Auth is optional — unauthenticated visitors still generate view counts.
    .post(
        "/api/newspapers/:newspaper_id/articles/:article_id/views",
        async ({ params, user, body, set }) => {
            const result = await viewService.recordView(
                params.newspaper_id,
                params.article_id,
                user,
                body,
            );
            set.status = result.updated ? 200 : 201;
            return { recorded: result.recorded };
        },
        {
            params: viewParams,
            body: viewBody,
        },
    );
