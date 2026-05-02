import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { db } from "../db";
import { users, userRoles, globalRoles, newspapers, articles } from "../db/schema";
import { eq, and, isNull } from "drizzle-orm";
import {
    adminUsersListParams,
    adminUsersListQuery,
    assignRoleParams,
    assignRoleBody,
    removeRoleParams,
    assignGlobalRoleParams,
    assignGlobalRoleBody,
    removeGlobalRoleParams,
    statisticsParams,
    adminConfigBody,
} from "../schemas/admin";
import { createGlobalUserInput } from "../schemas/auth";

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

export const adminRoutes = new Elysia({ detail: { tags: ["Admin"] } })
    .use(authMiddleware)

    // ── GET /api/newspapers/:newspaper_id/users — SYSTEM_ADMINISTRATOR ────
    .get("/api/newspapers/:newspaper_id/users", async ({ params, user, roles, query }) => {
        if (!user) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
        if (!roles.includes("SYSTEM_ADMINISTRATOR"))
            return Response.json({ error: "FORBIDDEN" }, { status: 403 });

        const newspaper = await db.query.newspapers.findFirst({
            where: eq(newspapers.id, params.newspaper_id),
        });
        if (!newspaper) return Response.json({ error: "NEWSPAPER_NOT_FOUND" }, { status: 404 });

        const { page, limit } = query;
        const offset = (page - 1) * limit;

        const allUsers = await db.query.users.findMany({
            where: eq(users.newspaperId, params.newspaper_id),
        });

        const total = allUsers.length;
        const paged = allUsers.slice(offset, offset + limit);

        const result = await Promise.all(
            paged.map(async (u) => {
                const userRolesList = await db.query.userRoles.findMany({
                    where: and(
                        eq(userRoles.userId, u.id),
                        eq(userRoles.newspaperId, params.newspaper_id)
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
            })
        );

        return Response.json({
            data: result,
            pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
        });
    }, {
        params: adminUsersListParams,
        query: adminUsersListQuery,
    })

    // ── POST /api/newspapers/:newspaper_id/users/:user_id/roles ───────────
    .post(
        "/api/newspapers/:newspaper_id/users/:user_id/roles",
        async ({ params, user, roles, body }) => {
            if (!user) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
            if (!roles.includes("SYSTEM_ADMINISTRATOR"))
                return Response.json({ error: "FORBIDDEN" }, { status: 403 });

            const { role } = body;

            const targetUser = await db.query.users.findFirst({ where: eq(users.id, params.user_id) });
            if (!targetUser) return Response.json({ error: "USER_NOT_FOUND" }, { status: 404 });

            const existing = await db.query.userRoles.findFirst({
                where: and(
                    eq(userRoles.userId, params.user_id),
                    eq(userRoles.newspaperId, params.newspaper_id),
                    eq(userRoles.role, role)
                ),
            });
            if (existing) return Response.json({ error: "ROLE_ALREADY_ASSIGNED" }, { status: 409 });

            if (role === "NEWSPAPER_MANAGER") {
                const currentManager = await db.query.userRoles.findFirst({
                    where: and(
                        eq(userRoles.newspaperId, params.newspaper_id),
                        eq(userRoles.role, "NEWSPAPER_MANAGER")
                    ),
                });
                if (currentManager)
                    return Response.json({ error: "MANAGER_ALREADY_EXISTS" }, { status: 409 });
            }

            await db.insert(userRoles).values({
                userId: params.user_id,
                newspaperId: params.newspaper_id,
                role,
            });

            const allRoles = await db.query.userRoles.findMany({
                where: and(
                    eq(userRoles.userId, params.user_id),
                    eq(userRoles.newspaperId, params.newspaper_id)
                ),
            });

            return Response.json({
                user_id: params.user_id,
                roles: allRoles.map((r) => r.role),
            });
        },
        {
            params: assignRoleParams,
            body: assignRoleBody,
        }
    )

    // ── DELETE /api/newspapers/:newspaper_id/users/:user_id/roles/:role ───
    .delete(
        "/api/newspapers/:newspaper_id/users/:user_id/roles/:role",
        async ({ params, user, roles }) => {
            if (!user) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
            if (!roles.includes("SYSTEM_ADMINISTRATOR"))
                return Response.json({ error: "FORBIDDEN" }, { status: 403 });

            if (params.role === "REGISTERED_USER")
                return Response.json({ error: "CANNOT_REMOVE_BASE_ROLE" }, { status: 422 });

            const existing = await db.query.userRoles.findFirst({
                where: and(
                    eq(userRoles.userId, params.user_id),
                    eq(userRoles.newspaperId, params.newspaper_id),
                    eq(userRoles.role, params.role)
                ),
            });
            if (!existing) return Response.json({ error: "ROLE_NOT_FOUND" }, { status: 404 });

            await db.delete(userRoles).where(
                and(
                    eq(userRoles.userId, params.user_id),
                    eq(userRoles.newspaperId, params.newspaper_id),
                    eq(userRoles.role, params.role)
                )
            );

            const allRoles = await db.query.userRoles.findMany({
                where: and(
                    eq(userRoles.userId, params.user_id),
                    eq(userRoles.newspaperId, params.newspaper_id)
                ),
            });

            return Response.json({
                user_id: params.user_id,
                roles: allRoles.map((r) => r.role),
            });
        },
        {
            params: removeRoleParams,
        }
    )

    // ── GET /api/newspapers/:newspaper_id/statistics ───────────────────────
    .get(
        "/api/newspapers/:newspaper_id/statistics",
        async ({ params, user, roles }) => {
            if (!user) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
            if (!roles.includes("NEWSPAPER_MANAGER") && !roles.includes("DIRECTOR"))
                return Response.json({ error: "FORBIDDEN" }, { status: 403 });

            const newspaper = await db.query.newspapers.findFirst({
                where: eq(newspapers.id, params.newspaper_id),
            });
            if (!newspaper) return Response.json({ error: "NEWSPAPER_NOT_FOUND" }, { status: 404 });

            const allArticles = await db.query.articles.findMany({
                where: eq(articles.newspaperId, params.newspaper_id),
                with: { category: true },
            });

            const published = allArticles.filter((a) => a.state === "PUBLISHED");
            const drafts = allArticles.filter((a) => a.state === "DRAFT");
            const inReview = allArticles.filter((a) =>
                ["SUBMITTED", "IN_REVIEW", "APPROVED_BY_EDITOR", "APPROVED_BY_MANAGER"].includes(a.state)
            );
            const rejected = allArticles.filter((a) => a.state === "REJECTED");

            // Count by category
            const categoryCount: Record<string, number> = {};
            for (const a of published) {
                const cat = (a as any).category?.categoryName ?? "Uncategorized";
                categoryCount[cat] = (categoryCount[cat] ?? 0) + 1;
            }

            // Count by author
            const authorCount: Record<string, number> = {};
            for (const a of published) {
                authorCount[a.authorId] = (authorCount[a.authorId] ?? 0) + 1;
            }

            // Total comments & likes for this newspaper
            const allComments = await db.query.comments.findMany();
            const allLikes = await db.query.likes.findMany();

            const publishedIds = new Set(published.map((a) => a.id));
            const totalComments = allComments.filter((c) => publishedIds.has(c.articleId)).length;
            const totalLikes = allLikes.filter((l) => publishedIds.has(l.articleId)).length;

            return Response.json({
                newspaper_id: params.newspaper_id,
                articles: {
                    total_published: published.length,
                    total_draft: drafts.length,
                    total_in_review: inReview.length,
                    total_rejected: rejected.length,
                    published_by_category: Object.entries(categoryCount).map(([category, c]) => ({
                        category,
                        count: c,
                    })),
                    published_by_author: Object.entries(authorCount).map(([author_id, c]) => ({
                        author_id,
                        count: c,
                    })),
                },
                engagement: {
                    total_comments: totalComments,
                    total_likes: totalLikes,
                },
            });
        },
        {
            params: statisticsParams,
        }
    )

    // ── GET /api/global/users ─────────────────────────────────────────────
    .get("/api/global/users", async ({ user, roles }) => {
        if (!user) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
        if (!roles.includes("SYSTEM_ADMINISTRATOR"))
            return Response.json({ error: "FORBIDDEN" }, { status: 403 });

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
            })
        );

        return Response.json({ data: result });
    })

    // ── POST /api/global/users ────────────────────────────────────────────
    .post("/api/global/users", async ({ user, roles, body }) => {
        if (!user) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
        if (!roles.includes("SYSTEM_ADMINISTRATOR"))
            return Response.json({ error: "FORBIDDEN" }, { status: 403 });

        const { email, username, password, full_name, role } = body;

        const currentHolder = await db.query.globalRoles.findFirst({
            where: eq(globalRoles.role, role),
        });
        if (currentHolder)
            return Response.json({ error: "ROLE_ALREADY_HELD_GLOBALLY" }, { status: 409 });

        const [emailExists] = await db
            .select()
            .from(users)
            .where(and(isNull(users.newspaperId), eq(users.email, email)));
        if (emailExists)
            return Response.json({ error: "EMAIL_TAKEN" }, { status: 409 });

        const passwordHash = await Bun.password.hash(password);

        const [newUser] = await db.insert(users).values({
            email,
            username,
            fullname: full_name,
            passwordHash,
            newspaperId: null,
            email_verified: true,
        }).returning();

        await db.insert(globalRoles).values({ userId: newUser.id, role });

        return Response.json({
            id: newUser.id,
            email: newUser.email,
            username: newUser.username,
            full_name: newUser.fullname,
            role,
        }, { status: 201 });
    }, {
        body: createGlobalUserInput,
    })

    // ── GET /api/admin/config ─────────────────────────────────────────────
    .get("/api/admin/config", async ({ user, roles }) => {
        if (!user) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
        if (!roles.includes("SYSTEM_ADMINISTRATOR"))
            return Response.json({ error: "FORBIDDEN" }, { status: 403 });

        return Response.json(systemConfig);
    })

    // ── POST /api/users/:user_id/global-roles ─────────────────────────────
    .post(
        "/api/users/:user_id/global-roles",
        async ({ params, user, roles, body }) => {
            if (!user) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
            if (!roles.includes("SYSTEM_ADMINISTRATOR"))
                return Response.json({ error: "FORBIDDEN" }, { status: 403 });

            const { role } = body;

            const targetUser = await db.query.users.findFirst({
                where: eq(users.id, params.user_id),
            });
            if (!targetUser) return Response.json({ error: "USER_NOT_FOUND" }, { status: 404 });

            const currentHolder = await db.query.globalRoles.findFirst({
                where: eq(globalRoles.role, role),
            });
            if (currentHolder && currentHolder.userId === params.user_id)
                return Response.json({ error: "ROLE_ALREADY_ASSIGNED" }, { status: 409 });
            if (currentHolder)
                return Response.json({ error: "ROLE_ALREADY_HELD_GLOBALLY" }, { status: 409 });

            await db.insert(globalRoles).values({ userId: params.user_id, role });

            const allGlobalRoles = await db.query.globalRoles.findMany({
                where: eq(globalRoles.userId, params.user_id),
            });

            return Response.json({
                user_id: params.user_id,
                global_roles: allGlobalRoles.map((r) => r.role),
            });
        },
        {
            params: assignGlobalRoleParams,
            body: assignGlobalRoleBody,
        }
    )

    // ── DELETE /api/users/:user_id/global-roles/:role ─────────────────────
    .delete(
        "/api/users/:user_id/global-roles/:role",
        async ({ params, user, roles }) => {
            if (!user) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
            if (!roles.includes("SYSTEM_ADMINISTRATOR"))
                return Response.json({ error: "FORBIDDEN" }, { status: 403 });

            if (params.user_id === user.id && params.role === "SYSTEM_ADMINISTRATOR")
                return Response.json({ error: "CANNOT_REMOVE_OWN_ADMIN_ROLE" }, { status: 422 });

            const existing = await db.query.globalRoles.findFirst({
                where: and(
                    eq(globalRoles.userId, params.user_id),
                    eq(globalRoles.role, params.role)
                ),
            });
            if (!existing) return Response.json({ error: "ROLE_NOT_FOUND" }, { status: 404 });

            await db.delete(globalRoles).where(
                and(
                    eq(globalRoles.userId, params.user_id),
                    eq(globalRoles.role, params.role)
                )
            );

            const allGlobalRoles = await db.query.globalRoles.findMany({
                where: eq(globalRoles.userId, params.user_id),
            });

            return Response.json({
                user_id: params.user_id,
                global_roles: allGlobalRoles.map((r) => r.role),
            });
        },
        {
            params: removeGlobalRoleParams,
        }
    )

    // ── PUT /api/admin/config ─────────────────────────────────────────────
    .put("/api/admin/config", async ({ user, roles, body }) => {
        if (!user) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
        if (!roles.includes("SYSTEM_ADMINISTRATOR"))
            return Response.json({ error: "FORBIDDEN" }, { status: 403 });

        if (body.email) {
            systemConfig.email = { ...systemConfig.email, ...body.email };
        }
        if (body.security) {
            systemConfig.security = { ...systemConfig.security, ...body.security };
        }
        if (body.uploads) {
            systemConfig.uploads = { ...systemConfig.uploads, ...body.uploads };
        }

        return Response.json(systemConfig);
    }, {
        body: adminConfigBody,
    });
