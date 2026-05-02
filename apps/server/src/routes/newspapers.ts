import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { db } from "../db";
import { newspapers, users, userRoles } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { newspaperIdParam } from "../schemas/newspapers";
import { logger } from "../utils/logger";

export const newspaperRoutes = new Elysia({ detail: { tags: ["Newspapers"] } })
    .use(authMiddleware)

    // GET /api/newspapers — DIRECTOR only
    .get("/api/newspapers", async ({ user, roles }) => {
        if (!user) {
            logger.warn("Fetch newspapers failed: unauthorized", {});

            return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
        }

        if (!roles.includes("DIRECTOR") && !roles.includes("SYSTEM_ADMINISTRATOR")) {
            logger.warn("Fetch newspapers failed: forbidden", {
                userId: user.id,
                roles,
            });

            return Response.json({ error: "FORBIDDEN" }, { status: 403 });
        }

        const result = await db.select().from(newspapers);

        logger.info("Newspapers list fetched", {
            userId: user.id,
            roles,
            count: result.length,
        });

        return Response.json({
            data: result.map(n => ({
                id: n.id,
                name: n.name,
                slug: n.slug,
            })),
        });
    })

    // GET /api/newspapers/by-slug/:slug — public
    .get("/api/newspapers/by-slug/:slug", async ({ params }: any) => {
        const newspaper = await db.query.newspapers.findFirst({
            where: eq(newspapers.slug, params.slug),
        });

        if (!newspaper) {
            logger.warn("Newspaper fetch failed: not found", {
                slug: params.slug, // or id?
            });

            return Response.json({ error: "NEWSPAPER_NOT_FOUND" }, { status: 404 });
        }

        return Response.json({
            id: newspaper.id,
            name: newspaper.name,
            slug: newspaper.slug,
        });
    })

    // GET /api/newspapers/:newspaper_id — public
    .get("/api/newspapers/:newspaper_id", async ({ params }) => {
        const newspaper = await db.query.newspapers.findFirst({
            where: eq(newspapers.id, params.newspaper_id),
        });

        if (!newspaper) return Response.json({ error: "NEWSPAPER_NOT_FOUND" }, { status: 404 });

        return Response.json({
            id: newspaper.id,
            name: newspaper.name,
            slug: newspaper.slug,
        });
    }, {
		params: newspaperIdParam,
	});
