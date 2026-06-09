import { eq, and } from "drizzle-orm";
import type { Tx } from "../db/rls";
import { users, userRoles, globalRoles, newspapers } from "../db/schema";
import { logger } from "../utils/logger";
import {
	sendAuthorStateChangeEmail,
	sendEditorAssignmentEmail,
	sendManagerArticleReadyEmail,
	sendDirectorArticleReadyEmail,
} from "../utils/email";

const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";

function dispatch(promise: Promise<unknown>, context: Record<string, unknown>): void {
	void promise.catch((err) => logger.warn("notification email failed", { ...context, err }));
}

function newspaperDashboardLink(slug: string): string {
	return `${frontendUrl}/${slug}/author-dashboard`;
}

function directorDashboardLink(): string {
	return `${frontendUrl}/director/dashboard`;
}

function articlePublicLink(slug: string, articleId: string): string {
	return `${frontendUrl}/${slug}/articles/${articleId}`;
}

async function getNewspaperSlug(tx: Tx, newspaperId: string): Promise<string | null> {
	const newspaper = await tx.query.newspapers.findFirst({
		where: eq(newspapers.id, newspaperId),
	});
	return newspaper?.slug ?? null;
}

async function getManagerEmails(tx: Tx, newspaperId: string): Promise<Array<{ email: string; fullname: string | null }>> {
	const managerRoles = await tx.query.userRoles.findMany({
		where: and(
			eq(userRoles.newspaperId, newspaperId),
			eq(userRoles.role, "NEWSPAPER_MANAGER"),
		),
	});

	const result: Array<{ email: string; fullname: string | null }> = [];
	for (const r of managerRoles) {
		if (!r.userId) continue;
		const user = await tx.query.users.findFirst({ where: eq(users.id, r.userId) });
		if (user?.email) result.push({ email: user.email, fullname: user.fullname ?? null });
	}
	return result;
}

async function getDirectorEmail(tx: Tx): Promise<{ email: string; fullname: string | null } | null> {
	const directorRole = await tx.query.globalRoles.findFirst({
		where: eq(globalRoles.role, "DIRECTOR"),
	});
	if (!directorRole) return null;
	const user = await tx.query.users.findFirst({ where: eq(users.id, directorRole.userId) });
	if (!user?.email) return null;
	return { email: user.email, fullname: user.fullname ?? null };
}

export async function notifyArticleSubmitted(
	tx: Tx,
	article: { id: string; title: string; newspaperId: string },
): Promise<void> {
	try {
		const managers = await getManagerEmails(tx, article.newspaperId);
		if (managers.length === 0) {
			logger.warn("notifyArticleSubmitted: no managers found", { newspaperId: article.newspaperId });
		}
		const slug = await getNewspaperSlug(tx, article.newspaperId);
		if (!slug) return;
		const link = newspaperDashboardLink(slug);
		dispatch(
			Promise.all(managers.map((m) => sendManagerArticleReadyEmail(m.email, article.title, link))),
			{ event: "notifyArticleSubmitted", articleId: article.id },
		);
	} catch (err) {
		logger.warn("notifyArticleSubmitted failed", { articleId: article.id, err });
	}
}

export async function notifyEditorAssigned(
	tx: Tx,
	article: { id: string; title: string; authorId: string; newspaperId: string },
	editor: { id: string; email: string },
): Promise<void> {
	try {
		const author = await tx.query.users.findFirst({ where: eq(users.id, article.authorId) });
		const slug = await getNewspaperSlug(tx, article.newspaperId);
		const link = slug ? newspaperDashboardLink(slug) : frontendUrl;

		dispatch(
			Promise.all([
				editor.email
					? sendEditorAssignmentEmail(editor.email, article.title, link)
					: Promise.resolve(),
				author?.email
					? sendAuthorStateChangeEmail(author.email, article.title, "IN_REVIEW")
					: Promise.resolve(),
			]),
			{ event: "notifyEditorAssigned", articleId: article.id },
		);
	} catch (err) {
		logger.warn("notifyEditorAssigned failed", { articleId: article.id, err });
	}
}

export async function notifyEditorReviewed(
	tx: Tx,
	article: { id: string; title: string; authorId: string; newspaperId: string },
	newState: string,
	feedback: string | null,
	reviewerName: string | null,
): Promise<void> {
	try {
		const author = await tx.query.users.findFirst({ where: eq(users.id, article.authorId) });
		if (author?.email) {
			dispatch(
				sendAuthorStateChangeEmail(author.email, article.title, newState, feedback, reviewerName),
				{ event: "notifyEditorReviewed", articleId: article.id },
			);
		}

		if (newState === "APPROVED_BY_EDITOR") {
			const managers = await getManagerEmails(tx, article.newspaperId);
			if (managers.length === 0) {
				logger.warn("notifyEditorReviewed: no managers found", { newspaperId: article.newspaperId });
			}
			const slug = await getNewspaperSlug(tx, article.newspaperId);
			if (slug) {
				const link = newspaperDashboardLink(slug);
				dispatch(
					Promise.all(managers.map((m) => sendManagerArticleReadyEmail(m.email, article.title, link))),
					{ event: "notifyEditorReviewed", articleId: article.id },
				);
			}
		}
	} catch (err) {
		logger.warn("notifyEditorReviewed failed", { articleId: article.id, err });
	}
}

export async function notifyManagerApproved(
	tx: Tx,
	article: { id: string; title: string; authorId: string },
	newState: string,
	feedback: string | null,
	reviewerName: string | null,
): Promise<void> {
	try {
		const author = await tx.query.users.findFirst({ where: eq(users.id, article.authorId) });
		if (author?.email) {
			dispatch(
				sendAuthorStateChangeEmail(author.email, article.title, newState, feedback, reviewerName),
				{ event: "notifyManagerApproved", articleId: article.id },
			);
		}

		if (newState === "APPROVED_BY_MANAGER") {
			const director = await getDirectorEmail(tx);
			if (!director) {
				logger.warn("notifyManagerApproved: no director found");
			} else {
				dispatch(
					sendDirectorArticleReadyEmail(director.email, article.title, directorDashboardLink()),
					{ event: "notifyManagerApproved", articleId: article.id },
				);
			}
		}
	} catch (err) {
		logger.warn("notifyManagerApproved failed", { articleId: article.id, err });
	}
}

export async function notifyDirectorApproved(
	tx: Tx,
	article: { id: string; title: string; authorId: string },
	newState: string,
	feedback: string | null,
	reviewerName: string | null,
): Promise<void> {
	try {
		const author = await tx.query.users.findFirst({ where: eq(users.id, article.authorId) });
		if (author?.email) {
			dispatch(
				sendAuthorStateChangeEmail(author.email, article.title, newState, feedback, reviewerName),
				{ event: "notifyDirectorApproved", articleId: article.id },
			);
		}
	} catch (err) {
		logger.warn("notifyDirectorApproved failed", { articleId: article.id, err });
	}
}

export async function notifyArticlePublished(
	tx: Tx,
	article: { id: string; title: string; authorId: string; newspaperId: string },
): Promise<void> {
	try {
		const author = await tx.query.users.findFirst({ where: eq(users.id, article.authorId) });
		const slug = await getNewspaperSlug(tx, article.newspaperId);
		const link = slug ? articlePublicLink(slug, article.id) : null;
		if (author?.email) {
			dispatch(
				sendAuthorStateChangeEmail(author.email, article.title, "PUBLISHED", null, null, link),
				{ event: "notifyArticlePublished", articleId: article.id },
			);
		}
	} catch (err) {
		logger.warn("notifyArticlePublished failed", { articleId: article.id, err });
	}
}
