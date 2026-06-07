import { t } from "elysia";
import { Uuid } from "./shared";

export const subscriptionParams = t.Object({ newspaper_id: Uuid });

export const confirmSubscriptionBody = t.Object({
    token: t.String({ minLength: 1 }),
});

export const subscriptionStatusResponse = t.Object({
    is_active: t.Boolean(),
    expires_at: t.Nullable(t.String({ format: "date-time" })),
});

export const subscriptionConfirmResponse = t.Object({
    message: t.String(),
    expires_at: t.String({ format: "date-time" }),
});
