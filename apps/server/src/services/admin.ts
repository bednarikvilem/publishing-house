import { db } from "../db";
import { users, userRoles, globalRoles, newspapers, articles } from "../db/schema";
import { eq, and, isNull } from "drizzle-orm";
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
import type {
    adminUsersListQuery,
    assignRoleBody,
    assignGlobalRoleBody,
    adminConfigBody,
} from "../schemas/admin";
import type { createGlobalUserInput } from "../schemas/auth";
import type { NewspaperRoleEnum, GlobalRoleEnum } from "../schemas/shared";

// In-memory system config (in production this would be persisted to DB or env)
let systemConfig = {
    email: {
        smtp_host: process.env.SMTP_HOST ?? "smtp.example.com",
        smtp_port: parseInt(process.env.SMTP_PORT ?? "587"),
        sender_address: process.env.SMTP_FROM ?? "no-reply@example.com",
    },
    security: {
        jwt_expiry_hours: 24,
        password_reset_token_expiry_minutes: 60,
        verification_token_expiry_hours: 48,
        max_login_attempts: 5,
    },
    uploads: {
        max_image_size_mb: 10,
        allowed_image_types: ["image/jpeg", "image/png"],
    },
};

function requireSystemAdmin(user: AuthUser | null, roles: Roles) {
    if (!user) {
        logger.warn("Admin action failed: unauthorized", {});
        throw new UnauthorizedError("UNAUTHORIZED");
    }
    if (!roles.includes("SYSTEM_ADMINISTRATOR")) {
        logger.warn("Admin action failed: forbidden", { userId: user.id, roles });
        throw new ForbiddenError("FORBIDDEN");
    }
}

export async function listNewspaperUsers(
    newspaperId: string,
    user: AuthUser | null,
    roles: Roles,
    query: Static<typeof adminUsersListQuery>,
) {
    requireSystemAdmin(user, roles);

    const newspaper = await db.query.newspapers.findFirst({
        where: eq(newspapers.id, newspaperId),
    });
    if (!newspaper) {
        logger.warn("Admin action failed: newspaper not found", { newspaperId });
        throw new NotFoundError("NEWSPAPER_NOT_FOUND");
    }

    const { page, limit } = query;
    const offset = (page - 1) * limit;

    const allUsers = await db.query.users.findMany({
        where: eq(users.newspaperId, newspaperId),
    });

    const total = allUsers.length;
    const paged = allUsers.slice(offset, offset + limit);

    const result = await Promise.all(
        paged.map(async (u) => {
            const userRolesList = await db.query.userRoles.findMany({
                where: and(
                    eq(userRoles.userId, u.id),
                    eq(userRoles.newspaperId, newspaperId),
                ),
            });
            const globalRolesList = await db.query.globalRoles.findMany({
                where: eq(globalRoles.userId, u.id),
            });
            return {
                id: u.id,
                email: u.email,
                username: u.username,
                full_name: u.fullname,
                roles: [
                    ...userRolesList.map((r) => r.role),
                    ...globalRolesList.map((r) => r.role),
                ],
                email_verified: u.email_verified,
            };
        }),
    );

    logger.info("Admin fetched users", {
        userId: user!.id,
        newspaperId,
        page,
        limit,
        resultCount: result.length,
    });

    return {
        data: result,
        pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };
}

export async function assignRole(
    newspaperId: string,
    userId: string,
    user: AuthUser | null,
    roles: Roles,
    body: Static<typeof assignRoleBody>,
) {
    requireSystemAdmin(user, roles);

    const { role } = body;

    const targetUser = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!targetUser) {
        logger.warn("Role assignment failed: user not found", { targetUserId: userId });
        throw new NotFoundError("USER_NOT_FOUND");
    }
    if (targetUser.newspaperId !== newspaperId) {
        logger.warn("Role assignment failed: cross-newspaper access", {
            targetUserId: userId,
            targetNewspaperId: targetUser.newspaperId,
            requestedNewspaperId: newspaperId,
        });
        throw new ForbiddenError("FORBIDDEN");
    }

    const existing = await db.query.userRoles.findFirst({
        where: and(
            eq(userRoles.userId, userId),
            eq(userRoles.newspaperId, newspaperId),
            eq(userRoles.role, role),
        ),
    });
    if (existing) {
        logger.warn("Role assignment failed: already assigned", {
            targetUserId: userId,
            role,
            newspaperId,
        });
        throw new ConflictError("ROLE_ALREADY_ASSIGNED");
    }

    if (role === "NEWSPAPER_MANAGER") {
        const currentManager = await db.query.userRoles.findFirst({
            where: and(
                eq(userRoles.newspaperId, newspaperId),
                eq(userRoles.role, "NEWSPAPER_MANAGER"),
            ),
        });
        if (currentManager) throw new ConflictError("MANAGER_ALREADY_EXISTS");
    }

    await db.insert(userRoles).values({
        userId,
        newspaperId,
        role,
    });

    const allRoles = await db.query.userRoles.findMany({
        where: and(
            eq(userRoles.userId, userId),
            eq(userRoles.newspaperId, newspaperId),
        ),
    });

    await audit({ userId: user!.id, operationType: "ROLE_ASSIGNED", targetObjectId: userId, result: "SUCCESS" });
    logger.info("Role assigned", { assignedBy: user!.id, targetUserId: userId, role, newspaperId });

    return {
        user_id: userId,
        roles: allRoles.map((r) => r.role),
    };
}

export async function removeRole(
    newspaperId: string,
    userId: string,
    role: Static<typeof NewspaperRoleEnum>,
    user: AuthUser | null,
    roles: Roles,
) {
    requireSystemAdmin(user, roles);

    if (role === "REGISTERED_USER") {
        logger.warn("Role removal failed: base role protected", { targetUserId: userId });
        throw new UnprocessableError("CANNOT_REMOVE_BASE_ROLE");
    }

    const existing = await db.query.userRoles.findFirst({
        where: and(
            eq(userRoles.userId, userId),
            eq(userRoles.newspaperId, newspaperId),
            eq(userRoles.role, role),
        ),
    });
    if (!existing) {
        logger.warn("Role removal failed: role not found", { targetUserId: userId, role });
        throw new NotFoundError("ROLE_NOT_FOUND");
    }

    await db.delete(userRoles).where(
        and(
            eq(userRoles.userId, userId),
            eq(userRoles.newspaperId, newspaperId),
            eq(userRoles.role, role),
        ),
    );

    const allRoles = await db.query.userRoles.findMany({
        where: and(
            eq(userRoles.userId, userId),
            eq(userRoles.newspaperId, newspaperId),
        ),
    });

    await audit({ userId: user!.id, operationType: "ROLE_REMOVED", targetObjectId: userId, result: "SUCCESS" });
    logger.info("Role removed", { removedBy: user!.id, targetUserId: userId, role });

    return {
        user_id: userId,
        roles: allRoles.map((r) => r.role),
    };
}

export async function getStatistics(
    newspaperId: string,
    user: AuthUser | null,
    roles: Roles,
) {
    if (!user) throw new UnauthorizedError("UNAUTHORIZED");

    const isDirector = roles.includes("DIRECTOR");
    const isManager = roles.includes("NEWSPAPER_MANAGER");

    if (!isManager && !isDirector) {
        throw new ForbiddenError("FORBIDDEN");
    }

    const newspaper = await db.query.newspapers.findFirst({
        where: eq(newspapers.id, newspaperId),
    });

    if (!newspaper) {
        throw new NotFoundError("NOT_FOUND");
    }

    const allArticles = await db.query.articles.findMany({
        where: eq(articles.newspaperId, newspaperId),
        with: { category: true },
    });

    const published = allArticles.filter(a => a.state === "PUBLISHED");
    const drafts = allArticles.filter(a => a.state === "DRAFT");
    const inReview = allArticles.filter(a =>
        ["SUBMITTED", "IN_REVIEW", "APPROVED_BY_EDITOR", "APPROVED_BY_MANAGER"].includes(a.state!),
    );
    const rejected = allArticles.filter(a => a.state === "REJECTED");

    const publishedIds = new Set(published.map(a => a.id));

    const allRoles = await db.query.userRoles.findMany({
        where: and(
            eq(userRoles.newspaperId, newspaperId),
            eq(userRoles.role, "REGISTERED_USER"),
        ),
    });

    const totalSubscribers = allRoles.length;

    const allViews = await db.query.articleViews.findMany();
    const relevantViews = allViews.filter(v => publishedIds.has(v.articleId));

    const totalViews = relevantViews.length;
    const totalReadsCompleted = relevantViews.filter(v => v.readCompleted).length;

    const readThroughRate =
        totalViews > 0
            ? Math.round((totalReadsCompleted / totalViews) * 100)
            : 0;

    const articleViewMap: Record<string, {
        title: string;
        views: number;
        completions: number;
        likes: number;
        comments: number;
    }> = {};

    for (const v of relevantViews) {
        if (!articleViewMap[v.articleId]) {
            const art = published.find(a => a.id === v.articleId);
            articleViewMap[v.articleId] = {
                title: art?.title ?? "Unknown",
                views: 0,
                completions: 0,
                likes: 0,
                comments: 0,
            };
        }
        articleViewMap[v.articleId]!.views += 1;
        if (v.readCompleted) {
            articleViewMap[v.articleId]!.completions += 1;
        }
    }

    const allLikes = await db.query.likes.findMany();
    const allComments = await db.query.comments.findMany();

    for (const l of allLikes) {
        if (articleViewMap[l.articleId]) {
            articleViewMap[l.articleId]!.likes += 1;
        }
    }

    for (const c of allComments) {
        if (articleViewMap[c.articleId]) {
            articleViewMap[c.articleId]!.comments += 1;
        }
    }

    const enrichedArticles = Object.entries(articleViewMap).map(
        ([article_id, data]) => ({
            article_id,
            ...data,
            engagement_rate:
                data.views > 0
                    ? Math.round(((data.likes + data.comments) / data.views) * 100)
                    : 0,
        }),
    );

    const top_by_views = [...enrichedArticles]
        .sort((a, b) => b.views - a.views)
        .slice(0, 5);

    const top_by_likes = [...enrichedArticles]
        .sort((a, b) => b.likes - a.likes)
        .slice(0, 5);

    const top_by_comments = [...enrichedArticles]
        .sort((a, b) => b.comments - a.comments)
        .slice(0, 5);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const viewsTimelineMap: Record<string, number> = {};

    for (const v of relevantViews) {
        const day = new Date(v.createdAt ?? Date.now())
            .toISOString()
            .split("T")[0]!;

        viewsTimelineMap[day] = (viewsTimelineMap[day] ?? 0) + 1;
    }

    const views_timeline = Object.entries(viewsTimelineMap)
        .map(([date, view_count]) => ({ date, view_count }))
        .sort((a, b) => a.date.localeCompare(b.date));

    const categoryMap: Record<string, number> = {};
    const authorMap: Record<string, { full_name: string | null; count: number }> = {};

    for (const a of published) {
        const cat = a.category?.categoryName ?? "Uncategorized";
        categoryMap[cat] = (categoryMap[cat] ?? 0) + 1;

        if (!authorMap[a.authorId]) {
            authorMap[a.authorId] = { full_name: null, count: 0 };
        }
        authorMap[a.authorId]!.count += 1;
    }

    const published_by_category = Object.entries(categoryMap).map(
        ([category, count]) => ({ category, count }),
    );

    const published_by_author = Object.entries(authorMap).map(
        ([author_id, data]) => ({
            author_id,
            full_name: data.full_name,
            count: data.count,
        }),
    );

    const editors = {
        performance: [],
    };

    const totalLikes = allLikes.filter(l => publishedIds.has(l.articleId)).length;
    const totalComments = allComments.filter(c => publishedIds.has(c.articleId)).length;

    const engagement_rate =
        totalViews > 0
            ? Math.round(((totalLikes + totalComments) / totalViews) * 100)
            : 0;

    return {
        newspaper_id: newspaperId,

        subscribers: {
            total: totalSubscribers,
        },

        articles: {
            total_published: published.length,
            total_draft: drafts.length,
            total_in_review: inReview.length,
            total_rejected: rejected.length,

            avg_days_to_publish: null,

            published_by_category,
            published_by_author,
        },

        views: {
            total_views: totalViews,
            total_reads_completed: totalReadsCompleted,
            read_through_rate: readThroughRate,

            views_timeline,
            top_by_views,
            top_by_likes,
            top_by_comments,
        },

        engagement: {
            total_likes: totalLikes,
            total_comments: totalComments,
            engagement_rate,
            avg_likes_per_article: published.length ? totalLikes / published.length : 0,
            avg_comments_per_article: published.length ? totalComments / published.length : 0,
        },

        editors,

        publication_timeline: [],
    };
}

export async function listGlobalUsers(user: AuthUser | null, roles: Roles) {
    if (!user) throw new UnauthorizedError("UNAUTHORIZED");
    if (!roles.includes("SYSTEM_ADMINISTRATOR")) throw new ForbiddenError("FORBIDDEN");

    const globalUsersList = await db
        .select()
        .from(users)
        .where(isNull(users.newspaperId));

    const result = await Promise.all(
        globalUsersList.map(async (u) => {
            const globalRolesList = await db.query.globalRoles.findMany({
                where: eq(globalRoles.userId, u.id),
            });
            return {
                id: u.id,
                email: u.email,
                username: u.username,
                full_name: u.fullname,
                roles: globalRolesList.map(r => r.role),
            };
        }),
    );

    return { data: result };
}

export async function createGlobalUser(
    user: AuthUser | null,
    roles: Roles,
    body: Static<typeof createGlobalUserInput>,
) {
    if (!user) throw new UnauthorizedError("UNAUTHORIZED");
    if (!roles.includes("SYSTEM_ADMINISTRATOR")) throw new ForbiddenError("FORBIDDEN");

    const { email, username, password, full_name, role } = body;

    const currentHolder = await db.query.globalRoles.findFirst({
        where: eq(globalRoles.role, role),
    });
    if (currentHolder) throw new ConflictError("ROLE_ALREADY_HELD_GLOBALLY");

    const [emailExists] = await db
        .select()
        .from(users)
        .where(and(isNull(users.newspaperId), eq(users.email, email)));
    if (emailExists) throw new ConflictError("EMAIL_TAKEN");

    const passwordHash = await Bun.password.hash(password);

    const [createdUser] = await db.insert(users).values({
        email,
        username,
        fullname: full_name,
        passwordHash,
        newspaperId: null,
        email_verified: true,
    }).returning();
    const newUser = createdUser!;

    await db.insert(globalRoles).values({ userId: newUser.id, role });

    return {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        full_name: newUser.fullname,
        role,
    };
}

export async function getConfig(user: AuthUser | null, roles: Roles) {
    requireSystemAdmin(user, roles);

    logger.info("System config fetched", { userId: user!.id });

    return systemConfig;
}

export async function assignGlobalRole(
    userId: string,
    user: AuthUser | null,
    roles: Roles,
    body: Static<typeof assignGlobalRoleBody>,
) {
    if (!user) throw new UnauthorizedError("UNAUTHORIZED");
    if (!roles.includes("SYSTEM_ADMINISTRATOR")) throw new ForbiddenError("FORBIDDEN");

    const { role } = body;

    const targetUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
    });
    if (!targetUser) throw new NotFoundError("USER_NOT_FOUND");

    const currentHolder = await db.query.globalRoles.findFirst({
        where: eq(globalRoles.role, role),
    });
    if (currentHolder && currentHolder.userId === userId) {
        throw new ConflictError("ROLE_ALREADY_ASSIGNED");
    }
    if (currentHolder) throw new ConflictError("ROLE_ALREADY_HELD_GLOBALLY");

    await db.insert(globalRoles).values({ userId, role });

    const allGlobalRoles = await db.query.globalRoles.findMany({
        where: eq(globalRoles.userId, userId),
    });

    return {
        user_id: userId,
        global_roles: allGlobalRoles.map((r) => r.role),
    };
}

export async function removeGlobalRole(
    userId: string,
    role: Static<typeof GlobalRoleEnum>,
    user: AuthUser | null,
    roles: Roles,
) {
    if (!user) throw new UnauthorizedError("UNAUTHORIZED");
    if (!roles.includes("SYSTEM_ADMINISTRATOR")) throw new ForbiddenError("FORBIDDEN");

    if (userId === user.id && role === "SYSTEM_ADMINISTRATOR") {
        throw new UnprocessableError("CANNOT_REMOVE_OWN_ADMIN_ROLE");
    }

    const existing = await db.query.globalRoles.findFirst({
        where: and(
            eq(globalRoles.userId, userId),
            eq(globalRoles.role, role),
        ),
    });
    if (!existing) throw new NotFoundError("ROLE_NOT_FOUND");

    await db.delete(globalRoles).where(
        and(
            eq(globalRoles.userId, userId),
            eq(globalRoles.role, role),
        ),
    );

    const allGlobalRoles = await db.query.globalRoles.findMany({
        where: eq(globalRoles.userId, userId),
    });

    return {
        user_id: userId,
        global_roles: allGlobalRoles.map((r) => r.role),
    };
}

export async function updateConfig(
    user: AuthUser | null,
    roles: Roles,
    body: Static<typeof adminConfigBody>,
) {
    requireSystemAdmin(user, roles);

    if (body.email) {
        systemConfig.email = { ...systemConfig.email, ...body.email };
    }
    if (body.security) {
        systemConfig.security = { ...systemConfig.security, ...body.security };
    }
    if (body.uploads) {
        systemConfig.uploads = { ...systemConfig.uploads, ...body.uploads };
    }

    await audit({ userId: user!.id, operationType: "SYSTEM_CONFIG_UPDATED", result: "SUCCESS" });
    logger.info("System config updated", { updatedBy: user!.id, sections: Object.keys(body) });

    return systemConfig;
}
