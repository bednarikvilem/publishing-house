import { newspapers, users, userRoles } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../utils/logger";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "../errors";
import { type NewspaperColor } from "../schemas/newspapers";
import type { AuthUser, Roles } from "./context";
import type { Tx } from "../db/rls";

function serializeNewspaper(n: { id: string; name: string; slug: string; primaryColor: string | null }) {
    return { id: n.id, name: n.name, slug: n.slug, primary_color: n.primaryColor ?? null };
}

export async function listNewspapers(tx: Tx, user: AuthUser | null, roles: Roles) {
    if (!user) {
        logger.warn("Fetch newspapers failed: unauthorized", {});
        throw new UnauthorizedError("UNAUTHORIZED");
    }

    if (!roles.includes("DIRECTOR") && !roles.includes("SYSTEM_ADMINISTRATOR")) {
        logger.warn("Fetch newspapers failed: forbidden", { userId: user.id, roles });
        throw new ForbiddenError("FORBIDDEN");
    }

    const result = await tx.select().from(newspapers);

    logger.info("Newspapers list fetched", { userId: user.id, roles, count: result.length });

    return { data: result.map(serializeNewspaper) };
}

export async function getNewspaperBySlug(tx: Tx, slug: string) {
    const newspaper = await tx.query.newspapers.findFirst({
        where: eq(newspapers.slug, slug),
    });

    if (!newspaper) {
        logger.warn("Newspaper fetch failed: not found", { slug });
        throw new NotFoundError("NEWSPAPER_NOT_FOUND");
    }

    return serializeNewspaper(newspaper);
}

export async function getNewspaperById(tx: Tx, newspaperId: string) {
    const newspaper = await tx.query.newspapers.findFirst({
        where: eq(newspapers.id, newspaperId),
    });

    if (!newspaper) throw new NotFoundError("NEWSPAPER_NOT_FOUND");

    return serializeNewspaper(newspaper);
}

export async function updateNewspaperColor(
    tx: Tx,
    newspaperId: string,
    color: NewspaperColor | null,
    user: AuthUser | null,
    roles: Roles,
) {
    if (!user) throw new UnauthorizedError("UNAUTHORIZED");
    if (!roles.includes("DIRECTOR") && !roles.includes("SYSTEM_ADMINISTRATOR")) {
        throw new ForbiddenError("FORBIDDEN");
    }

    const newspaper = await tx.query.newspapers.findFirst({
        where: eq(newspapers.id, newspaperId),
    });
    if (!newspaper) throw new NotFoundError("NEWSPAPER_NOT_FOUND");

    await tx.update(newspapers)
        .set({ primaryColor: color })
        .where(eq(newspapers.id, newspaperId));

    logger.info("Newspaper color updated", { userId: user.id, newspaperId, color });

    return serializeNewspaper({ ...newspaper, primaryColor: color });
}

export async function getEditors(tx: Tx, newspaperId: string, user: AuthUser | null, roles: Roles) {
    if (!user) throw new UnauthorizedError("UNAUTHORIZED");
    if (!roles.includes("NEWSPAPER_MANAGER")) throw new ForbiddenError("FORBIDDEN");

    const newspaper = await tx.query.newspapers.findFirst({
        where: eq(newspapers.id, newspaperId),
    });
    if (!newspaper) throw new NotFoundError("NEWSPAPER_NOT_FOUND");

    const editorRoles = await tx.query.userRoles.findMany({
        where: and(
            eq(userRoles.newspaperId, newspaperId),
            eq(userRoles.role, "EDITOR"),
        ),
    });

    const editors = await Promise.all(
        editorRoles.map(async (r) => {
            const u = r.userId
                ? await tx.query.users.findFirst({ where: eq(users.id, r.userId) })
                : null;
            return u ? { id: u.id, full_name: u.fullname ?? u.username } : null;
        }),
    );

    return { data: editors.filter(Boolean) };
}
