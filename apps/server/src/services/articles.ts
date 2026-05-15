import { uploadImage, deleteImage } from "../utils/storage";
import { db } from "../db";
import {
    articles,
    articleImages,
    articleReviews,
    articleCategory,
    comments,
    likes,
    newspapers,
    users,
    newspaperAuthors,
    userRoles,
} from "../db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { logger } from "../utils/logger";
import { audit } from "../utils/audit";
import { ForbiddenError, NotFoundError, UnauthorizedError, UnprocessableError } from "../errors";
import type { AuthUser, Roles } from "./context";
import type { Static } from "elysia";
import type {
    articlesListQuery,
    articlesSearchQuery,
    articlesMineQuery,
    articlesQueueQuery,
    articleApproveQuery,
    createArticleBody,
    updateArticleBody,
    assignEditorBody,
    reviewBody,
    scheduleBody,
} from "../schemas/articles";

const articleSummary = (a: any) => {
    const primary = a.images?.find((i: any) => i.isPrimary) ?? a.images?.[0];
    return {
        id: a.id,
        title: a.title,
        perex: a.perex,
        publication_date: a.publicationDate,
        category: a.category?.categoryName ?? null,
        keywords: a.keywords ? a.keywords.split(",").map((k: string) => k.trim()) : [],
        primary_image: primary ? { url: primary.url, caption: primary.caption } : null,
    };
};

export async function searchArticles(
    newspaperId: string,
    query: Static<typeof articlesSearchQuery>,
) {
    const newspaper = await db.query.newspapers.findFirst({
        where: eq(newspapers.id, newspaperId),
    });
    if (!newspaper) throw new NotFoundError("NEWSPAPER_NOT_FOUND");

    const all = await db.query.articles.findMany({
        where: and(
            eq(articles.newspaperId, newspaperId),
            eq(articles.state, "PUBLISHED"),
        ),
        with: { category: true, images: true, author: true },
    });

    const { q, page, limit } = query;
    const offset = (page - 1) * limit;
    const lower = q.toLowerCase();
    let filtered = all.filter((a: any) => {
        return (
            a.author?.fullname?.toLowerCase().includes(lower) ||
            a.title?.toLowerCase().includes(lower) ||
            a.perex?.toLowerCase().includes(lower) ||
            a.content?.toLowerCase().includes(lower) ||
            a.keywords?.toLowerCase().includes(lower) ||
            a.category?.categoryName?.toLowerCase().includes(lower)
        );
    });

    if (query?.category) {
        filtered = filtered.filter(
            (a: any) =>
                a.category?.categoryName?.toLowerCase() === query.category!.toLowerCase(),
        );
    }
    if (query?.date_from) {
        filtered = filtered.filter(
            (a: any) => a.publicationDate && new Date(a.publicationDate) >= new Date(query.date_from!),
        );
    }
    if (query?.date_to) {
        filtered = filtered.filter(
            (a: any) => a.publicationDate && new Date(a.publicationDate) <= new Date(query.date_to!),
        );
    }

    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit);

    return {
        data: paged.map((a: any) => {
            const primary = a.images?.find((i: any) => i.isPrimary) ?? a.images?.[0];
            return {
                author: a.author ? { id: a.author.id, full_name: a.author.fullname } : null,
                id: a.id,
                title: a.title,
                perex: a.perex,
                publication_date: a.publicationDate,
                category: a.category?.categoryName ?? null,
                primary_image: primary ? { url: primary.url, caption: primary.caption } : null,
            };
        }),
        pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };
}

export async function listMyArticles(
    newspaperId: string,
    user: AuthUser | null,
    roles: Roles,
    query: Static<typeof articlesMineQuery>,
) {
    if (!user) throw new UnauthorizedError();
    if (!roles.includes("AUTHOR")) throw new ForbiddenError();

    const newspaper = await db.query.newspapers.findFirst({
        where: eq(newspapers.id, newspaperId),
    });
    if (!newspaper) throw new NotFoundError("NEWSPAPER_NOT_FOUND");

    const { page, limit, status } = query;
    const offset = (page - 1) * limit;

    const all = await db.query.articles.findMany({
        where: and(
            eq(articles.authorId, user.id),
            eq(articles.newspaperId, newspaperId),
        ),
        with: { category: true },
        orderBy: [desc(articles.createdAt)],
    });

    const filtered = status ? all.filter((a: any) => a.state === status) : all;

    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit);

    const result = await Promise.all(
        paged.map(async (a: any) => {
            const latestReview = await db.query.articleReviews.findFirst({
                where: eq(articleReviews.articleId, a.id),
                orderBy: [desc(articleReviews.createdAt)],
            });
            return {
                id: a.id,
                title: a.title,
                perex: a.perex,
                category: a.category?.categoryName ?? null,
                status: a.state,
                created_at: a.createdAt,
                updated_at: a.createdAt,
                latest_feedback: latestReview?.feedback ?? null,
            };
        }),
    );

    return {
        data: result,
        pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };
}

export async function getMyArticle(
    newspaperId: string,
    articleId: string,
    user: AuthUser | null,
    roles: Roles,
) {
    if (!user) throw new UnauthorizedError();
    if (!roles.includes("AUTHOR")) throw new ForbiddenError();

    const article = await db.query.articles.findFirst({
        where: and(
            eq(articles.id, articleId),
            eq(articles.newspaperId, newspaperId),
            eq(articles.authorId, user.id),
        ),
        with: { category: true },
    });
    if (!article) throw new NotFoundError("ARTICLE_NOT_FOUND");

    const images = await db.query.articleImages.findMany({
        where: eq(articleImages.articleId, article.id),
    });

    return {
        id: article.id,
        title: article.title,
        perex: article.perex,
        content: article.content,
        keywords: article.keywords
            ? article.keywords.split(",").map((k: string) => k.trim())
            : null,
        category_id: article.categoryId ?? null,
        status: article.state,
        images: images.map((i: any) => ({
            id: i.id,
            url: i.url,
            caption: i.caption,
            is_primary: i.isPrimary,
        })),
    };
}

export async function getReviewQueue(
    newspaperId: string,
    user: AuthUser | null,
    roles: Roles,
    query: Static<typeof articlesQueueQuery>,
) {
    if (!user) throw new UnauthorizedError();

    const isEditor = roles.includes("EDITOR");
    const isManager = roles.includes("NEWSPAPER_MANAGER");
    const isDirector = roles.includes("DIRECTOR");
    if (!isEditor && !isManager && !isDirector) throw new ForbiddenError();

    const newspaper = await db.query.newspapers.findFirst({
        where: eq(newspapers.id, newspaperId),
    });
    if (!newspaper) throw new NotFoundError("NEWSPAPER_NOT_FOUND");
    const { page, limit, status, view } = query;
    const offset = (page - 1) * limit;

    let effectiveRole: string;
    if (view) {
        if (!roles.includes(view)) throw new ForbiddenError();
        effectiveRole = view;
    } else {
        if (isDirector) effectiveRole = "DIRECTOR";
        else if (isManager) effectiveRole = "NEWSPAPER_MANAGER";
        else effectiveRole = "EDITOR";
    }

    let allowedStates: string[] = [];
    if (effectiveRole === "EDITOR") allowedStates = ["IN_REVIEW"];
    else if (effectiveRole === "NEWSPAPER_MANAGER") allowedStates = ["SUBMITTED", "APPROVED_BY_EDITOR"];
    else if (effectiveRole === "DIRECTOR") allowedStates = ["APPROVED_BY_MANAGER", "APPROVED_BY_DIRECTOR"];

    if (status && allowedStates.includes(status)) {
        allowedStates = [status];
    }

    const all = await db.query.articles.findMany({
        where: eq(articles.newspaperId, newspaperId),
        with: { category: true },
    });

    let filtered = all.filter((a: any) => allowedStates.includes(a.state));

    if (effectiveRole === "EDITOR") {
        const assignedReviews = await db.query.articleReviews.findMany({
            where: eq(articleReviews.reviewerId, user.id),
        });
        const assignedIds = new Set(assignedReviews.map((r: any) => r.articleId));
        filtered = filtered.filter((a: any) => assignedIds.has(a.id));
    }

    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit);

    return {
        data: paged.map((a: any) => ({
            id: a.id,
            title: a.title,
            perex: a.perex,
            category: a.category?.categoryName ?? null,
            status: a.state,
            submitted_at: a.createdAt,
            author: { id: a.authorId },
        })),
        pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };
}

export async function listArticles(
    newspaperId: string,
    query: Static<typeof articlesListQuery>,
) {
    const newspaper = await db.query.newspapers.findFirst({
        where: eq(newspapers.id, newspaperId),
    });
    if (!newspaper) throw new NotFoundError("NEWSPAPER_NOT_FOUND");
    const { page, limit, category } = query;
    const offset = (page - 1) * limit;

    const all = await db.query.articles.findMany({
        where: and(
            eq(articles.newspaperId, newspaperId),
            eq(articles.state, "PUBLISHED"),
        ),
        with: { category: true, images: true },
        orderBy: [desc(articles.publicationDate)],
    });

    const filtered = category
        ? all.filter((a: any) => a.category?.slug === category)
        : all;

    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit);

    const result = await Promise.all(
        paged.map(async (a: any) => {
            const author = await db.query.users.findFirst({ where: eq(users.id, a.authorId) });
            const authorProfile = author
                ? await db.query.newspaperAuthors.findFirst({
                    where: and(
                        eq(newspaperAuthors.userId, author.id),
                        eq(newspaperAuthors.newspaperId, newspaperId),
                    ),
                })
                : null;
            return {
                ...articleSummary(a),
                author: author
                    ? {
                        id: author.id,
                        full_name: author.fullname,
                        profile_picture: authorProfile?.profilePictureUrl ?? null,
                    }
                    : null,
            };
        }),
    );

    return {
        data: result,
        pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };
}

export async function getArticle(
    newspaperId: string,
    articleId: string,
    user: AuthUser | null,
) {
    if (!user) throw new UnauthorizedError();
    if (user.newspaperId !== newspaperId) throw new ForbiddenError();
    const article = await db.query.articles.findFirst({
        where: and(
            eq(articles.id, articleId),
            eq(articles.newspaperId, newspaperId),
            eq(articles.state, "PUBLISHED"),
        ),
        with: { category: true, images: true },
    });
    if (!article) throw new NotFoundError("ARTICLE_NOT_FOUND");
    const author = await db.query.users.findFirst({ where: eq(users.id, article.authorId) });
    const authorProfile = author
        ? await db.query.newspaperAuthors.findFirst({
            where: and(
                eq(newspaperAuthors.userId, author.id),
                eq(newspaperAuthors.newspaperId, newspaperId),
            ),
        })
        : null;

    const [likesResult] = await db
        .select({ count: count() })
        .from(likes)
        .where(eq(likes.articleId, article.id));

    const likedByMe = !!(await db.query.likes.findFirst({
        where: and(eq(likes.userId, user.id), eq(likes.articleId, article.id)),
    }));

    const articleComments = await db.query.comments.findMany({
        where: eq(comments.articleId, article.id),
        with: { user: true },
        orderBy: [desc(comments.createdAt)],
    });

    return {
        id: article.id,
        title: article.title,
        perex: article.perex,
        content: article.content,
        publication_date: article.publicationDate,
        category: (article as any).category?.categoryName ?? null,
        category_slug: (article as any).category?.slug ?? null,
        keywords: article.keywords
            ? article.keywords.split(",").map((k: string) => k.trim())
            : [],
        likes_count: Number(likesResult!.count),
        liked_by_me: likedByMe,
        author: author
            ? {
                id: author.id,
                full_name: author.fullname,
                profile_picture: authorProfile?.profilePictureUrl ?? null,
            }
            : null,
        images: (article as any).images?.map((i: any) => ({
            url: i.url,
            caption: i.caption,
            is_primary: i.isPrimary,
        })),
        comments: articleComments.map((c: any) => ({
            id: c.id,
            content: c.content,
            created_at: c.createdAt,
            author: { id: c.user?.id, username: c.user?.username },
        })),
    };
}

export async function createArticle(
    newspaperId: string,
    user: AuthUser | null,
    roles: Roles,
    body: Static<typeof createArticleBody>,
) {
    if (!user) throw new UnauthorizedError();
    if (!roles.includes("AUTHOR")) throw new ForbiddenError();
    if (user.newspaperId !== newspaperId) throw new ForbiddenError();

    const newspaper = await db.query.newspapers.findFirst({
        where: eq(newspapers.id, newspaperId),
    });
    if (!newspaper) throw new NotFoundError("NEWSPAPER_NOT_FOUND");

    const { title, perex, content, category_id, keywords } = body;

    if (category_id) {
        const cat = await db.query.articleCategory.findFirst({
            where: eq(articleCategory.id, category_id),
        });
        if (!cat) throw new NotFoundError("CATEGORY_NOT_FOUND");
    }

    const [article] = await db
        .insert(articles)
        .values({
            title,
            perex,
            content,
            categoryId: category_id ?? null,
            keywords: Array.isArray(keywords) ? keywords.join(", ") : (keywords ?? null),
            authorId: user.id,
            newspaperId,
            state: "DRAFT",
        })
        .returning();

    const cat = category_id
        ? await db.query.articleCategory.findFirst({
            where: eq(articleCategory.id, category_id),
        })
        : null;

    await audit({ userId: user.id, operationType: "ARTICLE_CREATED", targetObjectId: article!.id, result: "SUCCESS" });
    logger.info("Article created", { articleId: article!.id, authorId: user.id, newspaperId });

    return {
        id: article!.id,
        title: article!.title,
        perex: article!.perex,
        content: article!.content,
        category: cat?.categoryName ?? null,
        keywords: article!.keywords
            ? article!.keywords.split(",").map((k: string) => k.trim())
            : [],
        status: article!.state,
        created_at: article!.createdAt,
    };
}

export async function updateArticle(
    newspaperId: string,
    articleId: string,
    user: AuthUser | null,
    roles: Roles,
    body: Static<typeof updateArticleBody>,
) {
    if (!user) throw new UnauthorizedError();
    if (!roles.includes("AUTHOR")) throw new ForbiddenError();

    const article = await db.query.articles.findFirst({
        where: and(
            eq(articles.id, articleId),
            eq(articles.newspaperId, newspaperId),
        ),
    });
    if (!article) throw new NotFoundError("ARTICLE_NOT_FOUND");

    if (article.authorId !== user.id) throw new ForbiddenError();
    if (article.state !== "DRAFT") throw new ForbiddenError();

    const { title, perex, content, category_id, keywords } = body;

    const updateData: Partial<typeof articles.$inferInsert> = {};
    if (title !== undefined) updateData.title = title;
    if (perex !== undefined) updateData.perex = perex;
    if (content !== undefined) updateData.content = content;
    if (category_id !== undefined) updateData.categoryId = category_id;
    if (keywords !== undefined)
        updateData.keywords = Array.isArray(keywords) ? keywords.join(", ") : keywords;

    if (Object.keys(updateData).length > 0) {
        await db.update(articles).set(updateData).where(eq(articles.id, articleId));
    }

    const updated = await db.query.articles.findFirst({
        where: eq(articles.id, articleId),
        with: { category: true },
    });

    await audit({ userId: user.id, operationType: "ARTICLE_UPDATED", targetObjectId: articleId, result: "SUCCESS" });
    logger.info("Article updated", { articleId, authorId: user.id });

    return {
        id: updated!.id,
        title: updated!.title,
        perex: updated!.perex,
        content: updated!.content,
        category: (updated as any).category?.categoryName ?? null,
        keywords: updated!.keywords
            ? updated!.keywords.split(",").map((k: string) => k.trim())
            : [],
        status: updated!.state,
        updated_at: updated!.createdAt,
    };
}

export async function deleteArticle(
    newspaperId: string,
    articleId: string,
    user: AuthUser | null,
    roles: Roles,
) {
    if (!user) throw new UnauthorizedError();

    const article = await db.query.articles.findFirst({
        where: and(
            eq(articles.id, articleId),
            eq(articles.newspaperId, newspaperId),
        ),
    });
    if (!article) throw new NotFoundError("ARTICLE_NOT_FOUND");

    const isOwner = article.authorId === user.id && roles.includes("AUTHOR");
    const isAdmin = roles.includes("SYSTEM_ADMINISTRATOR");
    if (!isOwner && !isAdmin) throw new ForbiddenError();

    await db.delete(articles).where(eq(articles.id, articleId));

    await audit({ userId: user.id, operationType: "ARTICLE_DELETED", targetObjectId: articleId, result: "SUCCESS" });
    logger.info("Article deleted", { articleId, deletedBy: user.id });
}

export async function submitArticle(
    newspaperId: string,
    articleId: string,
    user: AuthUser | null,
    roles: Roles,
) {
    if (!user) throw new UnauthorizedError();
    if (!roles.includes("AUTHOR")) throw new ForbiddenError();

    const article = await db.query.articles.findFirst({
        where: and(
            eq(articles.id, articleId),
            eq(articles.newspaperId, newspaperId),
        ),
    });
    if (!article) throw new NotFoundError("ARTICLE_NOT_FOUND");
    if (article.authorId !== user.id) throw new ForbiddenError();
    if (article.state !== "DRAFT") throw new ForbiddenError();

    const authorProfile = user.newspaperId
        ? await db.query.newspaperAuthors.findFirst({
            where: and(
                eq(newspaperAuthors.userId, user.id),
                eq(newspaperAuthors.newspaperId, user.newspaperId),
            ),
        })
        : null;

    if (!authorProfile?.biography || !authorProfile?.profilePictureUrl) {
        throw new UnprocessableError("AUTHOR_PROFILE_INCOMPLETE");
    }

    await db.query.articleImages.findMany({
        where: eq(articleImages.articleId, article.id),
    });

    await db
        .update(articles)
        .set({ state: "SUBMITTED" })
        .where(eq(articles.id, article.id));

    await audit({ userId: user.id, operationType: "ARTICLE_SUBMITTED", targetObjectId: article.id, result: "SUCCESS" });
    logger.info("Article submitted for review", { articleId: article.id, authorId: user.id });

    return { id: article.id, status: "SUBMITTED" };
}

// `request` is passed in to parse the multipart/JSON body — transport I/O the
// handler tightly couples with validation/upload error shaping.
export async function uploadArticleImage(
    newspaperId: string,
    articleId: string,
    user: AuthUser | null,
    roles: Roles,
    request: Request,
) {
    if (!user) throw new UnauthorizedError();
    if (!roles.includes("AUTHOR")) throw new ForbiddenError();

    const article = await db.query.articles.findFirst({
        where: and(
            eq(articles.id, articleId),
            eq(articles.newspaperId, newspaperId),
        ),
    });
    if (!article) throw new NotFoundError("ARTICLE_NOT_FOUND");
    if (article.authorId !== user.id) throw new ForbiddenError();

    let imageUrl: string;
    let caption: string | null = null;

    try {
        const contentType = request.headers.get("content-type") ?? "";
        if (contentType.includes("multipart/form-data")) {
            const formData = await request.formData();
            const file = formData.get("image");
            caption = (formData.get("caption") as string) ?? null;

            if (!file || typeof file === "string") {
                throw new UnprocessableError("VALIDATION_ERROR", {
                    fields: { image: "Must be a JPEG or PNG image under 10 MB" },
                });
            }
            const blob = file as Blob;
            if (!["image/jpeg", "image/png"].includes(blob.type)) {
                throw new UnprocessableError("VALIDATION_ERROR", {
                    fields: { image: "Must be a JPEG or PNG image under 10 MB" },
                });
            }
            if (blob.size > 10 * 1024 * 1024) {
                throw new UnprocessableError("VALIDATION_ERROR", {
                    fields: { image: "Must be a JPEG or PNG image under 10 MB" },
                });
            }
            const buffer = Buffer.from(await blob.arrayBuffer());
            imageUrl = await uploadImage(buffer, blob.type, "articles");
        } else {
            const bodyJson = (await request.json()) as { url: string; caption?: string | null };
            imageUrl = bodyJson.url;
            caption = bodyJson.caption ?? null;
        }
    } catch {
        throw new UnprocessableError("VALIDATION_ERROR", { fields: { image: "Invalid file" } });
    }

    const existingImages = await db.query.articleImages.findMany({
        where: eq(articleImages.articleId, article.id),
    });
    const isPrimary = existingImages.length === 0;

    const [image] = await db
        .insert(articleImages)
        .values({ articleId: article.id, url: imageUrl, caption, isPrimary })
        .returning();

    await audit({ userId: user.id, operationType: "ARTICLE_IMAGE_UPLOADED", targetObjectId: article.id, result: "SUCCESS" });
    logger.info("Article image uploaded", { imageId: image!.id, articleId: article.id, uploadedBy: user.id });

    return { id: image!.id, url: image!.url, caption: image!.caption, is_primary: image!.isPrimary };
}

export async function deleteArticleImage(
    newspaperId: string,
    articleId: string,
    imageId: string,
    user: AuthUser | null,
    roles: Roles,
) {
    if (!user) throw new UnauthorizedError();
    if (!roles.includes("AUTHOR")) throw new ForbiddenError();

    const article = await db.query.articles.findFirst({
        where: and(
            eq(articles.id, articleId),
            eq(articles.newspaperId, newspaperId),
        ),
    });
    if (!article) throw new NotFoundError("ARTICLE_NOT_FOUND");
    if (article.authorId !== user.id) throw new ForbiddenError();

    const image = await db.query.articleImages.findFirst({
        where: eq(articleImages.id, imageId),
    });
    if (!image) throw new NotFoundError("IMAGE_NOT_FOUND");

    const allImages = await db.query.articleImages.findMany({
        where: eq(articleImages.articleId, article.id),
    });
    if (allImages.length === 1) {
        throw new UnprocessableError("ARTICLE_MUST_HAVE_ONE_IMAGE");
    }

    await db.delete(articleImages).where(eq(articleImages.id, imageId));

    if (image.isPrimary) {
        const remaining = allImages.filter((i: any) => i.id !== imageId);
        if (remaining[0]) {
            await db
                .update(articleImages)
                .set({ isPrimary: true })
                .where(eq(articleImages.id, remaining[0].id));
        }
    }

    await deleteImage(image.url).catch(() => { });

    await audit({ userId: user.id, operationType: "ARTICLE_IMAGE_DELETED", targetObjectId: imageId, result: "SUCCESS" });
    logger.info("Article image deleted", { imageId, articleId, deletedBy: user.id });
}

export async function assignEditor(
    newspaperId: string,
    articleId: string,
    user: AuthUser | null,
    roles: Roles,
    body: Static<typeof assignEditorBody>,
) {
    if (!user) throw new UnauthorizedError();
    if (!roles.includes("NEWSPAPER_MANAGER")) throw new ForbiddenError();

    const article = await db.query.articles.findFirst({
        where: and(
            eq(articles.id, articleId),
            eq(articles.newspaperId, newspaperId),
        ),
    });
    if (!article) throw new NotFoundError("ARTICLE_NOT_FOUND");
    if (article.state !== "SUBMITTED") {
        throw new UnprocessableError("INVALID_ARTICLE_STATE");
    }

    const { editor_id } = body;

    const editorRole = await db.query.userRoles.findFirst({
        where: and(
            eq(userRoles.userId, editor_id),
            eq(userRoles.newspaperId, newspaperId),
            eq(userRoles.role, "EDITOR"),
        ),
    });
    if (!editorRole) {
        throw new UnprocessableError("INVALID_ARTICLE_STATE");
    }

    await db
        .update(articles)
        .set({ state: "IN_REVIEW" })
        .where(eq(articles.id, article.id));

    await db.insert(articleReviews).values({
        articleId: article.id,
        reviewerId: editor_id,
        decision: null,
        feedback: null,
    });

    const editor = await db.query.users.findFirst({ where: eq(users.id, editor_id) });

    await audit({ userId: user.id, operationType: "ARTICLE_EDITOR_ASSIGNED", targetObjectId: article.id, result: "SUCCESS" });
    logger.info("Editor assigned to article", { articleId: article.id, editorId: editor_id, managerId: user.id });

    return {
        id: article.id,
        status: "IN_REVIEW",
        assigned_editor: { id: editor!.id, full_name: editor!.fullname },
    };
}

export async function reviewArticle(
    newspaperId: string,
    articleId: string,
    user: AuthUser | null,
    roles: Roles,
    body: Static<typeof reviewBody>,
) {
    if (!user) throw new UnauthorizedError();
    if (!roles.includes("EDITOR")) throw new ForbiddenError();

    const article = await db.query.articles.findFirst({
        where: and(
            eq(articles.id, articleId),
            eq(articles.newspaperId, newspaperId),
        ),
    });
    if (!article) throw new NotFoundError("ARTICLE_NOT_FOUND");
    if (article.state !== "IN_REVIEW") {
        throw new UnprocessableError("INVALID_ARTICLE_STATE");
    }

    const { decision, note } = body;

    const stateMap: Record<string, string> = {
        APPROVE: "APPROVED_BY_EDITOR",
        REJECT: "REJECTED",
        REQUEST_REVISION: "DRAFT",
    };
    const newState = stateMap[decision]!;

    await db.update(articles).set({ state: newState as any }).where(eq(articles.id, article.id));
    await db.insert(articleReviews).values({
        articleId: article.id,
        reviewerId: user.id,
        decision:
            decision === "APPROVE"
                ? "APPROVED"
                : decision === "REJECT"
                    ? "REJECTED"
                    : "REVISION_REQUESTED",
        feedback: note ?? null,
    });

    await audit({ userId: user.id, operationType: "ARTICLE_REVIEWED", targetObjectId: article.id, result: "SUCCESS" });
    logger.info("Article reviewed", { articleId: article.id, reviewerId: user.id, decision, newState });

    return { id: article.id, status: newState, note: note ?? null };
}

export async function approveArticle(
    newspaperId: string,
    articleId: string,
    user: AuthUser | null,
    roles: Roles,
    body: Static<typeof reviewBody>,
    query: Static<typeof articleApproveQuery>,
) {
    if (!user) throw new UnauthorizedError();
    const isManager = roles.includes("NEWSPAPER_MANAGER");
    const isDirector = roles.includes("DIRECTOR");
    if (!isManager && !isDirector) throw new ForbiddenError();

    const { view } = query;
    let effectiveRole: string;
    if (view) {
        if (!roles.includes(view)) throw new ForbiddenError();
        effectiveRole = view;
    } else {
        if (isDirector) effectiveRole = "DIRECTOR";
        else effectiveRole = "NEWSPAPER_MANAGER";
    }

    const article = await db.query.articles.findFirst({
        where: and(
            eq(articles.id, articleId),
            eq(articles.newspaperId, newspaperId),
        ),
    });
    if (!article) throw new NotFoundError("ARTICLE_NOT_FOUND");

    const { decision, note } = body;

    let expectedState: string;
    let nextState: string;

    if (effectiveRole === "DIRECTOR") {
        expectedState = "APPROVED_BY_MANAGER";
        nextState =
            decision === "APPROVE"
                ? "APPROVED_BY_DIRECTOR"
                : decision === "REJECT"
                    ? "REJECTED"
                    : "DRAFT";
    } else {
        expectedState = "APPROVED_BY_EDITOR";
        nextState =
            decision === "APPROVE"
                ? "APPROVED_BY_MANAGER"
                : decision === "REJECT"
                    ? "REJECTED"
                    : "DRAFT";
    }

    if (article.state !== expectedState) {
        throw new UnprocessableError("INVALID_ARTICLE_STATE");
    }

    await db
        .update(articles)
        .set({ state: nextState as any })
        .where(eq(articles.id, article.id));

    await db.insert(articleReviews).values({
        articleId: article.id,
        reviewerId: user.id,
        decision:
            decision === "APPROVE"
                ? "APPROVED"
                : decision === "REJECT"
                    ? "REJECTED"
                    : "REVISION_REQUESTED",
        feedback: note ?? null,
    });

    await audit({ userId: user.id, operationType: decision === "APPROVE" ? "ARTICLE_APPROVED" : "ARTICLE_REJECTED", targetObjectId: article.id, result: "SUCCESS" });
    logger.info("Article approval decision", { articleId: article.id, decidedBy: user.id, decision, nextState });

    return { id: article.id, status: nextState };
}

export async function scheduleArticle(
    newspaperId: string,
    articleId: string,
    user: AuthUser | null,
    roles: Roles,
    body: Static<typeof scheduleBody>,
) {
    if (!user) throw new UnauthorizedError();
    if (!roles.includes("NEWSPAPER_MANAGER") && !roles.includes("DIRECTOR")) throw new ForbiddenError();

    const article = await db.query.articles.findFirst({
        where: and(
            eq(articles.id, articleId),
            eq(articles.newspaperId, newspaperId),
        ),
    });
    if (!article) throw new NotFoundError("ARTICLE_NOT_FOUND");

    if (article.state !== "APPROVED_BY_DIRECTOR") {
        throw new UnprocessableError("INVALID_PUBLICATION_DATE");
    }

    const pubDate = new Date(body.publication_date);
    if (pubDate <= new Date()) {
        throw new UnprocessableError("INVALID_PUBLICATION_DATE");
    }

    await db
        .update(articles)
        .set({ publicationDate: pubDate })
        .where(eq(articles.id, article.id));

    await audit({ userId: user.id, operationType: "ARTICLE_SCHEDULED", targetObjectId: article.id, result: "SUCCESS" });
    logger.info("Article scheduled", { articleId: article.id, scheduledBy: user.id, publicationDate: pubDate });

    return {
        id: article.id,
        status: article.state,
        publication_date: pubDate.toISOString(),
    };
}

export async function publishArticle(
    newspaperId: string,
    articleId: string,
    user: AuthUser | null,
    roles: Roles,
) {
    if (!user) throw new UnauthorizedError();
    if (!roles.includes("DIRECTOR") && !roles.includes("NEWSPAPER_MANAGER")) throw new ForbiddenError();

    const article = await db.query.articles.findFirst({
        where: and(
            eq(articles.id, articleId),
            eq(articles.newspaperId, newspaperId),
        ),
    });
    if (!article) throw new NotFoundError("ARTICLE_NOT_FOUND");

    if (article.state !== "APPROVED_BY_DIRECTOR") {
        throw new UnprocessableError("INVALID_ARTICLE_STATE");
    }

    const now = new Date();
    await db
        .update(articles)
        .set({ state: "PUBLISHED" as any, publicationDate: now })
        .where(eq(articles.id, article.id));

    return {
        id: article.id,
        status: "PUBLISHED",
        publication_date: now.toISOString(),
    };
}
