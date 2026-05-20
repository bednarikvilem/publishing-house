import { Elysia } from "elysia";
import { authorRouteParams, authorArticlesQuery } from "../schemas/authors";
import * as authorService from "../services/authors";

export const authorRoutes = new Elysia({ detail: { tags: ["Authors"] } })

    // GET /api/newspapers/:newspaper_id/authors/:author_id — public
    .get("/api/newspapers/:newspaper_id/authors/:author_id", ({ params, query }) =>
        authorService.getAuthorProfile(
            params.newspaper_id,
            params.author_id,
            query.page,
            query.limit,
        ), {
        params: authorRouteParams,
        query: authorArticlesQuery,
    });
