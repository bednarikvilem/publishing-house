import { db } from "../index";
import * as schema from "../schema";
import type { NewArticleCategory } from "../schema";
import { eq } from "drizzle-orm";
import { NEWSPAPERS } from "./data/newspapers";

export async function seedNewArticleCategory() {
    const categoriesToInsert: NewArticleCategory[] = [];

    for (const newspaperConfig of NEWSPAPERS) {
        const newspaper = await db.query.newspapers.findFirst({
            where: eq(schema.newspapers.name, newspaperConfig.name),
            columns: { id: true },
        });

        if (!newspaper) {
            console.warn(`Newspaper "${newspaperConfig.name}" not found, skipping its categories.`);
            continue;
        }

        for (const category of newspaperConfig.categories) {
            categoriesToInsert.push({
                categoryName: category.name,
                slug: category.slug,
                newspaperId: newspaper.id,
            });
        }
    }

    if (categoriesToInsert.length === 0) {
        console.warn("No categories to insert — were newspapers seeded first?");
        return;
    }

    await db.insert(schema.articleCategory).values(categoriesToInsert);
    console.log(`Categories added successfully! (${categoriesToInsert.length} total)`);
}
