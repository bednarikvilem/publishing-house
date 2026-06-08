import { Elysia } from "elysia";
import { auth } from "../middleware/auth";
import { categoryListParams, categoryRouteParams, categoryBody } from "../schemas/categories";
import * as categoryService from "../services/categories";

export const categoryRoutes = new Elysia({ detail: { tags: ["Categories"] } })
    .use(auth)

    // GET /api/newspapers/:newspaper_id/categories/by-slug/:slug — public
    .get("/api/newspapers/:newspaper_id/categories/by-slug/:slug", ({ params, withDb }: any) =>
        withDb((tx: any) => categoryService.getCategoryBySlug(tx, params.newspaper_id, params.slug)))

    // GET /api/newspapers/:newspaper_id/categories — public
    .get("/api/newspapers/:newspaper_id/categories", ({ params, withDb }) =>
        withDb((tx) => categoryService.listCategories(tx, params.newspaper_id)), {
        params: categoryListParams,
    })

    // POST /api/newspapers/:newspaper_id/categories — NEWSPAPER_MANAGER
    .post("/api/newspapers/:newspaper_id/categories", async ({ params, user, roles, body, withDb, set }) => {
        const result = await withDb((tx) =>
            categoryService.createCategory(tx, params.newspaper_id, user, roles, body),
        );
        set.status = 201;
        return result;
    }, {
        requireAuth: true,
        params: categoryListParams,
        body: categoryBody,
    })

    // PUT /api/newspapers/:newspaper_id/categories/:category_id — NEWSPAPER_MANAGER
    .put(
        "/api/newspapers/:newspaper_id/categories/:category_id",
        ({ params, user, roles, body, withDb }) =>
            withDb((tx) => categoryService.updateCategory(tx, params.category_id, user, roles, body)), {
        requireAuth: true,
        params: categoryRouteParams,
        body: categoryBody,
    })

    // DELETE /api/newspapers/:newspaper_id/categories/:category_id — NEWSPAPER_MANAGER
    .delete(
        "/api/newspapers/:newspaper_id/categories/:category_id",
        async ({ params, user, roles, withDb, set }) => {
            await withDb((tx) => categoryService.deleteCategory(tx, params.category_id, user, roles));
            set.status = 204;
            return null;
        }, {
        requireAuth: true,
        params: categoryRouteParams,
    });
