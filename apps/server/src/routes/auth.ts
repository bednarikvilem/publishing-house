import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { db } from "../db";
import { users, userRoles, newspapers } from "../db/schema";
import { eq, and, or } from "drizzle-orm";

export const authRoutes = new Elysia({ prefix: "/api/auth" })
	.use(jwt({ secret: process.env.JWT_SECRET! }))

	// TODO: validations (will be generated from Drizzle + Zod)

	.post("/register", async ({ body, jwt }) => {
		const { email, username, password, newspaper_id, full_name } = body;

		const [newspaper] = await db
			.select()
			.from(newspapers)
			.where(eq(newspapers.id, newspaper_id));

		if (!newspaper) {
			return new Response(
				JSON.stringify({ error: "Newspaper not found" }),
				{ status: 404 }
			);
		}

		const[is_duplicate] = await db
			.select()
			.from(users)
			.where(
				and(
					eq(users.newspaperId, newspaper_id),
					or(eq(users.email, email), eq(users.username, username))
				)
			);

			if (is_duplicate) {
				return new Response(
					JSON.stringify({ error: "Email or username is already taken." }),
					{ status: 409 }
				);
			}

			const passwordHash = await Bun.password.hash(password);

			const [newUser] = await db
				.insert(users)
				.values({
					email,
					username,
					fullName: full_name,
					passwordHash,
					newspaperId: newspaper_id,
					emailVerified: false,
				})
				.returning();

			await db.insert(userRoles).values({
				userId: newUser.id,
				newspaperId: newspaper_id,
				role: "REGISTRED_USER",
			});

			const verificationToken = await jwt.sign({
				userId: newUser.id,
				type: "email_verification",
				exp: Math.floor(Date.now() / 1000) + 86400,
			});

		return Response.json({
			user: {
				id: newUser.id,
				email: newUser.email,
				username: newUser.username,
				full_name: newUser.fullName,
				email_verified: newUser.emailVerified,
			},
		}, { status: 201 });
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
