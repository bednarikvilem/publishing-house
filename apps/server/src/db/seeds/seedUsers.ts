import { faker } from "@faker-js/faker";
import { db } from "../index";
import * as schema from "../schema";
import type { NewUser } from "../schema";

const USERS_PER_NEWSPAPER = 100;

export async function seedUsers() {
    const existingNewspapers = await db.query.newspapers.findMany({
        columns: { id: true },
    });

    const passwordHash = await Bun.password.hash("test1234");

    const randomUsers: NewUser[] = existingNewspapers.flatMap((newspaper) =>
        Array.from({ length: USERS_PER_NEWSPAPER }, () => ({
            username: faker.internet.username(),
            email: faker.internet.email(),
            passwordHash,
            newspaperId: newspaper.id,
        }))
    );

    await db.insert(schema.users).values(randomUsers);

    console.log(`Users added successfully! (${randomUsers.length} total)`);
}