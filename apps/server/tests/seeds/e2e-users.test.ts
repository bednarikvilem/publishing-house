import { describe, test, expect, beforeAll } from "bun:test";
import { db } from "../../src/db/index";
import * as schema from "../../src/db/schema";
import { eq, and } from "drizzle-orm";

const NEWSPAPER_NAME = "ClaudeDaily";
const JAN_EMAIL = "jan.novak@claudedaily.cz";
const DIRECTOR_EMAIL = "director@claudedaily.cz";

let newspaperId: string;

beforeAll(async () => {
    const newspaper = await db.query.newspapers.findFirst({
        where: eq(schema.newspapers.name, NEWSPAPER_NAME),
        columns: { id: true },
    });
    if (!newspaper) throw new Error(`${NEWSPAPER_NAME} not found — run the seed first`);
    newspaperId = newspaper.id;
});

describe("seedE2eUsers — Jan Novak", () => {
    test("user exists and is email-verified", async () => {
        const user = await db.query.users.findFirst({
            where: eq(schema.users.email, JAN_EMAIL),
        });
        expect(user).toBeDefined();
        expect(user!.email_verified).toBe(true);
        expect(user!.fullname).toBe("Jan Novak");
        expect(user!.username).toBe("jannovak");
        expect(user!.newspaperId).toBe(newspaperId);
    });

    test("has REGISTERED_USER role at ClaudeDaily", async () => {
        const user = await db.query.users.findFirst({
            where: eq(schema.users.email, JAN_EMAIL),
            columns: { id: true },
        });
        const role = await db.query.userRoles.findFirst({
            where: and(
                eq(schema.userRoles.userId, user!.id),
                eq(schema.userRoles.newspaperId, newspaperId),
                eq(schema.userRoles.role, "REGISTERED_USER"),
            ),
        });
        expect(role).toBeDefined();
    });

    test("has AUTHOR role at ClaudeDaily", async () => {
        const user = await db.query.users.findFirst({
            where: eq(schema.users.email, JAN_EMAIL),
            columns: { id: true },
        });
        const role = await db.query.userRoles.findFirst({
            where: and(
                eq(schema.userRoles.userId, user!.id),
                eq(schema.userRoles.newspaperId, newspaperId),
                eq(schema.userRoles.role, "AUTHOR"),
            ),
        });
        expect(role).toBeDefined();
    });

    test("has an author profile at ClaudeDaily", async () => {
        const user = await db.query.users.findFirst({
            where: eq(schema.users.email, JAN_EMAIL),
            columns: { id: true },
        });
        const profile = await db.query.newspaperAuthors.findFirst({
            where: and(
                eq(schema.newspaperAuthors.userId, user!.id),
                eq(schema.newspaperAuthors.newspaperId, newspaperId),
            ),
        });
        expect(profile).toBeDefined();
    });
});

describe("seedE2eUsers — Director", () => {
    test("user exists and is email-verified", async () => {
        const user = await db.query.users.findFirst({
            where: eq(schema.users.email, DIRECTOR_EMAIL),
        });
        expect(user).toBeDefined();
        expect(user!.email_verified).toBe(true);
        expect(user!.fullname).toBe("Editorial Director");
        expect(user!.username).toBe("director");
        expect(user!.newspaperId).toBeNull();
    });

    test("holds the global DIRECTOR role", async () => {
        const user = await db.query.users.findFirst({
            where: eq(schema.users.email, DIRECTOR_EMAIL),
            columns: { id: true },
        });
        const role = await db.query.globalRoles.findFirst({
            where: and(
                eq(schema.globalRoles.userId, user!.id),
                eq(schema.globalRoles.role, "DIRECTOR"),
            ),
        });
        expect(role).toBeDefined();
    });

    test("has no per-newspaper roles", async () => {
        const user = await db.query.users.findFirst({
            where: eq(schema.users.email, DIRECTOR_EMAIL),
            columns: { id: true },
        });
        const roles = await db
            .select()
            .from(schema.userRoles)
            .where(eq(schema.userRoles.userId, user!.id));
        expect(roles).toHaveLength(0);
    });
});

describe("seedEmma — NEWSPAPER_MANAGER role", () => {
    test("Emma has NEWSPAPER_MANAGER role at ClaudeDaily", async () => {
        const user = await db.query.users.findFirst({
            where: eq(schema.users.email, "emma.bednarikova@email.cz"),
            columns: { id: true },
        });
        expect(user).toBeDefined();
        const role = await db.query.userRoles.findFirst({
            where: and(
                eq(schema.userRoles.userId, user!.id),
                eq(schema.userRoles.newspaperId, newspaperId),
                eq(schema.userRoles.role, "NEWSPAPER_MANAGER"),
            ),
        });
        expect(role).toBeDefined();
    });
});
