import { Elysia } from "elysia";
import { authMiddleware } from "../middleware/auth";
import { updateMeBody } from "../schemas/users";
import * as userService from "../services/users";

export const userRoutes = new Elysia({ prefix: "/api/users", detail: { tags: ["Users"] } })
    .use(authMiddleware)

    // GET /api/users/me
    .get("/me", ({ user, roles, withDb }) =>
        withDb((tx) => userService.getMe(tx, user, roles)))

    // PUT /api/users/me
    .put("/me", ({ user, roles, body, withDb }) =>
        withDb((tx) => userService.updateMe(tx, user, roles, body)), {
        body: updateMeBody,
    })

    // POST /api/users/me/profile-picture
    .post("/me/profile-picture", ({ user, roles, request, withDb }) =>
        withDb((tx) => userService.updateProfilePicture(tx, user, roles, request)));
