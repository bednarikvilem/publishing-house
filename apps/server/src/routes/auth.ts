import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { bearer } from "@elysiajs/bearer";
import {
	registerInput,
	loginInput,
	verifyEmailInput,
	forgotPasswordInput,
	resetPasswordInput,
	resendVerificationInput,
	globalLoginInput,
} from "../schemas/auth";
import * as authService from "../services/auth";

export const authRoutes = new Elysia({ prefix: "/api/auth", detail: { tags: ["Auth"] } })
	.use(bearer())
	.use(jwt({ secret: process.env.JWT_SECRET! }))

	.post("/register", async ({ body, jwt, set }) => {
		const result = await authService.register(body, jwt);
		set.status = 201;
		return result;
	}, {
		body: registerInput,
	})

	.post("/login", ({ body, jwt }) => authService.login(body, jwt), {
		body: loginInput,
	})

	.post("/logout", ({ bearer, jwt }) => authService.logout(bearer, jwt))

	.post("/verify-email", ({ body, jwt }) => authService.verifyEmail(body, jwt), {
		body: verifyEmailInput,
	})

	.post("/forgot-password", ({ body, jwt }) => authService.forgotPassword(body, jwt), {
		body: forgotPasswordInput,
	})

	.post("/reset-password", ({ body, jwt }) => authService.resetPassword(body, jwt), {
		body: resetPasswordInput,
	})

	.post("/global/login", ({ body, jwt }) => authService.globalLogin(body, jwt), {
		body: globalLoginInput,
	})

	.post("/resend-verification", ({ body, jwt }) => authService.resendVerification(body, jwt), {
		body: resendVerificationInput,
	});
