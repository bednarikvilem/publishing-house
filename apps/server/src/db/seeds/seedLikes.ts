import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";
import { db } from "../index";
import * as schema from "../schema";
import type { NewLike } from "../schema";

export async function seedLikes() {
    const publishedArticles = await db.query.articles.findMany({
        where: (articles, { and, isNotNull }) =>
            and(eq(articles.state, "PUBLISHED"), isNotNull(articles.publicationDate)),
        columns: { id: true, newspaperId: true, publicationDate: true },
    });

    if (publishedArticles.length === 0) {
        console.warn("No published articles found, skipping likes seed.");
        return;
    }

    const usersByNewspaper = new Map<string, string[]>();

    const allUsers = await db.query.users.findMany({
        columns: { id: true, newspaperId: true },
    });

    for (const user of allUsers) {
        if (!user.newspaperId) continue;
        const existing = usersByNewspaper.get(user.newspaperId) ?? [];
        existing.push(user.id);
        usersByNewspaper.set(user.newspaperId, existing);
    }

    const likesToInsert: NewLike[] = [];

    for (const article of publishedArticles) {
        const users = usersByNewspaper.get(article.newspaperId) ?? [];
        if (users.length === 0) continue;

        const count = faker.number.int({ min: 10, max: Math.min(50, users.length) });
        const selectedUsers = faker.helpers.arrayElements(users, count);

        for (const userId of selectedUsers) {
            likesToInsert.push({
                userId,
                articleId: article.id,
                createdAt: faker.date.between({
                    from: article.publicationDate!,
                    to: new Date(),
                }),
            });
        }
    }

    const CHUNK_SIZE = 5000;
    for (let i = 0; i < likesToInsert.length; i += CHUNK_SIZE) {
        await db.insert(schema.likes)
            .values(likesToInsert.slice(i, i + CHUNK_SIZE))
            .onConflictDoNothing();
    }

    console.log(`Likes seeded successfully! (${likesToInsert.length} total)`);
}
