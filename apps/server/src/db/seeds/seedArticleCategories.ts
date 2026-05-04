import { db } from "../index";
import * as schema from "../schema";
import type { NewArticleCategory } from "../schema";
import { slugify } from "../help_functions/slugify"
import { faker } from "@faker-js/faker";

export async function seedNewArticleCategory() {
    const CATEGORIES = ["Sport", "Music", "Tech", "Politics", "Pokemon", "Bridgerton"];
    const existingNewspapers = await db.query.newspapers.findMany(
        {
            columns: { id: true }
        }
    );

    const shuffled = faker.helpers.shuffle([...CATEGORIES]);

    // Guarantee every newspaper gets at least one category
    const guaranteed: NewArticleCategory[] = existingNewspapers.map((np, i) => ({
        categoryName: shuffled[i % shuffled.length],
        slug: slugify(shuffled[i % shuffled.length]),
        newspaperId: np.id,
    }));

    // Distribute remaining categories randomly
    const remaining: NewArticleCategory[] = shuffled.slice(existingNewspapers.length).map((name) => ({
        categoryName: name,
        slug: slugify(name),
        newspaperId: faker.helpers.arrayElement(existingNewspapers).id,
    }));

    await db.insert(schema.articleCategory).values([...guaranteed, ...remaining]);

    console.log("Categories added successfully!");
}