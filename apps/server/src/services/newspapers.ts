import { db } from "../db";
import { newspapers, users, userRoles } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../utils/logger";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "../errors";
import type { AuthUser, Roles } from "./context";

export async function listNewspapers(user: AuthUser | null, roles: Roles) {
    if (!user) {
        logger.warn("Fetch newspapers failed: unauthorized", {});
        throw new UnauthorizedError("UNAUTHORIZED");
    }

    if (!roles.includes("DIRECTOR") && !roles.includes("SYSTEM_ADMINISTRATOR")) {
        logger.warn("Fetch newspapers failed: forbidden", { userId: user.id, roles });
        throw new ForbiddenError("FORBIDDEN");
    }

    const result = await db.select().from(newspapers);

    logger.info("Newspapers list fetched", { userId: user.id, roles, count: result.length });

    return {
        data: result.map(n => ({ id: n.id, name: n.name, slug: n.slug })),
    };
}

export async function getNewspaperBySlug(slug: string) {
    const newspaper = await db.query.newspapers.findFirst({
        where: eq(newspapers.slug, slug),
    });

    if (!newspaper) {
        logger.warn("Newspaper fetch failed: not found", { slug });
        throw new NotFoundError("NEWSPAPER_NOT_FOUND");
    }

    return { id: newspaper.id, name: newspaper.name, slug: newspaper.slug };
}

export async function getNewspaperById(newspaperId: string) {
    const newspaper = await db.query.newspapers.findFirst({
        where: eq(newspapers.id, newspaperId),
    });

    if (!newspaper) throw new NotFoundError("NEWSPAPER_NOT_FOUND");

    return { id: newspaper.id, name: newspaper.name, slug: newspaper.slug };
}

export async function getEditors(newspaperId: string, user: AuthUser | null, roles: Roles) {
    if (!user) throw new UnauthorizedError("UNAUTHORIZED");
    if (!roles.includes("NEWSPAPER_MANAGER")) throw new ForbiddenError("FORBIDDEN");

    const newspaper = await db.query.newspapers.findFirst({
        where: eq(newspapers.id, newspaperId),
    });
    if (!newspaper) throw new NotFoundError("NEWSPAPER_NOT_FOUND");

    const editorRoles = await db.query.userRoles.findMany({
        where: and(
            eq(userRoles.newspaperId, newspaperId),
            eq(userRoles.role, "EDITOR"),
        ),
    });

    const editors = await Promise.all(
        editorRoles.map(async (r) => {
            const u = r.userId
                ? await db.query.users.findFirst({ where: eq(users.id, r.userId) })
                : null;
            return u ? { id: u.id, full_name: u.fullname ?? u.username } : null;
        }),
    );

    return { data: editors.filter(Boolean) };
}
