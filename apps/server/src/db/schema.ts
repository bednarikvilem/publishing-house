import { pgTable, text, varchar, timestamp, uuid, boolean, primaryKey, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';
export * from "./enums";
import { articleStateEnum, userRolesEnum, auditResultEnum, reviewDecisionsEnum } from "./enums";

export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    newspaperId: uuid("newspaper_id"),
    email: varchar("email", { length: 255 }).notNull(),
    username: varchar("username", { length: 63 }).notNull(),
    fullname: varchar("fullname", { length: 127 }),
    passwordHash: text("password_hash").notNull(),
    email_verified: boolean("email_verified"),
}, (table) => ([
    uniqueIndex("email_newspaper_idx").on(table.email, table.newspaperId),
]));

export const publishingHouses = pgTable("publishing_houses", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    directorId: uuid("director_id")
        .references(() => users.id, { onDelete: "set null" }),
});

export const newspapers = pgTable("newspapers", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    publishingHouseId: uuid("publishing_house_id")
        .notNull()
        .references(() => publishingHouses.id, { onDelete: "cascade" }),
    managerId: uuid("manager_id")
        .references(() => users.id, { onDelete: "set null" }),
});

export const usersRelations = relations(users, ({ one }) => ({
    newspaper: one(newspapers, {
        fields: [users.newspaperId],
        references: [newspapers.id],
    }),
}));

export const userRoles = pgTable("user_roles", {
    userId: uuid("user_id").references(() => users.id),
    newspaperId: uuid("newspaper_id").references(() => newspapers.id),
    role: userRolesEnum("user_role")
}, (table) => ({
    pk: primaryKey({ columns: [table.userId, table.newspaperId, table.role] })
}));

export const newspaperAuthors = pgTable("newspaper_authors", {
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),

    newspapersId: uuid("newspapers_id")
        .notNull()
        .references(() => newspapers.id, { onDelete: "cascade" }),

    workingFrom: timestamp("working_from").defaultNow(),
    biography: text("biography"),
    profilePicture: text("profile_picture"), // URL - for authors
}, (table) => ({
    pk: primaryKey({ columns: [table.userId, table.newspapersId] }),
}));

export const articles = pgTable("articles", {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 255 }).notNull(),
    perex: text("perex").notNull(),
    content: text("content").notNull(),
    keywords: text("keywords"),
    state: articleStateEnum("article_state").default("DRAFT"),
    authorId: uuid("author_id").notNull().references(() => users.id),
    newspaperId: uuid("newspaper_id").notNull().references(() => newspapers.id),
    categoryId: uuid("category_id").references(() => articleCategory.id),
    publicationDate: timestamp("publication_date"),
    createdAt: timestamp("created_at").defaultNow()
});

export const articleCategory = pgTable("article_category", {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryName: varchar("category_name", { length: 255 }).notNull(),
});

export const articleImages = pgTable("article_images", {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
        .notNull()
        .references(() => articles.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    caption: text("caption"),
    isPrimary: boolean("is_primary").default(false).notNull(),
});

export const comments = pgTable("comments", {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
        .notNull()
        .references(() => articles.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const likes = pgTable("likes", {
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    articleId: uuid("article_id")
        .notNull()
        .references(() => articles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    pk: primaryKey({ columns: [table.userId, table.articleId] }),
}));

export const articleReviews = pgTable("article_reviews", {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
        .notNull()
        .references(() => articles.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    feedback: text("feedback"),
    decision: reviewDecisionsEnum("decision").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    operationType: varchar("operation_type", { length: 255 }).notNull(),
    targetObjectId: uuid("target_object_id"),
    result: auditResultEnum("result").notNull(),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
});