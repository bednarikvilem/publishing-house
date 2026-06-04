import { db } from "../index";
import * as schema from "../schema";
import { eq } from "drizzle-orm";

const NEWSPAPER_NAME = "ClaudeDaily";

const JAN = {
    email: "jan.novak@claudedaily.cz",
    username: "jannovak",
    fullname: "Jan Novak",
    password: "test1234",
};

const DIRECTOR = {
    email: "director@claudedaily.cz",
    username: "director",
    fullname: "Editorial Director",
    password: "test1234",
};

export async function seedE2eUsers() {
    const newspaper = await db.query.newspapers.findFirst({
        where: eq(schema.newspapers.name, NEWSPAPER_NAME),
        columns: { id: true },
    });

    if (!newspaper) {
        console.warn(`${NEWSPAPER_NAME} newspaper not found, skipping e2e user seed.`);
        return;
    }

    // Jan Novak — REGISTERED_USER + AUTHOR at ClaudeDaily
    const existingJan = await db.query.users.findFirst({
        where: eq(schema.users.email, JAN.email),
        columns: { id: true },
    });

    if (existingJan) {
        console.log("Jan Novak already exists, skipping.");
    } else {
        const janHash = await Bun.password.hash(JAN.password);
        const [jan] = await db.insert(schema.users).values({
            email: JAN.email,
            username: JAN.username,
            fullname: JAN.fullname,
            passwordHash: janHash,
            newspaperId: newspaper.id,
            email_verified: true,
        }).returning({ id: schema.users.id });

        await db.insert(schema.userRoles).values([
            { userId: jan.id, newspaperId: newspaper.id, role: "REGISTERED_USER" },
            { userId: jan.id, newspaperId: newspaper.id, role: "AUTHOR" },
        ]);

        await db.insert(schema.newspaperAuthors).values({
            userId: jan.id,
            newspaperId: newspaper.id,
            biography: "E2E test author at ClaudeDaily.",
            // Placeholder profile picture so client-side submit validation passes
            profilePictureUrl: "http://localhost:9000/pb138-images/profiles/e2e-placeholder.webp",
        });

        console.log(`Jan Novak seeded!  email: ${JAN.email}`);
    }

    // Director — global DIRECTOR role only (unique constraint: one director in the system).
    // We upsert our test director user and ensure they hold the DIRECTOR global role.
    // If another user currently holds it, we reassign so the e2e tests have known credentials.

    // Ensure our director user exists
    const directorHash = await Bun.password.hash(DIRECTOR.password);
    await db
        .insert(schema.users)
        .values({
            email: DIRECTOR.email,
            username: DIRECTOR.username,
            fullname: DIRECTOR.fullname,
            passwordHash: directorHash,
            newspaperId: null,
            email_verified: true,
        })
        .onConflictDoNothing();

    const directorUser = await db.query.users.findFirst({
        where: eq(schema.users.email, DIRECTOR.email),
        columns: { id: true },
    });

    if (!directorUser) throw new Error("Could not find or create director user.");

    // Check if OUR director already owns the role
    const currentDirectorRole = await db.query.globalRoles.findFirst({
        where: eq(schema.globalRoles.role, "DIRECTOR"),
        columns: { userId: true },
    });

    if (currentDirectorRole?.userId === directorUser.id) {
        console.log("Director already exists with correct role, skipping.");
    } else {
        if (currentDirectorRole) {
            await db.delete(schema.globalRoles).where(eq(schema.globalRoles.role, "DIRECTOR"));
            console.log("Removed DIRECTOR role from previous holder.");
        }
        await db.insert(schema.globalRoles).values({ userId: directorUser.id, role: "DIRECTOR" });
        console.log(`Director seeded!  email: ${DIRECTOR.email}`);
    }
}

// Standalone runner
if (import.meta.main) {
    console.log("Seeding e2e users…");
    seedE2eUsers()
        .then(() => {
            console.log("✅ Done!");
            process.exit(0);
        })
        .catch((err) => {
            console.error("❌ Failed:", err);
            process.exit(1);
        });
}