import { db } from "../index";
import { sql } from "drizzle-orm";

async function run() {
    await db.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS email_global_unique_idx
        ON users (email)
        WHERE newspaper_id IS NULL
    `);
    console.log("Created partial unique index: email_global_unique_idx");
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
