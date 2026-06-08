import { Elysia } from "elysia";
import { auth } from "../middleware/auth";
import {
	newspaperOnlyParams, articleRouteParams, articleImageParams,
	articlesListQuery, articlesSearchQuery, articlesMineQuery,
	articlesQueueQuery,
	createArticleBody, updateArticleBody, articleTransitionBody,
	subscriberOnlyBody,
} from "../schemas/articles";
import * as articleService from "../services/articles";

export const articleRoutes = new Elysia({ detail: { tags: ["Articles"] } })
    .use(auth)

    // ── GET /api/newspapers/:newspaper_id/articles/search ─────────────────
    .get(
        "/api/newspapers/:newspaper_id/articles/search",
        ({ params, query, withDb }) =>
            withDb((tx) => articleService.searchArticles(tx, params.newspaper_id, query)), {
        params: newspaperOnlyParams,
        query: articlesSearchQuery,
    })

    // ── GET /api/newspapers/:newspaper_id/articles/mine ───────────────────
    .get(
        "/api/newspapers/:newspaper_id/articles/mine",
        ({ params, user, roles, query, withDb }) =>
            withDb((tx) => articleService.listMyArticles(tx, params.newspaper_id, user, roles, query)), {
        requireAuth: true,
        params: newspaperOnlyParams,
        query: articlesMineQuery,
    })

    // ── GET /api/newspapers/:newspaper_id/articles/mine/:article_id ──────
    .get(
        "/api/newspapers/:newspaper_id/articles/mine/:article_id",
        ({ params, user, roles, withDb }) =>
            withDb((tx) => articleService.getMyArticle(tx, params.newspaper_id, params.article_id, user, roles)), {
        requireAuth: true,
        params: articleRouteParams,
    })

    // ── GET /api/newspapers/:newspaper_id/articles/queue ─────────────────
    .get(
        "/api/newspapers/:newspaper_id/articles/queue",
        ({ params, user, roles, query, withDb }) =>
            withDb((tx) => articleService.getReviewQueue(tx, params.newspaper_id, user, roles, query)), {
        requireAuth: true,
        params: newspaperOnlyParams,
        query: articlesQueueQuery,
    })

    // ── GET /api/newspapers/:newspaper_id/articles ────────────────────────
    .get(
        "/api/newspapers/:newspaper_id/articles",
        ({ params, query, withDb }) =>
            withDb((tx) => articleService.listArticles(tx, params.newspaper_id, query)), {
        params: newspaperOnlyParams,
        query: articlesListQuery,
    })

    // ── GET /api/newspapers/:newspaper_id/articles/:article_id ────────────
    .get(
        "/api/newspapers/:newspaper_id/articles/:article_id",
        ({ params, user, withDb }) =>
            withDb((tx) => articleService.getArticle(tx, params.newspaper_id, params.article_id, user)), {
        requireAuth: true,
        params: articleRouteParams,
    })

    // ── POST /api/newspapers/:newspaper_id/articles ───────────────────────
    .post(
        "/api/newspapers/:newspaper_id/articles",
        async ({ params, user, roles, body, withDb, set }) => {
            const result = await withDb((tx) =>
                articleService.createArticle(tx, params.newspaper_id, user, roles, body),
            );
            set.status = 201;
            return result;
        }, {
        requireAuth: true,
        params: newspaperOnlyParams,
        body: createArticleBody,
    })

    // ── PATCH /api/newspapers/:newspaper_id/articles/:article_id ──────────
    .patch(
        "/api/newspapers/:newspaper_id/articles/:article_id",
        ({ params, user, roles, body, withDb }) =>
            withDb((tx) => articleService.updateArticle(tx, params.newspaper_id, params.article_id, user, roles, body)), {
        requireAuth: true,
        params: articleRouteParams,
        body: updateArticleBody,
    })

    // ── DELETE /api/newspapers/:newspaper_id/articles/:article_id ─────────
    .delete(
        "/api/newspapers/:newspaper_id/articles/:article_id",
        async ({ params, user, roles, withDb, set }) => {
            await withDb((tx) =>
                articleService.deleteArticle(tx, params.newspaper_id, params.article_id, user, roles),
            );
            set.status = 204;
            return null;
        }, {
        requireAuth: true,
        params: articleRouteParams,
    })

    // ── PATCH .../articles/:article_id/status ────────────────────────────
    .patch(
        "/api/newspapers/:newspaper_id/articles/:article_id/status",
        ({ params, user, roles, body, withDb }) =>
            withDb((tx) => {
                const { newspaper_id, article_id } = params;
                switch (body.action) {
                    case "SUBMIT":
                        return articleService.submitArticle(tx, newspaper_id, article_id, user, roles);
                    case "ASSIGN_EDITOR":
                        return articleService.assignEditor(tx, newspaper_id, article_id, user, roles, { editor_id: body.editor_id });
                    case "REVIEW":
                        return articleService.reviewArticle(tx, newspaper_id, article_id, user, roles, { decision: body.decision, note: body.note });
                    case "APPROVE":
                        return articleService.approveArticle(tx, newspaper_id, article_id, user, roles, { decision: body.decision, note: body.note }, { view: body.view });
                    case "SCHEDULE":
                        return articleService.scheduleArticle(tx, newspaper_id, article_id, user, roles, { publication_date: body.publication_date });
                    case "PUBLISH":
                        return articleService.publishArticle(tx, newspaper_id, article_id, user, roles);
                }
            }), {
        requireAuth: true,
        params: articleRouteParams,
        body: articleTransitionBody,
    })

    // ── POST .../articles/:article_id/images ─────────────────────────────
    .post(
        "/api/newspapers/:newspaper_id/articles/:article_id/images",
        async ({ params, user, roles, request, withDb, set }) => {
            const result = await withDb((tx) =>
                articleService.uploadArticleImage(tx, params.newspaper_id, params.article_id, user, roles, request),
            );
            set.status = 201;
            return result;
        }, {
        requireAuth: true,
        params: articleRouteParams,
    })

    // ── DELETE .../articles/:article_id/images/:image_id ─────────────────
    .delete(
        "/api/newspapers/:newspaper_id/articles/:article_id/images/:image_id",
        async ({ params, user, roles, withDb, set }) => {
            await withDb((tx) =>
                articleService.deleteArticleImage(tx, params.newspaper_id, params.article_id, params.image_id, user, roles),
            );
            set.status = 204;
            return null;
        }, {
        requireAuth: true,
        params: articleImageParams,
    })

    // ── PATCH .../articles/:article_id/subscriber-only — NEWSPAPER_MANAGER
    .patch(
        "/api/newspapers/:newspaper_id/articles/:article_id/subscriber-only",
        ({ params, user, roles, body, withDb }) =>
            withDb((tx) => articleService.setSubscriberOnly(tx, params.newspaper_id, params.article_id, user, roles, body.is_subscriber_only)), {
        requireAuth: true,
        params: articleRouteParams,
        body: subscriberOnlyBody,
    });