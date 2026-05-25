import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";
import { db } from "../index";
import * as schema from "../schema";
import type { NewArticleView } from "../schema";

const CHUNK_SIZE = 5000;

export async function seedArticleViews() {
    const publishedArticles = await db.query.articles.findMany({
        where: (articles, { and, isNotNull }) =>
            and(eq(articles.state, "PUBLISHED"), isNotNull(articles.publicationDate)),
        columns: { id: true, newspaperId: true, publicationDate: true },
    });

    if (publishedArticles.length === 0) {
        console.warn("No published articles found, skipping article views seed.");
        return;
    }

    const allUsers = await db.query.users.findMany({
        columns: { id: true, newspaperId: true },
    });

    const usersByNewspaper = new Map<string, string[]>();
    for (const user of allUsers) {
        if (!user.newspaperId) continue;
        const existing = usersByNewspaper.get(user.newspaperId) ?? [];
        existing.push(user.id);
        usersByNewspaper.set(user.newspaperId, existing);
    }

    const viewsToInsert: NewArticleView[] = [];

    for (const article of publishedArticles) {
        const users = usersByNewspaper.get(article.newspaperId) ?? [];

        // 20–80 views per article; anonymous views (userId null) make up ~30%
        const viewCount = faker.number.int({ min: 20, max: Math.max(20, Math.min(80, users.length * 2)) });
        const from = article.publicationDate!;
        const to = new Date();

        for (let i = 0; i < viewCount; i++) {
            const isAnonymous = users.length === 0 || faker.datatype.boolean({ probability: 0.3 });
            const userId = isAnonymous
                ? null
                : faker.helpers.arrayElement(users);

            viewsToInsert.push({
                articleId: article.id,
                userId: userId ?? null,
                readCompleted: faker.datatype.boolean({ probability: 0.4 }),
                createdAt: faker.date.between({ from, to }),
            });
        }
    }

    for (let i = 0; i < viewsToInsert.length; i += CHUNK_SIZE) {
        await db.insert(schema.articleViews).values(viewsToInsert.slice(i, i + CHUNK_SIZE));
    }

    console.log(`Article views seeded successfully! (${viewsToInsert.length} total)`);
}
