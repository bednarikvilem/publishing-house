import { db } from "../db";
import { newspapers, newspaperAuthors, articles, users } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../utils/logger";
import { NotFoundError } from "../errors";

export async function getAuthorProfile(
    newspaperId: string,
    authorId: string,
    page: number,
    limit: number,
) {
    const newspaper = await db.query.newspapers.findFirst({
        where: eq(newspapers.id, newspaperId),
    });
    if (!newspaper) {
        logger.warn("Author fetch failed: newspaper not found", { newspaperId, authorId });
        throw new NotFoundError("NEWSPAPER_NOT_FOUND");
    }

    const authorProfile = await db.query.newspaperAuthors.findFirst({
        where: and(
            eq(newspaperAuthors.userId, authorId),
            eq(newspaperAuthors.newspaperId, newspaperId),
        ),
    });
    if (!authorProfile) {
        logger.warn("Author fetch failed: author not linked to newspaper", { newspaperId, authorId });
        throw new NotFoundError("AUTHOR_NOT_FOUND");
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, authorId) });
    if (!user) {
        logger.warn("Author fetch failed: user not found", { authorId });
        throw new NotFoundError("AUTHOR_NOT_FOUND");
    }

    const offset = (page - 1) * limit;

    const allArticles = await db.query.articles.findMany({
        where: and(
            eq(articles.authorId, authorId),
            eq(articles.newspaperId, newspaperId),
            eq(articles.state, "PUBLISHED"),
        ),
        with: { category: true, images: true },
    });

    const total = allArticles.length;
    const paged = allArticles.slice(offset, offset + limit);

    logger.info("Author profile fetched", {
        newspaperId,
        authorId,
        page,
        limit,
        resultCount: paged.length,
    });

    return {
        id: user.id,
        full_name: user.fullname,
        username: user.username,
        bio: authorProfile.biography,
        profile_picture: authorProfile.profilePictureUrl,
        articles: {
            data: paged.map(a => {
                const primary = (a as any).images?.find((i: any) => i.isPrimary) ?? (a as any).images?.[0];
                return {
                    id: a.id,
                    title: a.title,
                    perex: a.perex,
                    publication_date: a.publicationDate,
                    category: (a as any).category?.categoryName ?? null,
                    keywords: a.keywords ? a.keywords.split(",").map((k: string) => k.trim()) : [],
                    primary_image: primary ? { url: primary.url, caption: primary.caption } : null,
                };
            }),
            pagination: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit),
            },
        },
    };
}
