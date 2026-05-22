import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import {
	newspaperOnlyParams, articleRouteParams, articleImageParams,
	articlesListQuery, articlesSearchQuery, articlesMineQuery,
	articlesQueueQuery, articleApproveQuery,
	createArticleBody, updateArticleBody, assignEditorBody, reviewBody,
	scheduleBody, subscriberOnlyBody,
} from "../schemas/articles";
import * as articleService from "../services/articles";

export const articleRoutes = new Elysia({ detail: { tags: ["Articles"] } })
    .use(authMiddleware)

    // ── GET /api/newspapers/:newspaper_id/articles/search ─────────────────
    .get(
        "/api/newspapers/:newspaper_id/articles/search",
        ({ params, query }) => articleService.searchArticles(params.newspaper_id, query), {
        params: newspaperOnlyParams,
        query: articlesSearchQuery,
    })

    // ── GET /api/newspapers/:newspaper_id/articles/mine ───────────────────
    .get(
        "/api/newspapers/:newspaper_id/articles/mine",
        ({ params, user, roles, query }) =>
            articleService.listMyArticles(params.newspaper_id, user, roles, query), {
        params: newspaperOnlyParams,
        query: articlesMineQuery,
    })

    // ── GET /api/newspapers/:newspaper_id/articles/mine/:article_id ──────
    .get(
        "/api/newspapers/:newspaper_id/articles/mine/:article_id",
        ({ params, user, roles }) =>
            articleService.getMyArticle(params.newspaper_id, params.article_id, user, roles), {
        params: articleRouteParams,
    })

    // ── GET /api/newspapers/:newspaper_id/articles/queue ─────────────────
    .get(
        "/api/newspapers/:newspaper_id/articles/queue",
        ({ params, user, roles, query }) =>
            articleService.getReviewQueue(params.newspaper_id, user, roles, query), {
        params: newspaperOnlyParams,
        query: articlesQueueQuery,
    })

    // ── GET /api/newspapers/:newspaper_id/articles ────────────────────────
    .get(
        "/api/newspapers/:newspaper_id/articles",
        ({ params, query }) => articleService.listArticles(params.newspaper_id, query), {
        params: newspaperOnlyParams,
        query: articlesListQuery,
    })

    // ── GET /api/newspapers/:newspaper_id/articles/:article_id ────────────
    .get(
        "/api/newspapers/:newspaper_id/articles/:article_id",
        ({ params, user }) =>
            articleService.getArticle(params.newspaper_id, params.article_id, user), {
        params: articleRouteParams,
    })

    // ── POST /api/newspapers/:newspaper_id/articles ───────────────────────
    .post(
        "/api/newspapers/:newspaper_id/articles",
        async ({ params, user, roles, body, set }) => {
            const result = await articleService.createArticle(params.newspaper_id, user, roles, body);
            set.status = 201;
            return result;
        }, {
        params: newspaperOnlyParams,
        body: createArticleBody,
    })

    // ── PUT /api/newspapers/:newspaper_id/articles/:article_id ────────────
    .put(
        "/api/newspapers/:newspaper_id/articles/:article_id",
        ({ params, user, roles, body }) =>
            articleService.updateArticle(params.newspaper_id, params.article_id, user, roles, body), {
        params: articleRouteParams,
        body: updateArticleBody,
    })

    // ── DELETE /api/newspapers/:newspaper_id/articles/:article_id ─────────
    .delete(
        "/api/newspapers/:newspaper_id/articles/:article_id",
        async ({ params, user, roles, set }) => {
            await articleService.deleteArticle(params.newspaper_id, params.article_id, user, roles);
            set.status = 204;
            return null;
        }, {
        params: articleRouteParams,
    })

    // ── POST .../articles/:article_id/submit ─────────────────────────────
    .post(
        "/api/newspapers/:newspaper_id/articles/:article_id/submit",
        ({ params, user, roles }) =>
            articleService.submitArticle(params.newspaper_id, params.article_id, user, roles), {
        params: articleRouteParams,
    })

    // ── POST .../articles/:article_id/images ─────────────────────────────
    .post(
        "/api/newspapers/:newspaper_id/articles/:article_id/images",
        async ({ params, user, roles, request, set }) => {
            const result = await articleService.uploadArticleImage(
                params.newspaper_id, params.article_id, user, roles, request,
            );
            set.status = 201;
            return result;
        }, {
        params: articleRouteParams,
    })

    // ── DELETE .../articles/:article_id/images/:image_id ─────────────────
    .delete(
        "/api/newspapers/:newspaper_id/articles/:article_id/images/:image_id",
        async ({ params, user, roles, set }) => {
            await articleService.deleteArticleImage(
                params.newspaper_id, params.article_id, params.image_id, user, roles,
            );
            set.status = 204;
            return null;
        }, {
        params: articleImageParams,
    })

    // ── POST .../articles/:article_id/assign-editor ───────────────────────
    .post(
        "/api/newspapers/:newspaper_id/articles/:article_id/assign-editor",
        ({ params, user, roles, body }) =>
            articleService.assignEditor(params.newspaper_id, params.article_id, user, roles, body), {
        params: articleRouteParams,
        body: assignEditorBody,
    })

    // ── POST .../articles/:article_id/review ─────────────────────────────
    .post(
        "/api/newspapers/:newspaper_id/articles/:article_id/review",
        ({ params, user, roles, body }) =>
            articleService.reviewArticle(params.newspaper_id, params.article_id, user, roles, body), {
        params: articleRouteParams,
        body: reviewBody,
    })

    // ── POST .../articles/:article_id/approve ─────────────────────────────
    .post(
        "/api/newspapers/:newspaper_id/articles/:article_id/approve",
        ({ params, user, roles, body, query }) =>
            articleService.approveArticle(params.newspaper_id, params.article_id, user, roles, body, query), {
        params: articleRouteParams,
        body: reviewBody,
        query: articleApproveQuery,
    })

    // ── POST .../articles/:article_id/schedule ────────────────────────────
    .post(
        "/api/newspapers/:newspaper_id/articles/:article_id/schedule",
        ({ params, user, roles, body }) =>
            articleService.scheduleArticle(params.newspaper_id, params.article_id, user, roles, body), {
        params: articleRouteParams,
        body: scheduleBody,
    })

    // ── POST .../articles/:article_id/publish ─────────────────────────────
    .post(
        "/api/newspapers/:newspaper_id/articles/:article_id/publish",
        ({ params, user, roles }) =>
            articleService.publishArticle(params.newspaper_id, params.article_id, user, roles), {
        params: articleRouteParams,
    })

    // ── PATCH .../articles/:article_id/subscriber-only — NEWSPAPER_MANAGER
    .patch(
        "/api/newspapers/:newspaper_id/articles/:article_id/subscriber-only",
        ({ params, user, roles, body }) =>
            articleService.setSubscriberOnly(params.newspaper_id, params.article_id, user, roles, body.is_subscriber_only), {
        params: articleRouteParams,
        body: subscriberOnlyBody,
    });
