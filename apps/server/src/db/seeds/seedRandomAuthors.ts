import { faker } from "@faker-js/faker";
import { db } from "../index";
import * as schema from "../schema";
import type { NewNewspaperAuthor, NewUser, NewUserRole } from "../schema";

const EDITORS_PER_NEWSPAPER = 5;

export async function seedRandomAuthors(authorsPerNewspaper: number) {
    const allNewspapers = await db.query.newspapers.findMany();

    if (allNewspapers.length === 0) {
        throw new Error("No newspapers found in the database. Seed newspapers first!");
    }

    const passwordHash = await Bun.password.hash("test1234");
    const usersToInsert: NewUser[] = [];

    for (const newspaper of allNewspapers) {
        for (let i = 0; i < authorsPerNewspaper; i++) {
            usersToInsert.push({
                username: faker.internet.username(),
                fullname: faker.person.fullName(),
                email: faker.internet.email(),
                passwordHash,
                newspaperId: newspaper.id,
                email_verified: true,
            });
        }

        for (let i = 0; i < EDITORS_PER_NEWSPAPER; i++) {
            usersToInsert.push({
                username: faker.internet.username(),
                fullname: faker.person.fullName(),
                email: faker.internet.email(),
                passwordHash,
                newspaperId: newspaper.id,
                email_verified: true,
            });
        }
    }

    const insertedUsers = await db.insert(schema.users)
        .values(usersToInsert)
        .returning();

    const rolesToInsert: NewUserRole[] = [];
    const authorProfiles: NewNewspaperAuthor[] = [];

    let userIndex = 0;
    for (const newspaper of allNewspapers) {
        for (let i = 0; i < authorsPerNewspaper; i++) {
            const user = insertedUsers[userIndex++]!;
            rolesToInsert.push({
                userId: user.id,
                newspaperId: newspaper.id,
                role: "AUTHOR",
            });
            authorProfiles.push({
                userId: user.id,
                newspaperId: newspaper.id,
                biography: faker.lorem.sentence(),
            });
        }

        for (let i = 0; i < EDITORS_PER_NEWSPAPER; i++) {
            const user = insertedUsers[userIndex++]!;
            rolesToInsert.push({
                userId: user.id,
                newspaperId: newspaper.id,
                role: "EDITOR",
            });
        }
    }

    await db.insert(schema.userRoles).values(rolesToInsert).onConflictDoNothing();
    await db.insert(schema.newspaperAuthors).values(authorProfiles);

    const authorCount = allNewspapers.length * authorsPerNewspaper;
    const editorCount = allNewspapers.length * EDITORS_PER_NEWSPAPER;
    console.log(`Successfully seeded ${authorCount} authors and ${editorCount} editors.`);
}
