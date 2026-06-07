import { db } from "../index";
import * as schema from "../schema";
import type { NewNewspaper } from "../schema";
import { NEWSPAPERS } from "./data/newspapers";

export async function seedNewspapers() {
    const newspapersToInsert: NewNewspaper[] = NEWSPAPERS.map(({ name, slug }) => ({
        name,
        slug,
    }));

    await db.insert(schema.newspapers).values(newspapersToInsert);
    console.log("Newspapers added successfully!");
}
