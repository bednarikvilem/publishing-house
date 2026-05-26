import { createHash } from "node:crypto";
import postgres from "postgres";

const tags = process.argv.slice(2);
if (tags.length === 0) {
    console.error("Usage: bun scripts/bootstrap-migrations.ts <migration-tag> [<migration-tag> ...]");
    console.error("Example: bun scripts/bootstrap-migrations.ts 0001_add_article_views");
    process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL!);

await sql`CREATE SCHEMA IF NOT EXISTS "drizzle"`;
await sql`
    CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
    )
`;

const journal = await Bun.file(`${import.meta.dir}/../drizzle/meta/_journal.json`).json();

for (const tag of tags) {
    const entry = journal.entries.find((e: { tag: string }) => e.tag === tag);
    if (!entry) {
        console.error(`No journal entry for ${tag}`);
        process.exit(1);
    }
    const content = await Bun.file(`${import.meta.dir}/../drizzle/${tag}.sql`).text();
    const hash = createHash("sha256").update(content).digest("hex");

    const [existing] = await sql`
        SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = ${hash}
    `;
    if (existing) {
        console.log(`${tag}: already marked`);
        continue;
    }

    await sql`
        INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
        VALUES (${hash}, ${entry.when})
    `;
    console.log(`${tag}: marked as applied (${entry.when})`);
}

await sql.end();
