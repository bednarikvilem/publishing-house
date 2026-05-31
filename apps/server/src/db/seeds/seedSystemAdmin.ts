import { db } from "../index";
import * as schema from "../schema";
import { eq } from "drizzle-orm";

export async function seedSystemAdmin() {
    const existing = await db.query.globalRoles.findFirst({
        where: eq(schema.globalRoles.role, "SYSTEM_ADMINISTRATOR"),
    });

    if (existing) {
        console.log("SYSTEM_ADMINISTRATOR already exists, skipping.");
        return;
    }

    const passwordHash = await Bun.password.hash("test1234");

    const [user] = await db.insert(schema.users).values({
        email: "admin@newspapers.com",
        username: "sysadmin",
        fullname: "System Administrator",
        passwordHash,
        newspaperId: null,
        email_verified: true,
    }).returning({ id: schema.users.id });

    await db.insert(schema.globalRoles).values({
        userId: user.id,
        role: "SYSTEM_ADMINISTRATOR",
    });

    console.log("System Administrator seeded!");
    console.log("  Email:    admin@newspapers.com");
    console.log("  Password: test1234");
}
