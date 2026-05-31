import QRCode from "qrcode";
import { db } from "../db";
import { subscriptions, subscriptionTokens, users, newspapers } from "../db/schema";
import { and, eq, lt, isNull, gt } from "drizzle-orm";
import { logger } from "../utils/logger";
import { sendSubscriptionQrEmail, sendSubscriptionRenewalEmail } from "../utils/email";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../errors";
import type { AuthUser } from "./context";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export async function requestSubscription(userId: string, newspaperId: string) {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) throw new UnauthorizedError();

    const newspaper = await db.query.newspapers.findFirst({ where: eq(newspapers.id, newspaperId) });
    if (!newspaper) throw new NotFoundError("NEWSPAPER_NOT_FOUND");

    const tokenExpiresAt = new Date(Date.now() + SEVEN_DAYS_MS);
    const [token] = await db
        .insert(subscriptionTokens)
        .values({ userId, newspaperId, expiresAt: tokenExpiresAt })
        .returning();

    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
    const confirmUrl = `${frontendUrl}/${newspaper.slug}/subscription/confirm?token=${token!.id}`;
    const qrDataUrl = await QRCode.toDataURL(confirmUrl);

    try {
        await sendSubscriptionQrEmail(user.email, newspaper.name, qrDataUrl, confirmUrl);
        logger.info("Subscription QR sent", { userId, newspaperId });
    } catch (err) {
        logger.error("SMTP error sending subscription QR (email may still have been delivered)", {
            userId,
            newspaperId,
            error: err instanceof Error ? err.message : String(err),
        });
    }

    return { message: "Subscription QR code sent to your email." };
}

export async function confirmSubscription(token: string, newspaperId: string) {
    const tokenRow = await db.query.subscriptionTokens.findFirst({
        where: eq(subscriptionTokens.id, token),
    });

    if (!tokenRow || tokenRow.newspaperId !== newspaperId) {
        throw new BadRequestError("INVALID_TOKEN");
    }
    if (tokenRow.usedAt) {
        throw new BadRequestError("INVALID_TOKEN");
    }
    if (tokenRow.expiresAt < new Date()) {
        throw new BadRequestError("INVALID_TOKEN");
    }

    await db
        .update(subscriptionTokens)
        .set({ usedAt: new Date() })
        .where(eq(subscriptionTokens.id, token));

    const existing = await db.query.subscriptions.findFirst({
        where: and(
            eq(subscriptions.userId, tokenRow.userId),
            eq(subscriptions.newspaperId, newspaperId),
        ),
    });

    const baseDate = existing && existing.expiresAt > new Date()
        ? existing.expiresAt
        : new Date();
    const newExpiresAt = new Date(baseDate.getTime() + THIRTY_DAYS_MS);

    if (existing) {
        await db
            .update(subscriptions)
            .set({ expiresAt: newExpiresAt })
            .where(and(
                eq(subscriptions.userId, tokenRow.userId),
                eq(subscriptions.newspaperId, newspaperId),
            ));
    } else {
        await db
            .insert(subscriptions)
            .values({ userId: tokenRow.userId, newspaperId, expiresAt: newExpiresAt });
    }

    logger.info("Subscription confirmed", { userId: tokenRow.userId, newspaperId, expiresAt: newExpiresAt });
    return { message: "Subscription activated.", expires_at: newExpiresAt.toISOString() };
}

export async function getSubscriptionStatus(userId: string, newspaperId: string) {
    const sub = await db.query.subscriptions.findFirst({
        where: and(
            eq(subscriptions.userId, userId),
            eq(subscriptions.newspaperId, newspaperId),
        ),
    });

    if (!sub || sub.expiresAt <= new Date()) {
        return { is_active: false, expires_at: null };
    }
    return { is_active: true, expires_at: sub.expiresAt.toISOString() };
}

export async function getRenewalCandidates() {
    const thresholdDate = new Date(Date.now() + THREE_DAYS_MS);
    const expiringSoon = await db.query.subscriptions.findMany({
        where: lt(subscriptions.expiresAt, thresholdDate),
        with: { user: true, newspaper: true } as any,
    });

    const candidates = await Promise.all(
        expiringSoon.map(async (sub) => {
            const pendingToken = await db.query.subscriptionTokens.findFirst({
                where: and(
                    eq(subscriptionTokens.userId, sub.userId),
                    eq(subscriptionTokens.newspaperId, sub.newspaperId),
                    isNull(subscriptionTokens.usedAt),
                    gt(subscriptionTokens.expiresAt, new Date()),
                ),
            });
            return pendingToken ? null : sub;
        }),
    );

    return candidates.filter(Boolean) as typeof expiringSoon;
}

export async function sendRenewalEmail(sub: { userId: string; newspaperId: string; expiresAt: Date }) {
    const user = await db.query.users.findFirst({ where: eq(users.id, sub.userId) });
    const newspaper = await db.query.newspapers.findFirst({ where: eq(newspapers.id, sub.newspaperId) });
    if (!user || !newspaper) return;

    const tokenExpiresAt = new Date(Date.now() + SEVEN_DAYS_MS);
    const [token] = await db
        .insert(subscriptionTokens)
        .values({ userId: sub.userId, newspaperId: sub.newspaperId, expiresAt: tokenExpiresAt })
        .returning();

    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
    const confirmUrl = `${frontendUrl}/${newspaper.slug}/subscription/confirm?token=${token!.id}`;
    const qrDataUrl = await QRCode.toDataURL(confirmUrl);

    await sendSubscriptionRenewalEmail(user.email, newspaper.name, sub.expiresAt, qrDataUrl, confirmUrl);
    logger.info("Renewal email sent", { userId: sub.userId, newspaperId: sub.newspaperId });
}
