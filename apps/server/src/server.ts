import { db } from "./db"; // tvůj exportovaný db objekt
import { newspapers } from "./db/schema";

const PORT = Number(process.env.PORT) || 3000;
const DATABASE_URL = process.env.DATABASE_URL;


if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL environment variable");
  process.exit(1);
}

const server = Bun.serve({
  port: PORT,
  routes: {
    "/health": {
      GET: () => Response.json({ status: "ok", timestamp: new Date().toISOString() }),
    },
    "/api": {
      GET: async () => {
        try {
          // Tady saháme do databáze
          const result = await db.select().from(newspapers);

          return Response.json({
            message: "Newspaper API is running",
            newspapersCount: result.length,
            data: result
          });
        } catch (error) {
          console.error("Database query failed:", error);
          return Response.json({ error: "Internal Server Error" }, { status: 500 });
        }
      },
    },
  },
  fetch(req) {
    return new Response("Not Found", { status: 404 });
  },
});