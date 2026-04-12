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
      GET: () => Response.json({ message: "Newspaper API is running" }),
    },
  },
  fetch(req) {
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Server running on http://localhost:${server.port}`);
console.log(`Database: ${DATABASE_URL.replace(/:\/\/.*@/, "://<redacted>@")}`);
