import { faker, fakerTA_IN } from "@faker-js/faker";
import { db } from "./index";
import * as schema from "./schema";
import type { NewUser, NewPublishingHouse, NewNewspaper, NewNewspaperAuthor, NewArticle, NewArticleCategory } from "./schema";

async function seed() {
    console.log("Starting faker-js seed...");

    const SPECIFIC_NEWSPAPERS = ["DeníkN", "ClaudeDaily", "MuniJournal", "Forbes"];
    const CATEGORIES = ["Sport", "Music", "Tech", "Politics", "Pokemon"];

    const house: NewPublishingHouse = {
        name: "Freeman-Cooper Media",
    };
    const [insertedPublishingHouse] = await db.insert(schema.publishingHouses).values(house).returning();

    const newspapersToInsert: NewNewspaper[] = SPECIFIC_NEWSPAPERS.map((name) => ({
        name: name,
        publishingHouseId: insertedPublishingHouse!.id,
    }))

    const insertedNewspaper = await db.insert(schema.newspapers).values(newspapersToInsert).returning();

    const vilemUser: NewUser = {
        username: "VilemBednarski",
        email: faker.internet.email(),
        passwordHash: faker.internet.password(),
        newspaperId: insertedNewspaper[0]!.id,
        fullname: "Vilem Bednarik",
        email_verified: true,
    };

    const insertedVilemUser = await db.insert(schema.users).values(vilemUser).returning();

    const vilemAuthor: NewNewspaperAuthor = {
        userId: insertedVilemUser[0]!.id,
        newspaperId: vilemUser.newspaperId!,
        biography: faker.lorem.paragraph(1)
    }

    await db.insert(schema.newspaperAuthors).values(vilemAuthor);

    const categoriesToInsert: NewArticleCategory[] = CATEGORIES.map((category) => ({
        categoryName: category,
    }))

    const insertedCategories = await db.insert(schema.articleCategory).values(categoriesToInsert).returning();

    const randomArticle = (): NewArticle => {

        const randomCategory = faker.helpers.arrayElement(insertedCategories);

        return {
            title: faker.lorem.sentence(),
            perex: faker.lorem.sentences(3),
            content: faker.lorem.paragraphs({ min: 3, max: 5 }),
            authorId: vilemAuthor.userId,
            newspaperId: vilemUser.newspaperId!,
            categoryId: randomCategory.id,
            publicationDate: faker.date.between({ from: '2026-01-01T00:00:00.000Z', to: '2026-12-12T00:00:00.000Z' })
        }
    };

    const randomArticles: NewArticle[] = Array.from({ length: 15 }).map(randomArticle);
    await db.insert(schema.articles).values(randomArticles);

    const randomUser = (): NewUser => {
        return {
            username: faker.internet.username(),
            email: faker.internet.email(),
            passwordHash: faker.internet.password(),
        };
    };

    const usersData: NewUser[] = Array.from({ length: 25 }).map(randomUser);
    await db.insert(schema.users).values(usersData);




    console.log("Fake data ready!");
}

seed().finally(() => process.exit(0));