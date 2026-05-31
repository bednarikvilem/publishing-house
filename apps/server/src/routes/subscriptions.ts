import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { subscriptionParams, confirmSubscriptionBody } from "../schemas/subscriptions";
import * as subscriptionService from "../services/subscriptions";
import { UnauthorizedError } from "../errors";

export const subscriptionRoutes = new Elysia({ detail: { tags: ["Subscriptions"] } })
    .use(authMiddleware)

    // POST /api/newspapers/:newspaper_id/subscription/request — REGISTERED_USER
    .post(
        "/api/newspapers/:newspaper_id/subscription/request",
        ({ params, user }) => {
            if (!user) throw new UnauthorizedError();
            return subscriptionService.requestSubscription(user.id, params.newspaper_id);
        },
        { params: subscriptionParams },
    )

    // POST /api/newspapers/:newspaper_id/subscription/confirm — public
    .post(
        "/api/newspapers/:newspaper_id/subscription/confirm",
        ({ params, body }) =>
            subscriptionService.confirmSubscription(body.token, params.newspaper_id),
        {
            params: subscriptionParams,
            body: confirmSubscriptionBody,
        },
    )

    // GET /api/newspapers/:newspaper_id/subscription/status — REGISTERED_USER
    .get(
        "/api/newspapers/:newspaper_id/subscription/status",
        ({ params, user }) => {
            if (!user) throw new UnauthorizedError();
            return subscriptionService.getSubscriptionStatus(user.id, params.newspaper_id);
        },
        { params: subscriptionParams },
    );
