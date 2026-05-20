import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { categoryListParams, categoryRouteParams, categoryBody } from "../schemas/categories";
import * as categoryService from "../services/categories";

export const categoryRoutes = new Elysia({ detail: { tags: ["Categories"] } })
    .use(authMiddleware)

    // GET /api/newspapers/:newspaper_id/categories/by-slug/:slug — public
    .get("/api/newspapers/:newspaper_id/categories/by-slug/:slug", ({ params }: any) =>
        categoryService.getCategoryBySlug(params.newspaper_id, params.slug))

    // GET /api/newspapers/:newspaper_id/categories — public
    .get("/api/newspapers/:newspaper_id/categories", ({ params }) =>
        categoryService.listCategories(params.newspaper_id), {
        params: categoryListParams,
    })

    // POST /api/newspapers/:newspaper_id/categories — NEWSPAPER_MANAGER
    .post("/api/newspapers/:newspaper_id/categories", async ({ params, user, roles, body, set }) => {
        const result = await categoryService.createCategory(params.newspaper_id, user, roles, body);
        set.status = 201;
        return result;
    }, {
        params: categoryListParams,
        body: categoryBody,
    })

    // PUT /api/newspapers/:newspaper_id/categories/:category_id — NEWSPAPER_MANAGER
    .put(
        "/api/newspapers/:newspaper_id/categories/:category_id",
        ({ params, user, roles, body }) =>
            categoryService.updateCategory(params.category_id, user, roles, body), {
        params: categoryRouteParams,
        body: categoryBody,
    })

    // DELETE /api/newspapers/:newspaper_id/categories/:category_id — NEWSPAPER_MANAGER
    .delete(
        "/api/newspapers/:newspaper_id/categories/:category_id",
        async ({ params, user, roles, set }) => {
            await categoryService.deleteCategory(params.category_id, user, roles);
            set.status = 204;
            return null;
        }, {
        params: categoryRouteParams,
    });
