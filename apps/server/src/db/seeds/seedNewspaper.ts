import { db } from "../index";
import * as schema from "../schema";
import type { NewNewspaper } from "../schema";


export async function seedNewspapers() {
    const SPECIFIC_NEWSPAPERS = ["DeníkN", "ClaudeDaily", "MuniJournal", "Forbes"];

    const newspapersToInsert: NewNewspaper[] = SPECIFIC_NEWSPAPERS.map((name) => ({
        name: name
    }))

    await db.insert(schema.newspapers).values(newspapersToInsert);
    console.log("Newspapers added successfully!");
}