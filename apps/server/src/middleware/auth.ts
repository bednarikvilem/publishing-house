import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { bearer } from "@elysiajs/bearer";
import { db } from "../db";
import { users, userRoles, globalRoles } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { isJtiBlocklisted } from "../utils/redis";
import { withRls, type Tx } from "../db/rls";

export const authMiddleware = new Elysia({ name: "auth"})
	.use(bearer())
	.use(jwt({ secret: process.env.JWT_SECRET! }))
	.derive({ as: "global" }, async ({ bearer, jwt }) => {
		const anonymous = {
			user: null,
			roles: [] as string[],
			withDb: <T>(fn: (tx: Tx) => Promise<T>) =>
				withRls({ userId: null, newspaperId: null, roles: [] }, fn),
		};

		if (!bearer) return anonymous;

		const payload = await jwt.verify(bearer);
		if (!payload) return anonymous;

		if (payload.jti && (await isJtiBlocklisted(payload.jti as string))) {
			return anonymous;
		}

		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.id, payload.userId as string));

		if (!user) return anonymous;

		const userRolesList = payload.newspaperId
			? await db
				.select()
				.from(userRoles)
				.where(
					and(
						eq(userRoles.userId, user.id),
						eq(userRoles.newspaperId, payload.newspaperId as string)
					)
				)
			: [];

		const globalRolesList = await db
			.select()
			.from(globalRoles)
			.where(eq(globalRoles.userId, user.id));

		const roles = [
			...userRolesList.map(r => r.role),
			...globalRolesList.map(r => r.role),
		] as string[];

		const newspaperId = (payload.newspaperId as string | undefined) ?? null;

		return {
			user,
			roles,
			withDb: <T>(fn: (tx: Tx) => Promise<T>) =>
				withRls({ userId: user.id, newspaperId, roles }, fn),
		};
	});

export const requireAuth = new Elysia({ name: "requireAuth" })
	.use(authMiddleware)
	.onBeforeHandle(({ user }) => {
		if (!user) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}
	});

export const requireRole = (role: string) =>
	new Elysia({ name: `requireRole-${role}` })
		.use(requireAuth)
		.onBeforeHandle(({ roles }) => {
			if (!roles.includes(role)) {
				return Response.json({ error: "Forbidden" }, { status: 403 });
			}
		});

