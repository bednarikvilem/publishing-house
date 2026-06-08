import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { bearer } from "@elysiajs/bearer";
import { db } from "../db";
import { users, userRoles, globalRoles } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { isJtiBlocklisted } from "../utils/redis";
import { withRls, type Tx } from "../db/rls";
import { UnauthorizedError, ForbiddenError } from "../errors";
import type { JwtClaims } from "../utils/jwt";
import type { Role } from "../services/context";

export const authMiddleware = new Elysia({ name: "auth"})
	.use(bearer())
	.use(jwt({ secret: process.env.JWT_SECRET! }))
	.derive({ as: "global" }, async ({ bearer, jwt }) => {
		const anonymous = {
			user: null,
			roles: [] as Role[],
			withDb: <T>(fn: (tx: Tx) => Promise<T>) =>
				withRls({ userId: null, newspaperId: null, roles: [] }, fn),
		};

		if (!bearer) return anonymous;

		const payload = (await jwt.verify(bearer)) as JwtClaims | false;
		if (!payload) return anonymous;

		if (payload.type) return anonymous;

		if (payload.jti && (await isJtiBlocklisted(payload.jti))) {
			return anonymous;
		}

		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.id, payload.userId));

		if (!user) return anonymous;

		const userRolesList = payload.newspaperId
			? await db
				.select()
				.from(userRoles)
				.where(
					and(
						eq(userRoles.userId, user.id),
						eq(userRoles.newspaperId, payload.newspaperId)
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
		] as Role[];

		const newspaperId = payload.newspaperId ?? null;

		return {
			user,
			roles,
			withDb: <T>(fn: (tx: Tx) => Promise<T>) =>
				withRls({ userId: user.id, newspaperId, roles }, fn),
		};
	});

export const auth = new Elysia({ name: "auth-guards" })
	.use(authMiddleware)
	.macro({
		requireAuth: {
			resolve({ user }) {
				if (!user) throw new UnauthorizedError();
				return { user };
			},
		},
		requireRole(role: Role) {
			return {
				resolve({ user, roles }) {
					if (!user) throw new UnauthorizedError();
					if (!roles.includes(role)) throw new ForbiddenError();
					return { user };
				},
			};
		},
	});

