import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./src/db/schema.ts", // Cesta k vašemu schématu
    out: "./drizzle",             // Složka, kam se budou generovat migrace
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
});