import { t } from "elysia";
import { createInsertSchema } from "drizzle-typebox";
import { articles, users, comments } from "./schema";

const Uuid = t.String({ format: "uuid" });
const Email = t.String({ format: "email" });
const Page = t.Numeric({ minimum: 1, default: 1 });
const limitOpts = (max: number, def: number) =>
	t.Numeric({ minimum: 1, maximum: max, default: def });

const RoleEnum = t.Union([
	t.Literal("REGISTERED_USER"),
	t.Literal("AUTHOR"),
	t.Literal("EDITOR"),
	t.Literal("NEWSPAPER_MANAGER"),
	t.Literal("DIRECTOR"),
	t.Literal("SYSTEM_ADMINISTRATOR"),
]);

const _articleInsert = createInsertSchema(articles, {
	title: t.String({ minLength: 1, maxLength: 255 }),
	perex: t.String({ minLength: 1, maxLength: 1000 }),
	content: t.String({ minLength: 1, maxLength: 200_000 }),
});

const _userInsert = createInsertSchema(users, {
	email: Email,
	username: t.String({
		minLength: 3,
		maxLength: 63,
		pattern: "^[A-Za-z0-9_]+$",
	}),
	fullname: t.String({ minLength: 1, maxLength: 127 }),
});

const _commentInsert = createInsertSchema(comments, {
	content: t.String({ minLength: 1, maxLength: 2000 }),
});

const Keywords = t.Optional(t.Union([t.String(), t.Array(t.String())]));

export const newspaperOnlyParams = t.Object({ newspaper_id: Uuid });
export const articleRouteParams = t.Object({
	newspaper_id: Uuid,
	article_id: Uuid,
});
export const articleImageParams = t.Object({
	newspaper_id: Uuid,
	article_id: Uuid,
	image_id: Uuid,
});

export const articlesListQuery = t.Object({
	page: Page,
	limit: limitOpts(50, 20),
	category: t.Optional(t.String({ minLength: 1 })),
});

export const articlesSearchQuery = t.Object({
	page: Page,
	limit: limitOpts(50, 20),
	q: t.String({ minLength: 1 }),
	category: t.Optional(t.String({ minLength: 1 })),
	date_from: t.Optional(t.String({ format: "date-time" })),
	date_to: t.Optional(t.String({ format: "date-time" })),
});

export const articlesMineQuery = t.Object({
	page: Page,
	limit: limitOpts(50, 20),
	status: t.Optional(t.String({ minLength: 1 })),
});

export const articlesQueueQuery = articlesMineQuery;

export const createArticleBody = t.Composite([
	t.Pick(_articleInsert, ["title", "perex", "content"]),
	t.Object({
		category_id: t.Optional(Uuid),
		keywords: Keywords,
	}),
]);

export const updateArticleBody = t.Object({
	title: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
	perex: t.Optional(t.String({ minLength: 1, maxLength: 1000 })),
	content: t.Optional(t.String({ minLength: 1, maxLength: 200_000 })),
	category_id: t.Optional(t.Union([Uuid, t.Null()])),
	keywords: Keywords,
});

export const assignEditorBody = t.Object({ editor_id: Uuid });

export const reviewBody = t.Object({
	decision: t.Union([
		t.Literal("APPROVE"),
		t.Literal("REJECT"),
		t.Literal("REQUEST_REVISION"),
	]),
	note: t.Optional(t.String({ minLength: 1 })),
});

export const scheduleBody = t.Object({
	publication_date: t.String({ format: "date-time" }),
});

export const registerInput = t.Composite([
	t.Pick(_userInsert, ["email", "username"]),
	t.Object({
		password: t.String({ minLength: 8, maxLength: 128 }),
		full_name: t.Optional(t.String({ minLength: 1, maxLength: 127 })),
		newspaper_id: Uuid,
	}),
]);

export const loginInput = t.Object({
	email: Email,
	password: t.String({ minLength: 1 }),
	newspaper_id: Uuid,
});

export const verifyEmailInput = t.Object({
	token: t.String({ minLength: 1 }),
});

export const forgotPasswordInput = t.Object({
	email: Email,
	newspaper_id: Uuid,
});

export const resetPasswordInput = t.Object({
	token: t.String({ minLength: 1 }),
	password: t.String({ minLength: 8, maxLength: 128 }),
});

export const resendVerificationInput = t.Object({
	email: Email,
	newspaper_id: Uuid,
});

export const updateMeBody = t.Object({
	username: t.Optional(
		t.String({ minLength: 3, maxLength: 63, pattern: "^[A-Za-z0-9_]+$" })
	),
	full_name: t.Optional(t.String({ minLength: 1, maxLength: 127 })),
	password: t.Optional(t.String({ minLength: 8, maxLength: 128 })),
	bio: t.Optional(t.String({ maxLength: 2000 })),
});

export const authorRouteParams = t.Object({
	newspaper_id: Uuid,
	author_id: Uuid,
});

export const authorArticlesQuery = t.Object({
	page: Page,
	limit: limitOpts(50, 20),
});

export const categoryListParams = t.Object({ newspaper_id: Uuid });

export const categoryRouteParams = t.Object({
	newspaper_id: Uuid,
	category_id: Uuid,
});

export const categoryBody = t.Object({
	name: t.String({ minLength: 1, maxLength: 255 }),
});

export const commentCreateParams = t.Object({
	newspaper_id: Uuid,
	article_id: Uuid,
});

export const commentDeleteParams = t.Object({
	newspaper_id: Uuid,
	article_id: Uuid,
	comment_id: Uuid,
});

export const commentModerationParams = t.Object({ newspaper_id: Uuid });

export const commentBody = t.Pick(_commentInsert, ["content"]);

export const commentModerationQuery = t.Object({
	page: Page,
	limit: limitOpts(100, 50),
	article_id: t.Optional(Uuid),
});

export const likeRouteParams = t.Object({
	newspaper_id: Uuid,
	article_id: Uuid,
});

export const newspaperIdParam = t.Object({ newspaper_id: Uuid });

export const adminUsersListParams = t.Object({ newspaper_id: Uuid });

export const adminUsersListQuery = t.Object({
	page: Page,
	limit: limitOpts(100, 50),
});

export const assignRoleParams = t.Object({
	newspaper_id: Uuid,
	user_id: Uuid,
});

export const removeRoleParams = t.Object({
	newspaper_id: Uuid,
	user_id: Uuid,
	role: RoleEnum,
});

export const statisticsParams = t.Object({ newspaper_id: Uuid });

export const assignRoleBody = t.Object({ role: RoleEnum });

export const adminConfigBody = t.Object({
	email: t.Optional(
		t.Object({
			smtp_host: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
			smtp_port: t.Optional(t.Numeric({ minimum: 1, maximum: 65535 })),
			sender_address: t.Optional(Email),
		})
	),
	security: t.Optional(
		t.Object({
			jwt_expiry_hours: t.Optional(t.Numeric({ minimum: 1, maximum: 24 * 365 })),
			password_reset_token_expiry_minutes: t.Optional(
				t.Numeric({ minimum: 1, maximum: 60 * 24 })
			),
			verification_token_expiry_hours: t.Optional(
				t.Numeric({ minimum: 1, maximum: 24 * 30 })
			),
			max_login_attempts: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
		})
	),
	uploads: t.Optional(
		t.Object({
			max_image_size_mb: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
			allowed_image_types: t.Optional(t.Array(t.String({ minLength: 1 }))),
		})
	),
});
