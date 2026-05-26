import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import {
	newspaperOnlyParams, articleRouteParams, articleImageParams,
	articlesListQuery, articlesSearchQuery, articlesMineQuery,
	articlesQueueQuery, articleApproveQuery,
	createArticleBody, updateArticleBody, assignEditorBody, reviewBody,
	scheduleBody,
} from "../schemas/articles";
import * as articleService from "../services/articles";

export const articleRoutes = new Elysia({ detail: { tags: ["Articles"] } })
    .use(authMiddleware)

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
        params: newspaperOnlyParams,
        query: articlesMineQuery,
    })

    // ── GET /api/newspapers/:newspaper_id/articles/mine/:article_id ──────
    .get(
        "/api/newspapers/:newspaper_id/articles/mine/:article_id",
        ({ params, user, roles, withDb }) =>
            withDb((tx) => articleService.getMyArticle(tx, params.newspaper_id, params.article_id, user, roles)), {
        params: articleRouteParams,
    })

    // ── GET /api/newspapers/:newspaper_id/articles/queue ─────────────────
    .get(
        "/api/newspapers/:newspaper_id/articles/queue",
        ({ params, user, roles, query, withDb }) =>
            withDb((tx) => articleService.getReviewQueue(tx, params.newspaper_id, user, roles, query)), {
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
        params: newspaperOnlyParams,
        body: createArticleBody,
    })

    // ── PUT /api/newspapers/:newspaper_id/articles/:article_id ────────────
    .put(
        "/api/newspapers/:newspaper_id/articles/:article_id",
        ({ params, user, roles, body, withDb }) =>
            withDb((tx) => articleService.updateArticle(tx, params.newspaper_id, params.article_id, user, roles, body)), {
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
        params: articleRouteParams,
    })

    // ── POST .../articles/:article_id/submit ─────────────────────────────
    .post(
        "/api/newspapers/:newspaper_id/articles/:article_id/submit",
        ({ params, user, roles, withDb }) =>
            withDb((tx) => articleService.submitArticle(tx, params.newspaper_id, params.article_id, user, roles)), {
        params: articleRouteParams,
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
        params: articleImageParams,
    })

    // ── POST .../articles/:article_id/assign-editor ───────────────────────
    .post(
        "/api/newspapers/:newspaper_id/articles/:article_id/assign-editor",
        ({ params, user, roles, body, withDb }) =>
            withDb((tx) => articleService.assignEditor(tx, params.newspaper_id, params.article_id, user, roles, body)), {
        params: articleRouteParams,
        body: assignEditorBody,
    })

    // ── POST .../articles/:article_id/review ─────────────────────────────
    .post(
        "/api/newspapers/:newspaper_id/articles/:article_id/review",
        ({ params, user, roles, body, withDb }) =>
            withDb((tx) => articleService.reviewArticle(tx, params.newspaper_id, params.article_id, user, roles, body)), {
        params: articleRouteParams,
        body: reviewBody,
    })

    // ── POST .../articles/:article_id/approve ─────────────────────────────
    .post(
        "/api/newspapers/:newspaper_id/articles/:article_id/approve",
        ({ params, user, roles, body, query, withDb }) =>
            withDb((tx) => articleService.approveArticle(tx, params.newspaper_id, params.article_id, user, roles, body, query)), {
        params: articleRouteParams,
        body: reviewBody,
        query: articleApproveQuery,
    })

    // ── POST .../articles/:article_id/schedule ────────────────────────────
    .post(
        "/api/newspapers/:newspaper_id/articles/:article_id/schedule",
        ({ params, user, roles, body, withDb }) =>
            withDb((tx) => articleService.scheduleArticle(tx, params.newspaper_id, params.article_id, user, roles, body)), {
        params: articleRouteParams,
        body: scheduleBody,
    })

    // ── POST .../articles/:article_id/publish ─────────────────────────────
    .post(
        "/api/newspapers/:newspaper_id/articles/:article_id/publish",
        ({ params, user, roles, withDb }) =>
            withDb((tx) => articleService.publishArticle(tx, params.newspaper_id, params.article_id, user, roles)), {
        params: articleRouteParams,
    });
