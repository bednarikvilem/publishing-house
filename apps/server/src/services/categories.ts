import { articleCategory, articles, newspapers } from "../db/schema";
import { and, eq } from "drizzle-orm";
import { logger } from "../utils/logger";
import { audit } from "../utils/audit";
import {
    ConflictError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
    UnprocessableError,
} from "../errors";
import type { AuthUser, Roles } from "./context";
import type { Static } from "elysia";
import type { categoryBody } from "../schemas/categories";
import type { Tx } from "../db/rls";

const slugify = (text: string): string =>
    text
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-");

const canManage = (roles: Roles) =>
    roles.includes("NEWSPAPER_MANAGER") || roles.includes("SYSTEM_ADMINISTRATOR");

export async function getCategoryBySlug(tx: Tx, newspaperId: string, slug: string) {
    const newspaper = await tx.query.newspapers.findFirst({
        where: eq(newspapers.id, newspaperId),
    });
    if (!newspaper) {
        logger.warn("Category fetch failed: newspaper not found", { newspaperId });
        throw new NotFoundError("NEWSPAPER_NOT_FOUND");
    }

    const category = await tx.query.articleCategory.findFirst({
        where: eq(articleCategory.slug, slug),
    });
    if (!category) {
        logger.warn("Category fetch failed: not found", { slug, newspaperId });
        throw new NotFoundError("CATEGORY_NOT_FOUND");
    }

    return { id: category.id, name: category.categoryName, slug: category.slug };
}

export async function listCategories(tx: Tx, newspaperId: string) {
    const newspaper = await tx.query.newspapers.findFirst({
        where: eq(newspapers.id, newspaperId),
    });
    if (!newspaper) {
        logger.warn("Categories fetch failed: newspaper not found", { newspaperId });
        throw new NotFoundError("NEWSPAPER_NOT_FOUND");
    }

    const cats = await tx.query.articleCategory.findMany({
        where: eq(articleCategory.newspaperId, newspaperId),
    });

    return {
        data: cats.map((c: any) => ({ id: c.id, name: c.categoryName, slug: c.slug })),
    };
}

export async function createCategory(
    tx: Tx,
    newspaperId: string,
    user: AuthUser | null,
    roles: Roles,
    body: Static<typeof categoryBody>,
) {
    if (!user) {
        logger.warn("Category create failed: unauthorized", {});
        throw new UnauthorizedError("UNAUTHORIZED");
    }

    if (!canManage(roles)) {
        logger.warn("Category create failed: forbidden", { userId: user.id, roles });
        throw new ForbiddenError("FORBIDDEN");
    }

    const newspaper = await tx.query.newspapers.findFirst({
        where: eq(newspapers.id, newspaperId),
    });
    if (!newspaper) {
        logger.warn("Category create failed: newspaper not found", { newspaperId });
        throw new NotFoundError("NEWSPAPER_NOT_FOUND");
    }

    const { name } = body;
    const existing = await tx.query.articleCategory.findFirst({
        where: and(
            eq(articleCategory.categoryName, name),
            eq(articleCategory.newspaperId, newspaperId),
        ),
    });
    if (existing) {
        logger.warn("Category create failed: name taken", { name, newspaperId });
        throw new ConflictError("CATEGORY_NAME_TAKEN");
    }

    const slug = slugify(name);
    const [created] = await tx
        .insert(articleCategory)
        .values({ categoryName: name, slug, newspaperId })
        .returning();

    await audit({ userId: user.id, operationType: "CATEGORY_CREATED", targetObjectId: created!.id, result: "SUCCESS" });
    logger.info("Category created", { categoryId: created!.id, name, newspaperId });

    return { id: created!.id, name: created!.categoryName };
}

export async function updateCategory(
    tx: Tx,
    categoryId: string,
    user: AuthUser | null,
    roles: Roles,
    body: Static<typeof categoryBody> | undefined,
) {
    if (!user) {
        logger.warn("Category update failed: unauthorized", {});
        throw new UnauthorizedError("UNAUTHORIZED");
    }

    if (!canManage(roles)) {
        logger.warn("Category update failed: forbidden", { userId: user.id, roles });
        throw new ForbiddenError("FORBIDDEN");
    }

    const category = await tx.query.articleCategory.findFirst({
        where: eq(articleCategory.id, categoryId),
    });
    if (!category) {
        logger.warn("Category update failed: not found", { categoryId });
        throw new NotFoundError("CATEGORY_NOT_FOUND");
    }

    const { name } = body ?? {};
    if (!name?.trim()) {
        logger.warn("Category update failed: invalid name", { userId: user.id, categoryId });
        throw new UnprocessableError("VALIDATION_ERROR", { fields: { name: "Name cannot be empty" } });
    }

    const [updated] = await tx
        .update(articleCategory)
        .set({ categoryName: name, slug: slugify(name) })
        .where(eq(articleCategory.id, categoryId))
        .returning();

    await audit({ userId: user.id, operationType: "CATEGORY_UPDATED", targetObjectId: categoryId, result: "SUCCESS" });
    logger.info("Category updated", { categoryId, newName: name });

    return { id: updated!.id, name: updated!.categoryName };
}

export async function deleteCategory(
    tx: Tx,
    categoryId: string,
    user: AuthUser | null,
    roles: Roles,
) {
    if (!user) {
        logger.warn("Category delete failed: unauthorized", {});
        throw new UnauthorizedError("UNAUTHORIZED");
    }

    if (!canManage(roles)) {
        logger.warn("Category delete failed: forbidden", { userId: user.id, roles });
        throw new ForbiddenError("FORBIDDEN");
    }

    const category = await tx.query.articleCategory.findFirst({
        where: eq(articleCategory.id, categoryId),
    });
    if (!category) {
        logger.warn("Category delete failed: not found", { categoryId });
        throw new NotFoundError("CATEGORY_NOT_FOUND");
    }

    const usedBy = await tx.query.articles.findFirst({
        where: eq(articles.categoryId, categoryId),
    });
    if (usedBy) {
        logger.warn("Category delete failed: in use", { categoryId });
        throw new ConflictError("CATEGORY_IN_USE");
    }

    await tx.delete(articleCategory).where(eq(articleCategory.id, categoryId));

    await audit({ userId: user.id, operationType: "CATEGORY_DELETED", targetObjectId: categoryId, result: "SUCCESS" });
    logger.info("Category deleted", { categoryId, deletedBy: user.id });
}
