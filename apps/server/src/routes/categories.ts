import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { db } from "../db";
import { articleCategory, articles, newspapers } from "../db/schema";
import { eq, inArray } from "drizzle-orm";
import { categoryListParams, categoryRouteParams, categoryBody } from "../schemas/categories";
import { logger } from "../utils/logger";
import { audit } from "../utils/audit";

// Helper: slugify
const slugify = (text: string): string =>
    text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-");

export const categoryRoutes = new Elysia({ detail: { tags: ["Categories"] } })
    .use(authMiddleware)

    // GET /api/newspapers/:newspaper_id/categories/by-slug/:slug — public
    .get("/api/newspapers/:newspaper_id/categories/by-slug/:slug", async ({ params }: any) => {
        const newspaper = await db.query.newspapers.findFirst({
            where: eq(newspapers.id, params.newspaper_id),
        });
        if (!newspaper) {
            logger.warn("Category fetch failed: newspaper not found", {
                newspaperId: params.newspaper_id,
            });

            return Response.json({ error: "NEWSPAPER_NOT_FOUND" }, { status: 404 });
        }


        const category = await db.query.articleCategory.findFirst({
            where: eq(articleCategory.slug, params.slug),
        });
        if (!category) {
            logger.warn("Category fetch failed: not found", {
                slug: params.slug,
                newspaperId: params.newspaper_id,
            });

            return Response.json({ error: "CATEGORY_NOT_FOUND" }, { status: 404 });
        }

        return Response.json({ id: category.id, name: category.categoryName, slug: category.slug });
    })

    // GET /api/newspapers/:newspaper_id/categories — public
    .get("/api/newspapers/:newspaper_id/categories", async ({ params }) => {
        const newspaper = await db.query.newspapers.findFirst({
            where: eq(newspapers.id, params.newspaper_id),
        });
        if (!newspaper) {
            logger.warn("Categories fetch failed: newspaper not found", {
                newspaperId: params.newspaper_id,
            });

            return Response.json({ error: "NEWSPAPER_NOT_FOUND" }, { status: 404 });
        }

        const newspaperArticles = await db.query.articles.findMany({
            where: eq(articles.newspaperId, params.newspaper_id),
            columns: { categoryId: true },
        });

        const categoryIds = [
            ...new Set(
                newspaperArticles
                    .map((a: any) => a.categoryId)
                    .filter(Boolean)
            ),
        ] as string[];

        const cats =
            categoryIds.length > 0
                ? await db.query.articleCategory.findMany({
                      where: inArray(articleCategory.id, categoryIds),
                  })
                : [];

        return Response.json({
            data: cats.map((c: any) => ({ id: c.id, name: c.categoryName, slug: c.slug })),
        });
    }, {
		params: categoryListParams,
	})

    // POST /api/newspapers/:newspaper_id/categories — NEWSPAPER_MANAGER
    .post("/api/newspapers/:newspaper_id/categories", async ({ params, user, roles, body }) => {
        if (!user) {
            logger.warn("Category create failed: unauthorized", {});
            return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
        }

        if (!roles.includes("NEWSPAPER_MANAGER") && !roles.includes("SYSTEM_ADMINISTRATOR")) {
            logger.warn("Category create failed: forbidden", {
                userId: user.id,
                roles,
            });
            return Response.json({ error: "FORBIDDEN" }, { status: 403 });
        }

        const newspaper = await db.query.newspapers.findFirst({
            where: eq(newspapers.id, params.newspaper_id),
        });
        if (!newspaper) {
            logger.warn("Category create failed: newspaper not found", {
                newspaperId: params.newspaper_id,
            });
            return Response.json({ error: "NEWSPAPER_NOT_FOUND" }, { status: 404 });
        }

        const { name } = body;
        const existing = await db.query.articleCategory.findFirst({
            where: eq(articleCategory.categoryName, name),
        });
        if (existing) {
            logger.warn("Category create failed: name taken", {
                name,
                newspaperId: params.newspaper_id,
            });
            return Response.json({ error: "CATEGORY_NAME_TAKEN" }, { status: 409 });
        }

        const slug = slugify(name);
        const [created] = await db
            .insert(articleCategory)
            .values({ categoryName: name, slug })
            .returning();

        await audit({ userId: user.id, operationType: "CATEGORY_CREATED", targetObjectId: created!.id, result: "SUCCESS" });
        logger.info("Category created", { categoryId: created!.id, name, newspaperId: params.newspaper_id });

        return Response.json({ id: created!.id, name: created!.categoryName }, { status: 201 });
    }, {
		params: categoryListParams,
		body: categoryBody,
	})

    // PUT /api/newspapers/:newspaper_id/categories/:category_id — NEWSPAPER_MANAGER
    .put(
        "/api/newspapers/:newspaper_id/categories/:category_id",
        async ({ params, user, roles, body }) => {
            if (!user) {
                logger.warn("Category update failed: unauthorized", {});
                return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
            }

            if (!roles.includes("NEWSPAPER_MANAGER") && !roles.includes("SYSTEM_ADMINISTRATOR")) {
                logger.warn("Category update failed: forbidden", {
                    userId: user.id,
                    roles,
                });
                return Response.json({ error: "FORBIDDEN" }, { status: 403 });
            }

            const category = await db.query.articleCategory.findFirst({
                where: eq(articleCategory.id, params.category_id),
            });
            if (!category) {
                logger.warn("Category update failed: not found", {
                    categoryId: params.category_id,
                });
                return Response.json({ error: "CATEGORY_NOT_FOUND" }, { status: 404 });
            }

            const { name } = body ?? {};
            if (!name?.trim()) {
                logger.warn("Category update failed: invalid name", {
                    userId: user.id,
                    categoryId: params.category_id,
                });
                return Response.json(
                    { error: "VALIDATION_ERROR", fields: { name: "Name cannot be empty" } },
                    { status: 422 }
                );
            }

            const [updated] = await db
                .update(articleCategory)
                .set({ categoryName: name, slug: slugify(name) })
                .where(eq(articleCategory.id, params.category_id))
                .returning();
            
            await audit({ userId: user.id, operationType: "CATEGORY_UPDATED", targetObjectId: params.category_id, result: "SUCCESS" });
            logger.info("Category updated", { categoryId: params.category_id, newName: name });

            return Response.json({ id: updated!.id, name: updated!.categoryName });
        }, {
			params: categoryRouteParams,
			body: categoryBody,
		})

    // DELETE /api/newspapers/:newspaper_id/categories/:category_id — NEWSPAPER_MANAGER
    .delete(
        "/api/newspapers/:newspaper_id/categories/:category_id",
        async ({ params, user, roles }) => {
            if (!user) {
                logger.warn("Category delete failed: unauthorized", {});
                return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
            }

            if (!roles.includes("NEWSPAPER_MANAGER") && !roles.includes("SYSTEM_ADMINISTRATOR")) {
                logger.warn("Category delete failed: forbidden", {
                    userId: user.id,
                    roles,
                });
                return Response.json({ error: "FORBIDDEN" }, { status: 403 });
            }

            const category = await db.query.articleCategory.findFirst({
                where: eq(articleCategory.id, params.category_id),
            });
            if (!category) {
                logger.warn("Category delete failed: not found", {
                    categoryId: params.category_id,
                });
                return Response.json({ error: "CATEGORY_NOT_FOUND" }, { status: 404 });
            }

            const usedBy = await db.query.articles.findFirst({
                where: eq(articles.categoryId, params.category_id),
            });
            if (usedBy) {
                logger.warn("Category delete failed: in use", {
                    categoryId: params.category_id,
                });
                return Response.json({ error: "CATEGORY_IN_USE" }, { status: 409 });
            }

            await db.delete(articleCategory).where(eq(articleCategory.id, params.category_id));

            await audit({ userId: user.id, operationType: "CATEGORY_DELETED", targetObjectId: params.category_id, result: "SUCCESS" });
            logger.info("Category deleted", { categoryId: params.category_id, deletedBy: user.id });

            return new Response(null, { status: 204 });
        }, {
			params: categoryRouteParams,
		});
