import { db } from "../db";
import { users, userRoles, globalRoles, newspapers } from "../db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { blocklistJti } from "../utils/redis";
import { sendVerificationEmail, sendPasswordResetEmail } from "../utils/email";
import { JWT_EXPIRATION } from "../utils/jwt";
import { logger } from "../utils/logger";
import { audit } from "../utils/audit";
import {
    BadRequestError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
} from "../errors";
import type {
    registerInput,
    loginInput,
    verifyEmailInput,
    forgotPasswordInput,
    resetPasswordInput,
    resendVerificationInput,
    globalLoginInput,
} from "../schemas/auth";
import type { Static } from "elysia";

type Jwt = {
    sign: (payload: Record<string, unknown>) => Promise<string>;
    verify: (token: string) => Promise<Record<string, unknown> | false>;
};

export async function register(body: Static<typeof registerInput>, jwt: Jwt) {
    const { email, username, password, newspaper_id, full_name } = body;

    const [newspaper] = await db
        .select()
        .from(newspapers)
        .where(eq(newspapers.id, newspaper_id));

    if (!newspaper) {
        throw new NotFoundError("Newspaper not found");
    }

    const [emailDuplicate] = await db
        .select()
        .from(users)
        .where(and(eq(users.newspaperId, newspaper_id), eq(users.email, email)));

    if (emailDuplicate) {
        throw new ConflictError("EMAIL_TAKEN");
    }

    const [globalUserWithEmail] = await db
        .select()
        .from(users)
        .where(and(isNull(users.newspaperId), eq(users.email, email)));

    if (globalUserWithEmail) {
        throw new ConflictError("EMAIL_TAKEN");
    }

    const [usernameDuplicate] = await db
        .select()
        .from(users)
        .where(and(eq(users.newspaperId, newspaper_id), eq(users.username, username)));

    if (usernameDuplicate) {
        throw new ConflictError("USERNAME_TAKEN");
    }

    const passwordHash = await Bun.password.hash(password);

    const [newUser] = await db
        .insert(users)
        .values({
            email,
            username,
            fullname: full_name,
            passwordHash,
            newspaperId: newspaper_id,
            email_verified: false,
        })
        .returning();

    await db.insert(userRoles).values({
        userId: newUser.id,
        newspaperId: newspaper_id,
        role: "REGISTERED_USER",
    });

    const verificationToken = await jwt.sign({
        userId: newUser.id,
        type: "email_verification",
        exp: JWT_EXPIRATION.emailVerification,
    });

    await sendVerificationEmail(newUser.email, verificationToken, newspaper.slug);

    await audit({ userId: newUser.id, operationType: "USER_REGISTER", targetObjectId: newUser.id, result: "SUCCESS" });
    logger.info("User registered", { userId: newUser.id, email: newUser.email, newspaperId: newspaper_id });

    return {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        full_name: newUser.fullname,
        email_verified: newUser.email_verified,
    };
}

export async function login(body: Static<typeof loginInput>, jwt: Jwt) {
    const { newspaper_id, email, password } = body;
    const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.newspaperId, newspaper_id)));

    if (!user) {
        await audit({ userId: null, operationType: "USER_LOGIN", result: "FAILURE" });
        logger.warn("Failed login attempt", { email, newspaperId: newspaper_id, reason: "USER_NOT_FOUND" });
        throw new UnauthorizedError("INVALID_CREDENTIALS");
    }

    const isPasswordValid = await Bun.password.verify(password, user.passwordHash);

    if (!isPasswordValid) {
        await audit({ userId: user?.id ?? null, operationType: "USER_LOGIN", result: "FAILURE" });
        logger.warn("Failed login attempt", { email, newspaperId: newspaper_id, reason: "INVALID_CREDENTIALS" });
        throw new UnauthorizedError("INVALID_CREDENTIALS");
    }

    if (!user.email_verified) {
        await audit({ userId: user?.id ?? null, operationType: "USER_LOGIN", result: "FAILURE" });
        logger.warn("Failed login attempt", { email, newspaperId: newspaper_id, reason: "INVALID_CREDENTIALS" });
        throw new ForbiddenError("EMAIL_NOT_VERIFIED");
    }

    const roles = await db
        .select()
        .from(userRoles)
        .where(and(eq(userRoles.userId, user.id), eq(userRoles.newspaperId, newspaper_id)));

    const token = await jwt.sign({
        userId: user.id,
        newspaperId: newspaper_id,
        jti: crypto.randomUUID(),
        exp: JWT_EXPIRATION.session,
    });

    await audit({ userId: user.id, operationType: "USER_LOGIN", targetObjectId: user.id, result: "SUCCESS" });
    logger.info("User logged in", { userId: user.id, newspaperId: newspaper_id });

    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            full_name: user.fullname,
            roles: roles.map(r => r.role),
        },
    };
}

export async function logout(bearer: string | undefined, jwt: Jwt) {
    if (!bearer) {
        throw new UnauthorizedError("Missing token");
    }

    const payload = await jwt.verify(bearer);

    if (!payload) {
        throw new UnauthorizedError("Invalid token");
    }

    if (payload.jti && payload.exp) {
        const ttl = Math.max(0, Number(payload.exp) - Math.floor(Date.now() / 1000));
        await blocklistJti(payload.jti as string, ttl);
    }

    await audit({ userId: String(payload.userId), operationType: "USER_LOGOUT", result: "SUCCESS" });
    logger.info("User logged out", { userId: payload.userId });

    return { message: "Logged out successfully" };
}

export async function verifyEmail(body: Static<typeof verifyEmailInput>, jwt: Jwt) {
    const { token } = body;

    const payload = await jwt.verify(token);

    if (!payload || payload.type !== "email_verification") {
        logger.warn("Email verification failed - invalid token");
        throw new BadRequestError("INVALID_TOKEN");
    }

    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId as string));

    if (!user) {
        throw new NotFoundError("User not found");
    }

    await db
        .update(users)
        .set({ email_verified: true })
        .where(eq(users.id, user.id));

    logger.info("Email address verified", { userId: user.id });
    await audit({ userId: user.id, operationType: "EMAIL_VERIFIED", targetObjectId: user.id, result: "SUCCESS" });

    return { message: "Email verified successfully" };
}

export async function forgotPassword(body: Static<typeof forgotPasswordInput>, jwt: Jwt) {
    const { email, newspaper_id } = body;

    const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.newspaperId, newspaper_id)));

    if (user) {
        const resetToken = await jwt.sign({
            userId: user.id,
            type: "password_reset",
            exp: JWT_EXPIRATION.passwordReset,
        });

        const [newspaper] = await db
            .select()
            .from(newspapers)
            .where(eq(newspapers.id, newspaper_id));

        if (newspaper) {
            await sendPasswordResetEmail(user.email, resetToken, newspaper.slug);
        }

        logger.info("Password reset requested", { userId: user.id });
        await audit({ userId: user.id, operationType: "PASSWORD_RESET_REQUESTED", result: "SUCCESS" });
    }

    return { message: "Reset link has been set" };
}

export async function resetPassword(body: Static<typeof resetPasswordInput>, jwt: Jwt) {
    const { token, password } = body;

    const payload = await jwt.verify(token);

    if (!payload || payload.type !== "password_reset") {
        logger.warn("Password reset failed - invalid token");
        throw new BadRequestError("INVALID_TOKEN");
    }

    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId as string));

    if (!user) {
        throw new NotFoundError("User not found");
    }

    const passwordHash = await Bun.password.hash(password);

    await db
        .update(users)
        .set({ passwordHash })
        .where(eq(users.id, user.id));

    await audit({ userId: user.id, operationType: "PASSWORD_RESET", targetObjectId: user.id, result: "SUCCESS" });
    logger.info("Password reset completed", { userId: user.id });

    return { message: "Password reset successfully" };
}

export async function globalLogin(body: Static<typeof globalLoginInput>, jwt: Jwt) {
    const { email, password } = body;

    const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), isNull(users.newspaperId)));

    if (!user) {
        throw new UnauthorizedError("INVALID_CREDENTIALS");
    }

    const isPasswordValid = await Bun.password.verify(password, user.passwordHash);
    if (!isPasswordValid) {
        throw new UnauthorizedError("INVALID_CREDENTIALS");
    }

    if (!user.email_verified) {
        throw new ForbiddenError("EMAIL_NOT_VERIFIED");
    }

    const userGlobalRoles = await db
        .select()
        .from(globalRoles)
        .where(eq(globalRoles.userId, user.id));

    if (userGlobalRoles.length === 0) {
        throw new UnauthorizedError("INVALID_CREDENTIALS");
    }

    const token = await jwt.sign({
        userId: user.id,
        newspaperId: null,
        jti: crypto.randomUUID(),
        exp: JWT_EXPIRATION.session,
    });

    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            username: user.username,
            full_name: user.fullname,
            roles: userGlobalRoles.map(r => r.role),
        },
    };
}

export async function resendVerification(body: Static<typeof resendVerificationInput>, jwt: Jwt) {
    const { email, newspaper_id } = body;

    const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.newspaperId, newspaper_id)));

    if (user && !user.email_verified) {
        const verificationToken = await jwt.sign({
            userId: user.id,
            type: "email_verification",
            exp: JWT_EXPIRATION.emailVerification,
        });

        const [newspaper] = await db
            .select()
            .from(newspapers)
            .where(eq(newspapers.id, newspaper_id));

        if (newspaper) {
            await sendVerificationEmail(user.email, verificationToken, newspaper.slug);
        }

        logger.info("Verification email resent", { userId: user.id });
        await audit({ userId: user.id, operationType: "VERIFICATION_RESENT", result: "SUCCESS" });
    }

    return { message: "Verification link has been sent" };
}
