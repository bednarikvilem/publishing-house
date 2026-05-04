import { describe, test, expect } from "bun:test";
import { Value } from "@sinclair/typebox/value";
import {
	registerInput,
	loginInput,
	verifyEmailInput,
	forgotPasswordInput,
	resetPasswordInput,
	resendVerificationInput,
	globalLoginInput,
	createGlobalUserInput,
} from "../../src/schemas/auth";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_EMAIL = "user@example.com";

describe("registerInput", () => {
	const valid = {
		email: VALID_EMAIL,
		username: "john_doe",
		password: "password123",
		newspaper_id: VALID_UUID,
	};

	test("accepts valid input", () => {
		expect(Value.Check(registerInput, valid)).toBe(true);
	});

	test("accepts valid input with full_name", () => {
		expect(Value.Check(registerInput, { ...valid, full_name: "John Doe" })).toBe(true);
	});

	test("rejects invalid email", () => {
		expect(Value.Check(registerInput, { ...valid, email: "not-an-email" })).toBe(false);
	});

	test("rejects empty username", () => {
		expect(Value.Check(registerInput, { ...valid, username: "" })).toBe(false);
	});

	test("rejects password shorter than 8 characters", () => {
		expect(Value.Check(registerInput, { ...valid, password: "shorttt" })).toBe(false);
	});

	test("rejects password longer than 128 characters", () => {
		expect(Value.Check(registerInput, { ...valid, password: "a".repeat(129) })).toBe(false);
	});

	test("rejects invalid newspaper_id (not a uuid)", () => {
		expect(Value.Check(registerInput, { ...valid, newspaper_id: "not-a-uuid" })).toBe(false);
	});

	test("rejects missing uuid", () => {
		const { newspaper_id: _, ...rest } = valid;
		expect(Value.Check(registerInput, rest)).toBe(false);
	});

	test("rejects missing username", () => {
		const { username: _, ...rest } = valid;
		expect(Value.Check(registerInput, rest)).toBe(false);
	});

	test("rejects missing email", () => {
		const { email: _, ...rest } = valid;
		expect(Value.Check(registerInput, rest)).toBe(false);
	});

	test("rejects missing password", () => {
		const { password: _, ...rest } = valid;
		expect(Value.Check(registerInput, rest)).toBe(false);
	});

	test("rejects full_name with only empty string", () => {
		expect(Value.Check(registerInput, { ...valid, full_name: "" })).toBe(false);
	});
});

describe("loginInput", () => {
	const valid = {
		email: VALID_EMAIL,
		password: "anypassword",
		newspaper_id: VALID_UUID,
	};

	test("accepts valid input", () => {
		expect(Value.Check(loginInput, valid)).toBe(true);
	});

	test("rejects invalid email", () => {
		expect(Value.Check(loginInput, { ...valid, email: "bad" })).toBe(false);
	});

	test("rejects empty password", () => {
		expect(Value.Check(loginInput, { ...valid, password: "" })).toBe(false);
	});

	test("rejects invalid newspaper_id", () => {
		expect(Value.Check(loginInput, { ...valid, newspaper_id: "not-uuid" })).toBe(false);
	});

	test("rejects missing newspaper_id", () => {
		const { newspaper_id: _, ...rest } = valid;
		expect(Value.Check(loginInput, rest)).toBe(false);
	});

	test("rejects missing email", () => {
		const { email: _, ...rest } = valid;
		expect(Value.Check(loginInput, rest)).toBe(false);
	});

	test("rejects missing password", () => {
		const { password: _, ...rest } = valid;
		expect(Value.Check(loginInput, rest)).toBe(false);
	});
});

describe("verifyEmailInput", () => {
	test("accepts valid token", () => {
		expect(Value.Check(verifyEmailInput, { token: "sometoken" })).toBe(true);
	});

	test("rejects empty token", () => {
		expect(Value.Check(verifyEmailInput, { token: "" })).toBe(false);
	});

	test("rejects missing token", () => {
		expect(Value.Check(verifyEmailInput, {})).toBe(false);
	});
});

describe("forgotPasswordInput", () => {
	const valid = { email: VALID_EMAIL, newspaper_id: VALID_UUID };

	test("accepts valid input", () => {
		expect(Value.Check(forgotPasswordInput, valid)).toBe(true);
	});

	test("rejects invalid email", () => {
		expect(Value.Check(forgotPasswordInput, { ...valid, email: "bad" })).toBe(false);
	});

	test("rejects invalid newspaper_id", () => {
		expect(Value.Check(forgotPasswordInput, { ...valid, newspaper_id: "bad" })).toBe(false);
	});

	test("rejects missing email", () => {
		const { email: _, ...rest } = valid;
		expect(Value.Check(forgotPasswordInput, rest)).toBe(false);
	});

	test("rejects missing uuid", () => {
		const { newspaper_id: _, ...rest } = valid;
		expect(Value.Check(forgotPasswordInput, rest)).toBe(false);
	});
});

describe("resetPasswordInput", () => {
	const valid = { token: "resettoken", password: "newpassword1" };

	test("accepts valid input", () => {
		expect(Value.Check(resetPasswordInput, valid)).toBe(true);
	});

	test("rejects empty token", () => {
		expect(Value.Check(resetPasswordInput, { ...valid, token: "" })).toBe(false);
	});

	test("rejects password shorter than 8 characters", () => {
		expect(Value.Check(resetPasswordInput, { ...valid, password: "short" })).toBe(false);
	});

	test("rejects password longer than 128 characters", () => {
		expect(Value.Check(resetPasswordInput, { ...valid, password: "a".repeat(129) })).toBe(false);
	});

	test("rejects missing password", () => {
		expect(Value.Check(resetPasswordInput, { token: "tok" })).toBe(false);
	});
});

describe("resendVerificationInput", () => {
	const valid = { email: VALID_EMAIL, newspaper_id: VALID_UUID };

	test("accepts valid input", () => {
		expect(Value.Check(resendVerificationInput, valid)).toBe(true);
	});

	test("rejects invalid email", () => {
		expect(Value.Check(resendVerificationInput, { ...valid, email: "bad" })).toBe(false);
	});

	test("rejects invalid newspaper_id", () => {
		expect(Value.Check(resendVerificationInput, { ...valid, newspaper_id: "bad" })).toBe(false);
	});
});

describe("globalLoginInput", () => {
	const valid = { email: VALID_EMAIL, password: "anypassword" };

	test("accepts valid input", () => {
		expect(Value.Check(globalLoginInput, valid)).toBe(true);
	});

	test("rejects invalid email", () => {
		expect(Value.Check(globalLoginInput, { ...valid, email: "bad" })).toBe(false);
	});

	test("rejects empty password", () => {
		expect(Value.Check(globalLoginInput, { ...valid, password: "" })).toBe(false);
	});

	test("rejects missing email", () => {
		expect(Value.Check(globalLoginInput, { password: "pass" })).toBe(false);
	});

	test("rejects missing password", () => {
		expect(Value.Check(globalLoginInput, { email: VALID_EMAIL })).toBe(false);
	});
});

describe("createGlobalUserInput", () => {
	const valid = {
		email: VALID_EMAIL,
		username: "admin_user",
		password: "securepass1",
		role: "DIRECTOR" as const,
	};

	test("accepts DIRECTOR role", () => {
		expect(Value.Check(createGlobalUserInput, valid)).toBe(true);
	});

	test("accepts SYSTEM_ADMINISTRATOR role", () => {
		expect(Value.Check(createGlobalUserInput, { ...valid, role: "SYSTEM_ADMINISTRATOR" })).toBe(true);
	});

	test("rejects invalid role", () => {
		expect(Value.Check(createGlobalUserInput, { ...valid, role: "AUTHOR" })).toBe(false);
	});

	test("rejects password shorter than 8 characters", () => {
		expect(Value.Check(createGlobalUserInput, { ...valid, password: "short" })).toBe(false);
	});

	test("rejects invalid email", () => {
		expect(Value.Check(createGlobalUserInput, { ...valid, email: "bad" })).toBe(false);
	});

	test("accepts optional full_name", () => {
		expect(Value.Check(createGlobalUserInput, { ...valid, full_name: "Admin User" })).toBe(true);
	});

	test("rejects empty full_name", () => {
		expect(Value.Check(createGlobalUserInput, { ...valid, full_name: "" })).toBe(false);
	});
});
