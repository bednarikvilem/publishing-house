// Fresh-database initialisation. Run this once after starting a new postgres container.
//
//   1. drizzle-kit push  — creates all schema tables from schema.ts
//   2. custom SQL        — applies hand-written migrations (RLS policies, pg functions, grants)
//   3. track             — records every migration in drizzle.__drizzle_migrations
//
// Usage:   bun db:setup          (from apps/server/)
// Then:    bun db:seed           (to populate with initial data)
//
// Idempotent: safe to run again if the DB already has everything set up.

import postgres from "postgres";
import { createHash } from "node:crypto";

console.log("→ [1/3] Pushing schema…");
// Use Bun.spawn with inherited stdio so drizzle-kit can show interactive prompts
// (e.g. "truncate table to add unique constraint?") when needed.
const push = Bun.spawn(["bun", "x", "drizzle-kit", "push"], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
});
const pushCode = await push.exited;
if (pushCode !== 0) {
    console.error("Schema push failed — is the database running?");
    process.exit(1);
}
console.log();

const sql = postgres(process.env.DATABASE_URL!);

const journal: { entries: Array<{ tag: string; when: number }> } =
    await Bun.file(`${import.meta.dir}/../drizzle/meta/_journal.json`).json();

await sql`CREATE SCHEMA IF NOT EXISTS "drizzle"`;
await sql`
    CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
        id         SERIAL  PRIMARY KEY,
        hash       text    NOT NULL,
        created_at bigint
    )
`;

async function hashOf(tag: string) {
    const content = await Bun.file(`${import.meta.dir}/../drizzle/${tag}.sql`).text();
    return createHash("sha256").update(content).digest("hex");
}

async function isTracked(tag: string) {
    const hash = await hashOf(tag);
    const [row] = await sql`
        SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = ${hash}
    `;
    return !!row;
}

async function track(tag: string) {
    const entry = journal.entries.find(e => e.tag === tag)!;
    const hash = await hashOf(tag);
    await sql`
        INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
        VALUES (${hash}, ${entry.when})
    `;
}

// Hand-written SQL migrations (RLS policies, pg functions, role grants).
// drizzle-kit push doesn't run these, so we apply and track them here.
const customMigrations = [
    "0002_enable_rls",
    "0004_fix_author_visibility",
    "0006_add_subscriptions_rls",
];

console.log("→ [2/3] Applying RLS migrations…");
for (const tag of customMigrations) {
    if (await isTracked(tag)) {
        console.log(`  ${tag}: already applied`);
        continue;
    }
    const content = await Bun.file(`${import.meta.dir}/../drizzle/${tag}.sql`).text();
    await sql.unsafe(content);
    await track(tag);
    console.log(`  ${tag}: applied`);
}
console.log();

// Drizzle-generated schema migrations are already applied by push — just record them
// so that bun db:migrate won't try to re-run them later.
const schemaMigrations = [
    "0001_add_article_views",
    "0003_add_newspaper_primary_color",
    "0005_small_sabretooth",
];

console.log("→ [3/3] Recording schema migrations…");
for (const tag of schemaMigrations) {
    if (!(await isTracked(tag))) {
        await track(tag);
        console.log(`  ${tag}: recorded`);
    } else {
        console.log(`  ${tag}: already recorded`);
    }
}

await sql.end();

console.log("\n✅ Database ready.  Run  bun db:seed  to populate with data.");
