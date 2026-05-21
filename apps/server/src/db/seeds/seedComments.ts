import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";
import { db } from "../index";
import * as schema from "../schema";
import type { NewComment } from "../schema";

export async function seedComments() {
    const publishedArticles = await db.query.articles.findMany({
        where: (articles, { and, isNotNull }) =>
            and(eq(articles.state, "PUBLISHED"), isNotNull(articles.publicationDate)),
        columns: { id: true, newspaperId: true, publicationDate: true },
    });

    if (publishedArticles.length === 0) {
        console.warn("No published articles found, skipping comments seed.");
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

    const commentsToInsert: NewComment[] = [];

    for (const article of publishedArticles) {
        const users = usersByNewspaper.get(article.newspaperId) ?? [];
        if (users.length === 0) continue;

        const count = faker.number.int({ min: 5, max: 20 });

        for (let i = 0; i < count; i++) {
            commentsToInsert.push({
                articleId: article.id,
                userId: faker.helpers.arrayElement(users),
                content: faker.lorem.sentences({ min: 1, max: 4 }),
                createdAt: faker.date.between({
                    from: article.publicationDate!,
                    to: new Date(),
                }),
            });
        }
    }

    const CHUNK_SIZE = 5000;
    for (let i = 0; i < commentsToInsert.length; i += CHUNK_SIZE) {
        await db.insert(schema.comments).values(commentsToInsert.slice(i, i + CHUNK_SIZE));
    }

    console.log(`Comments seeded successfully! (${commentsToInsert.length} total)`);
}
