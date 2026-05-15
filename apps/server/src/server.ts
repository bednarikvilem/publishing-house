import { Elysia } from "elysia";
import { db } from "./db";
import { newspapers } from "./db/schema";
import { authRoutes } from "./routes/auth.ts";
import { userRoutes } from "./routes/users.ts";
import { newspaperRoutes } from "./routes/newspapers.ts";
import { articleRoutes } from "./routes/articles.ts";
import { categoryRoutes } from "./routes/categories.ts";
import { commentRoutes } from "./routes/comments.ts";
import { likeRoutes } from "./routes/likes.ts";
import { adminRoutes } from "./routes/admin.ts";
import { authorRoutes } from "./routes/authors.ts";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { logger } from "./utils/logger";
import { audit } from "./utils/audit";
import { viewRoutes } from "./routes/views_route.ts";
import { HttpError } from "./errors";

const PORT = Number(process.env.PORT) || 3000;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("Missing DATABASE_URL environment variable");
    process.exit(1);
}

export const app = new Elysia()
    .use(cors())
    .use(
        openapi({
            documentation: {
                info: {
                    title: "Newspaper API",
                    version: "1.0.0",
                },
                tags: [
                    { name: "Auth", description: "Registration, login, password reset, email verification" },
                    { name: "Users", description: "Current-user profile and account operations" },
                    { name: "Newspapers", description: "Newspaper listing and metadata" },
                    { name: "Articles", description: "Article CRUD, submission, review, and scheduling" },
                    { name: "Categories", description: "Article categories per newspaper" },
                    { name: "Comments", description: "Comments on articles and moderation" },
                    { name: "Likes", description: "Liking and unliking articles" },
                    { name: "Authors", description: "Author profiles and their article listings" },
                    { name: "Admin", description: "System administration: roles, users, configuration" },
                ],
            },
        })
    )
    .use(authRoutes)
    .use(userRoutes)
    .use(newspaperRoutes)
    .use(articleRoutes)
    .use(categoryRoutes)
    .use(commentRoutes)
    .use(likeRoutes)
    .use(adminRoutes)
    .use(authorRoutes)
    .use(viewRoutes)
    .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))
    .get("/api", async () => {
        try {
            const result = await db.select().from(newspapers);
            return {
                message: "Newspaper API is running",
                newspapersCount: result.length,
                data: result.map(n => ({ id: n.id, name: n.name, slug: n.slug })),
            };
        } catch (error) {
            logger.error("Database query failed", {
                error: error instanceof Error ? error.message : String(error),
            });

            return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
        }
    })
    .error({ HttpError })
    .onError(({ error, request, set }) => {
        if (error instanceof HttpError) {
            set.status = error.status;
            return { error: error.code, ...(error.details ?? {}) };
        }

        set.status = set.status || 500;

        logger.error("Unhandled server error", {
            method: request.method,
            url: request.url,
            status: set.status,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });

        return {
            error: "Internal Server Error",
        };
    })
    .listen(PORT);

export type App = typeof app;

logger.info("Server started", {
  port: app.server?.port,
  database: DATABASE_URL.replace(/:\/\/.*@/, "://<redacted>@"),
});