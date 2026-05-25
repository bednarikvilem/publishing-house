import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import {
    adminUsersListParams,
    adminUsersListQuery,
    assignRoleParams,
    assignRoleBody,
    removeRoleParams,
    assignGlobalRoleParams,
    assignGlobalRoleBody,
    removeGlobalRoleParams,
    adminConfigBody,
} from "../schemas/admin";
import { createGlobalUserInput } from "../schemas/auth";
import * as adminService from "../services/admin";

export const adminRoutes = new Elysia({ detail: { tags: ["Admin"] } })
    .use(authMiddleware)

    // ── GET /api/newspapers/:newspaper_id/users — SYSTEM_ADMINISTRATOR ────
    .get("/api/newspapers/:newspaper_id/users", ({ params, user, roles, query, withDb }) =>
        withDb((tx) => adminService.listNewspaperUsers(tx, params.newspaper_id, user, roles, query)), {
        params: adminUsersListParams,
        query: adminUsersListQuery,
    })

    // ── POST /api/newspapers/:newspaper_id/users/:user_id/roles ───────────
    .post(
        "/api/newspapers/:newspaper_id/users/:user_id/roles",
        ({ params, user, roles, body, withDb }) =>
            withDb((tx) => adminService.assignRole(tx, params.newspaper_id, params.user_id, user, roles, body)),
        {
            params: assignRoleParams,
            body: assignRoleBody,
        },
    )

    // ── DELETE /api/newspapers/:newspaper_id/users/:user_id/roles/:role ───
    .delete(
        "/api/newspapers/:newspaper_id/users/:user_id/roles/:role",
        ({ params, user, roles, withDb }) =>
            withDb((tx) => adminService.removeRole(tx, params.newspaper_id, params.user_id, params.role, user, roles)),
        {
            params: removeRoleParams,
        },
    )

    .get(
        "/api/newspapers/:newspaper_id/statistics",
        ({ params, user, roles, withDb }) =>
            withDb((tx) => adminService.getStatistics(tx, params.newspaper_id, user, roles)),
    )

    // ── GET /api/statistics/global ────────────────────────────────────────
    .get("/api/statistics/global", ({ user, roles, withDb }) =>
        withDb((tx) => adminService.getGlobalStatistics(tx, user, roles)))

    // ── GET /api/global/users ─────────────────────────────────────────────
    .get("/api/global/users", ({ user, roles, withDb }) =>
        withDb((tx) => adminService.listGlobalUsers(tx, user, roles)))

    // ── POST /api/global/users ────────────────────────────────────────────
    .post("/api/global/users", async ({ user, roles, body, withDb, set }) => {
        const result = await withDb((tx) => adminService.createGlobalUser(tx, user, roles, body));
        set.status = 201;
        return result;
    }, {
        body: createGlobalUserInput,
    })

    // ── GET /api/admin/config ─────────────────────────────────────────────
    .get("/api/admin/config", ({ user, roles }) =>
        adminService.getConfig(user, roles))

    // ── POST /api/users/:user_id/global-roles ─────────────────────────────
    .post(
        "/api/users/:user_id/global-roles",
        ({ params, user, roles, body, withDb }) =>
            withDb((tx) => adminService.assignGlobalRole(tx, params.user_id, user, roles, body)),
        {
            params: assignGlobalRoleParams,
            body: assignGlobalRoleBody,
        },
    )

    // ── DELETE /api/users/:user_id/global-roles/:role ─────────────────────
    .delete(
        "/api/users/:user_id/global-roles/:role",
        ({ params, user, roles, withDb }) =>
            withDb((tx) => adminService.removeGlobalRole(tx, params.user_id, params.role, user, roles)),
        {
            params: removeGlobalRoleParams,
        },
    )

    // ── PUT /api/admin/config ─────────────────────────────────────────────
    .put("/api/admin/config", ({ user, roles, body }) =>
        adminService.updateConfig(user, roles, body), {
        body: adminConfigBody,
    });
