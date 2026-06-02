import { db } from "../index";
import * as schema from "../schema";
import { eq } from "drizzle-orm";

const SEED_EMAIL = "seed@seed.com";
const SEED_PASSWORD = "test1234";

export async function seedSeedUser() {
    const newspapers = await db.query.newspapers.findMany({
        columns: { id: true, name: true },
    });

    if (newspapers.length === 0) {
        console.warn("No newspapers found, skipping seed user.");
        return;
    }

    const passwordHash = await Bun.password.hash(SEED_PASSWORD);

    for (const newspaper of newspapers) {
        const existing = await db.query.users.findFirst({
            where: (u, { and, eq }) => and(
                eq(u.email, SEED_EMAIL),
                eq(u.newspaperId, newspaper.id)
            ),
            columns: { id: true },
        });

        if (existing) {
            continue;
        }

        const [user] = await db.insert(schema.users).values({
            email: SEED_EMAIL,
            username: `seed_${newspaper.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")}`,
            passwordHash,
            newspaperId: newspaper.id,
            email_verified: true,
        }).returning({ id: schema.users.id });

        await db.insert(schema.userRoles).values({
            userId: user!.id,
            newspaperId: newspaper.id,
            role: "REGISTERED_USER",
        });
    }

    console.log(`Seed user seeded for ${newspapers.length} newspapers.`);
    console.log(`  Email:    ${SEED_EMAIL}`);
    console.log(`  Password: ${SEED_PASSWORD}`);
}
