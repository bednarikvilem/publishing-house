// apps/server/src/routes/views.ts
// Mount this in server.ts: .use(viewRoutes)

import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { db } from "../db";
import { articleViews, articles } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { t } from "elysia";

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
        async ({ params, user, body }) => {
            const article = await db.query.articles.findFirst({
                where: and(
                    eq(articles.id, params.article_id),
                    eq(articles.newspaperId, params.newspaper_id),
                    eq(articles.state, "PUBLISHED")
                ),
            });
            if (!article) {
                return Response.json({ error: "ARTICLE_NOT_FOUND" }, { status: 404 });
            }

            const readCompleted = body?.read_completed ?? false;

            await db.insert(articleViews).values({
                articleId: params.article_id,
                userId: user?.id ?? null,
                readCompleted,
            });

            return Response.json({ recorded: true }, { status: 201 });
        },
        {
            params: viewParams,
            body: viewBody,
        }
    );