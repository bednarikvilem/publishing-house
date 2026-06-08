import { Elysia } from "elysia";
import { auth } from "../middleware/auth";
import { newspaperIdParam, updateNewspaperColorBody, type NewspaperColor } from "../schemas/newspapers";
import * as newspaperService from "../services/newspapers";

export const newspaperRoutes = new Elysia({ detail: { tags: ["Newspapers"] } })
    .use(auth)

    // GET /api/newspapers — DIRECTOR only
    .get("/api/newspapers", ({ user, roles, withDb }) =>
        withDb((tx) => newspaperService.listNewspapers(tx, user, roles)), {
        requireAuth: true,
    })

    // GET /api/newspapers/by-slug/:slug — public
    .get("/api/newspapers/by-slug/:slug", ({ params, withDb }: any) =>
        withDb((tx: any) => newspaperService.getNewspaperBySlug(tx, params.slug)))

    // GET /api/newspapers/:newspaper_id — public
    .get("/api/newspapers/:newspaper_id", ({ params, withDb }) =>
        withDb((tx) => newspaperService.getNewspaperById(tx, params.newspaper_id)), {
        params: newspaperIdParam,
    })

    // PATCH /api/newspapers/:newspaper_id — DIRECTOR / SYSTEM_ADMINISTRATOR
    .patch("/api/newspapers/:newspaper_id", ({ params, body, user, roles, withDb }) =>
        withDb((tx) => newspaperService.updateNewspaperColor(tx, params.newspaper_id, body.primary_color as NewspaperColor | null, user, roles)), {
        requireAuth: true,
        params: newspaperIdParam,
        body: updateNewspaperColorBody,
    })

    // GET /api/newspapers/:newspaper_id/editors — NEWSPAPER_MANAGER
    .get("/api/newspapers/:newspaper_id/editors", ({ params, user, roles, withDb }) =>
        withDb((tx) => newspaperService.getEditors(tx, params.newspaper_id, user, roles)), {
        requireAuth: true,
        params: newspaperIdParam,
    });
