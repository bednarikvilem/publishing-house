import { faker } from "@faker-js/faker";
import { db } from "../index";
import * as schema from "../schema";
import type { NewArticle } from "../schema";

function picsumUrl() {
    return `https://picsum.photos/seed/${faker.number.int({ min: 1, max: 1000 })}/800/600`;
}

export async function seedArticles() {
    const authors = await db.query.newspaperAuthors.findMany();

    if (authors.length === 0) {
        throw new Error("❌ No authors found!");
    }

    const articlesToInsert: NewArticle[] = [];

    for (const author of authors) {
        const articlesCount = faker.number.int({ min: 3, max: 7 });

        const categories = await db.query.articleCategory.findMany({
            where: (articleCategory, { eq }) =>
                eq(articleCategory.newspaperId, author.newspaperId)
        });

        for (let i = 0; i < articlesCount; i++) {
            articlesToInsert.push({
                title: faker.lorem.sentence({ min: 4, max: 10 }).replace(/\.$/, ""),
                perex: faker.lorem.paragraph(1),
                content: faker.lorem.paragraphs({ min: 3, max: 8 }, "\n\n"),
                keywords: faker.lorem.words(5).split(" ").join(", "),
                state: faker.helpers.arrayElement(["PUBLISHED", "DRAFT", "DRAFT"]),

                authorId: author.userId,
                newspaperId: author.newspaperId,

                categoryId: categories.length > 0
                    ? faker.helpers.arrayElement(categories).id
                    : null,

                publicationDate: faker.date.past(),
            });
        }

        for (let i = 0; i < articlesCount; i++) {
            articlesToInsert.push({
                title: faker.lorem.sentence({ min: 4, max: 10 }).replace(/\.$/, ""),
                perex: faker.lorem.paragraph(1),
                content: faker.lorem.paragraphs({ min: 3, max: 8 }, "\n\n"),
                keywords: faker.lorem.words(5).split(" ").join(", "),
                state: "PUBLISHED",

                authorId: author.userId,
                newspaperId: author.newspaperId,

                categoryId: categories.length > 0
                    ? faker.helpers.arrayElement(categories).id
                    : null,

                publicationDate: faker.date.past(),
            });
        }
    }

    const inserted = await db.insert(schema.articles).values(articlesToInsert).returning();

    const imagesToInsert = inserted.map((article) => ({
        articleId: article.id,
        url: picsumUrl(),
        caption: null,
        isPrimary: true,
    }));

    await db.insert(schema.articleImages).values(imagesToInsert);

    console.log(`Successfully added ${inserted.length} articles with images.`);
}
