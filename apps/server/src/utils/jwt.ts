import type { JWTPayloadSpec } from "@elysiajs/jwt";

export const JWT_EXPIRATION = {
	session: "2h",
	emailVerification: "1d",
	passwordReset: "1h",
} as const;

export type SessionTokenPayload = {
	type?: undefined;
	userId: string;
	newspaperId: string | null;
	jti: string;
};
export type EmailVerificationTokenPayload = {
	type: "email_verification";
	userId: string;
};
export type PasswordResetTokenPayload = {
	type: "password_reset";
	userId: string;
};

export type AppTokenPayload =
	| SessionTokenPayload
	| EmailVerificationTokenPayload
	| PasswordResetTokenPayload;

export type JwtSignPayload = AppTokenPayload & { exp: string };

export type JwtClaims = AppTokenPayload & JWTPayloadSpec;

export type Jwt = {
	sign: (payload: JwtSignPayload) => Promise<string>;
	verify: (token?: string) => Promise<Record<string, unknown> | false>;
};
