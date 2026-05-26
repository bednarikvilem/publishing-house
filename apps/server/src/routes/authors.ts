import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { authorRouteParams, authorArticlesQuery } from "../schemas/authors";
import * as authorService from "../services/authors";

export const authorRoutes = new Elysia({ detail: { tags: ["Authors"] } })
    .use(authMiddleware)

    // GET /api/newspapers/:newspaper_id/authors/:author_id — public
    .get("/api/newspapers/:newspaper_id/authors/:author_id", ({ params, query, withDb }) =>
        withDb((tx) =>
            authorService.getAuthorProfile(tx, params.newspaper_id, params.author_id, query.page, query.limit),
        ), {
        params: authorRouteParams,
        query: authorArticlesQuery,
    });
