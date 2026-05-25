import { uploadImage } from "../utils/storage";
import { users, newspaperAuthors } from "../db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { logger } from "../utils/logger";
import { audit } from "../utils/audit";
import { ConflictError, ForbiddenError, UnauthorizedError, UnprocessableError } from "../errors";
import type { AuthUser, Roles } from "./context";
import type { Static } from "elysia";
import type { updateMeBody } from "../schemas/users";
import type { Tx } from "../db/rls";

export async function getMe(tx: Tx, user: AuthUser | null, roles: Roles) {
    if (!user) {
        logger.warn("Fetch current user failed: unauthorized", {});
        throw new UnauthorizedError("UNAUTHORIZED");
    }

    const authorProfile = user.newspaperId
        ? await tx.query.newspaperAuthors.findFirst({
            where: and(
                eq(newspaperAuthors.userId, user.id),
                eq(newspaperAuthors.newspaperId, user.newspaperId),
            ),
        })
        : null;

    logger.debug("Fetched current user profile", { userId: user.id });

    return {
        id: user.id,
        email: user.email,
        username: user.username,
        full_name: user.fullname,
        email_verified: user.email_verified,
        profile_picture: authorProfile?.profilePictureUrl ?? null,
        bio: authorProfile?.biography ?? null,
        roles,
    };
}

export async function updateMe(
    tx: Tx,
    user: AuthUser | null,
    roles: Roles,
    body: Static<typeof updateMeBody>,
) {
    if (!user) throw new UnauthorizedError("UNAUTHORIZED");

    const { username, full_name, bio, password } = body;

    if (bio !== undefined && !roles.includes("AUTHOR")) {
        throw new ForbiddenError("FORBIDDEN");
    }

    if (username) {
        const existing = user.newspaperId
            ? await tx.query.users.findFirst({
                where: and(eq(users.username, username), eq(users.newspaperId, user.newspaperId)),
            })
            : await tx.query.users.findFirst({
                where: and(eq(users.username, username), isNull(users.newspaperId)),
            });
        if (existing && existing.id !== user.id) {
            logger.warn("Profile update failed: username taken", { userId: user.id, username });
            throw new ConflictError("USERNAME_TAKEN");
        }
    }

    const updateData: Partial<typeof users.$inferInsert> = {};
    if (username !== undefined) updateData.username = username;
    if (full_name !== undefined) updateData.fullname = full_name;
    if (password) updateData.passwordHash = await Bun.password.hash(password);

    if (Object.keys(updateData).length > 0) {
        await tx.update(users).set(updateData).where(eq(users.id, user.id));
    }

    if (bio !== undefined && user.newspaperId) {
        const authorProfile = await tx.query.newspaperAuthors.findFirst({
            where: and(
                eq(newspaperAuthors.userId, user.id),
                eq(newspaperAuthors.newspaperId, user.newspaperId),
            ),
        });
        if (authorProfile) {
            await tx
                .update(newspaperAuthors)
                .set({ biography: bio })
                .where(eq(newspaperAuthors.id, authorProfile.id));
        }
    }

    const updated = await tx.query.users.findFirst({ where: eq(users.id, user.id) });

    await audit({ userId: user.id, operationType: "USER_PROFILE_UPDATED", targetObjectId: user.id, result: "SUCCESS" });
    logger.info("User profile updated", { userId: user.id, fields: Object.keys(updateData) });

    return {
        id: updated!.id,
        email: updated!.email,
        username: updated!.username,
        full_name: updated!.fullname,
        bio,
    };
}

// `request` is passed in to parse the multipart body — transport I/O the
// handler tightly couples with validation/upload error shaping. The service
// never reads routing/status from it.
export async function updateProfilePicture(
    tx: Tx,
    user: AuthUser | null,
    roles: Roles,
    request: Request,
) {
    if (!user) throw new UnauthorizedError("UNAUTHORIZED");
    if (!roles.includes("AUTHOR")) throw new ForbiddenError("FORBIDDEN");

    let profilePictureUrl: string | null = null;

    try {
        const contentType = request.headers.get("content-type") ?? "";
        if (contentType.includes("multipart/form-data")) {
            const formData = await request.formData();
            const file = formData.get("profile_picture");
            if (!file || typeof file === "string") {
                logger.warn("Profile picture upload failed: missing file", { userId: user.id });
                throw new UnprocessableError("VALIDATION_ERROR");
            }
            const blob = file as Blob;
            if (!["image/jpeg", "image/png"].includes(blob.type)) {
                throw new UnprocessableError("VALIDATION_ERROR");
            }
            if (blob.size > 5 * 1024 * 1024) {
                throw new UnprocessableError("VALIDATION_ERROR");
            }
            const buffer = Buffer.from(await blob.arrayBuffer());
            profilePictureUrl = await uploadImage(buffer, blob.type, "profiles");
        }
    } catch (e) {
        if (e instanceof UnprocessableError) {
            throw new UnprocessableError("VALIDATION_ERROR", {
                fields: { profile_picture: "Must be a JPEG or PNG image under 5 MB" },
            });
        }
        throw new UnprocessableError("VALIDATION_ERROR", {
            fields: { profile_picture: "Invalid file" },
        });
    }

    if (!user.newspaperId) {
        throw new UnprocessableError("GLOBAL_USER_NO_PROFILE");
    }

    const existing = await tx.query.newspaperAuthors.findFirst({
        where: and(
            eq(newspaperAuthors.userId, user.id),
            eq(newspaperAuthors.newspaperId, user.newspaperId),
        ),
    });

    if (existing) {
        await tx
            .update(newspaperAuthors)
            .set({ profilePictureUrl })
            .where(eq(newspaperAuthors.id, existing.id));
    } else {
        await tx.insert(newspaperAuthors).values({
            userId: user.id,
            newspaperId: user.newspaperId,
            profilePictureUrl,
        });
    }

    await audit({ userId: user.id, operationType: "PROFILE_PICTURE_UPDATED", targetObjectId: user.id, result: "SUCCESS" });
    logger.info("Profile picture updated", { userId: user.id });

    return { profile_picture: profilePictureUrl };
}
