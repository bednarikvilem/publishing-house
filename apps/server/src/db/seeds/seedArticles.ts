import { faker } from "@faker-js/faker";
import { db } from "../index";
import * as schema from "../schema";
import type { NewArticle } from "../schema";
import { NEWSPAPERS } from "./data/newspapers";
import type { CategoryConfig } from "./data/newspapers";
import { generateFromTemplate } from "./helpers";

function loremflickrUrl(imageKeywords: string): string {
    return `https://loremflickr.com/800/600/${imageKeywords}?lock=${faker.number.int({ min: 1, max: 9999 })}`;
}

function generateKeywords(category: CategoryConfig): string {
    const allWords = Object.values(category.wordBank).flat();
    return faker.helpers.arrayElements(allWords, 5).join(", ");
}

export async function seedArticles() {
    const authors = await db.query.newspaperAuthors.findMany();

    if (authors.length === 0) {
        throw new Error("❌ No authors found!");
    }

    // Build newspaperId → NewspaperConfig map using DB newspaper names
    const allNewspapersDb = await db.query.newspapers.findMany({
        columns: { id: true, name: true },
    });
    const newspaperConfigMap = new Map(
        allNewspapersDb.flatMap((np) => {
            const config = NEWSPAPERS.find((c) => c.name === np.name);
            return config ? [[np.id, config] as const] : [];
        })
    );

    // Build categoryId → imageKeywords map
    const allDbCategories = await db.query.articleCategory.findMany({
        columns: { id: true, slug: true },
    });
    const categoryImageMap = new Map<string, string>();
    for (const cat of allDbCategories) {
        for (const np of NEWSPAPERS) {
            const catConfig = np.categories.find((c) => c.slug === cat.slug);
            if (catConfig) {
                categoryImageMap.set(cat.id, catConfig.imageKeywords);
                break;
            }
        }
    }

    const articlesToInsert: NewArticle[] = [];

    for (const author of authors) {
        const articlesCount = faker.number.int({ min: 25, max: 35 });

        const dbCategories = await db.query.articleCategory.findMany({
            where: (articleCategory, { eq }) =>
                eq(articleCategory.newspaperId, author.newspaperId),
        });

        const newspaperConfig = newspaperConfigMap.get(author.newspaperId);

        for (let i = 0; i < articlesCount; i++) {
            const isPublished = faker.number.float() < 2 / 3;

            const dbCategory = dbCategories.length > 0
                ? faker.helpers.arrayElement(dbCategories)
                : null;

            const categoryConfig = newspaperConfig?.categories.find(
                (c) => c.slug === dbCategory?.slug
            );

            const title = categoryConfig
                ? generateFromTemplate(
                    faker.helpers.arrayElement(categoryConfig.templates),
                    categoryConfig.wordBank
                )
                : faker.lorem.sentence({ min: 4, max: 10 }).replace(/\.$/, "");

            const keywords = categoryConfig
                ? generateKeywords(categoryConfig)
                : faker.lorem.words(5).split(" ").join(", ");

            articlesToInsert.push({
                title,
                perex: faker.lorem.paragraph(1),
                content: faker.lorem.paragraphs({ min: 3, max: 8 }, "\n\n"),
                keywords,
                state: isPublished ? "PUBLISHED" : "DRAFT",
                authorId: author.userId,
                newspaperId: author.newspaperId,
                categoryId: dbCategory?.id ?? null,
                publicationDate: isPublished ? faker.date.past() : null,
            });
        }
    }

    const inserted = await db.insert(schema.articles).values(articlesToInsert).returning();

    const imagesToInsert = inserted.map((article) => ({
        articleId: article.id,
        url: loremflickrUrl(
            article.categoryId
                ? (categoryImageMap.get(article.categoryId) ?? "news,article")
                : "news,article"
        ),
        caption: null,
        isPrimary: true,
    }));

    await db.insert(schema.articleImages).values(imagesToInsert);

    console.log(`Successfully added ${inserted.length} articles with images.`);
}
