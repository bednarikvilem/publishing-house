import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";

export const authRoutes = new Elysia({ prefix: "/api/auth" })
	.use(jwt({ secret: process.env.JWT_SECRET! }))

	// TODO: validations (will be generated from Drizzle + Zod)

	.post("/register", async ({ body }) => {

	})

	.post("/login", async ({ body, jwt }) => {

	})

	.post("/logout", async ({ headers, jwt }) => {

	})

	.post("/verify-email", async ({ body }) => {

	})

	.post("/forgot-password", async ({ body }) => {

	})

	.post("/reset-password", async ({ body }) => {

	})

	.post("/resend-verification", async ({ body }) => {

	});
