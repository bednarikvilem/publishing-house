import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { newspaperIdParam, updateNewspaperColorBody, type NewspaperColor } from "../schemas/newspapers";
import * as newspaperService from "../services/newspapers";

export const newspaperRoutes = new Elysia({ detail: { tags: ["Newspapers"] } })
    .use(authMiddleware)

    // GET /api/newspapers — DIRECTOR only
    .get("/api/newspapers", ({ user, roles }) =>
        newspaperService.listNewspapers(user, roles))

    // GET /api/newspapers/by-slug/:slug — public
    .get("/api/newspapers/by-slug/:slug", ({ params }: any) =>
        newspaperService.getNewspaperBySlug(params.slug))

    // GET /api/newspapers/:newspaper_id — public
    .get("/api/newspapers/:newspaper_id", ({ params }) =>
        newspaperService.getNewspaperById(params.newspaper_id), {
        params: newspaperIdParam,
    })

    // PATCH /api/newspapers/:newspaper_id — DIRECTOR / SYSTEM_ADMINISTRATOR
    .patch("/api/newspapers/:newspaper_id", ({ params, body, user, roles }) =>
        newspaperService.updateNewspaperColor(params.newspaper_id, body.primary_color as NewspaperColor | null, user, roles), {
        params: newspaperIdParam,
        body: updateNewspaperColorBody,
    })

    // GET /api/newspapers/:newspaper_id/editors — NEWSPAPER_MANAGER
    .get("/api/newspapers/:newspaper_id/editors", ({ params, user, roles }) =>
        newspaperService.getEditors(params.newspaper_id, user, roles), {
        params: newspaperIdParam,
    });
