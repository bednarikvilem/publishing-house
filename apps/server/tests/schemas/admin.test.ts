import { describe, test, expect } from "bun:test";
import { Value } from "@sinclair/typebox/value";
import {
	assignRoleBody,
	assignGlobalRoleBody,
	adminConfigBody,
} from "../../src/schemas/admin";

describe("assignRoleBody", () => {
	test("accepts REGISTERED_USER", () => {
		expect(Value.Check(assignRoleBody, { role: "REGISTERED_USER" })).toBe(true);
	});

	test("accepts AUTHOR", () => {
		expect(Value.Check(assignRoleBody, { role: "AUTHOR" })).toBe(true);
	});

	test("accepts EDITOR", () => {
		expect(Value.Check(assignRoleBody, { role: "EDITOR" })).toBe(true);
	});

	test("accepts NEWSPAPER_MANAGER", () => {
		expect(Value.Check(assignRoleBody, { role: "NEWSPAPER_MANAGER" })).toBe(true);
	});

	test("rejects global role DIRECTOR", () => {
		expect(Value.Check(assignRoleBody, { role: "DIRECTOR" })).toBe(false);
	});

	test("rejects global role SYSTEM_ADMINISTRATOR", () => {
		expect(Value.Check(assignRoleBody, { role: "SYSTEM_ADMINISTRATOR" })).toBe(false);
	});

	test("rejects unknown role", () => {
		expect(Value.Check(assignRoleBody, { role: "SUPERUSER" })).toBe(false);
	});

	test("rejects missing role", () => {
		expect(Value.Check(assignRoleBody, {})).toBe(false);
	});
});

describe("assignGlobalRoleBody", () => {
	test("accepts DIRECTOR", () => {
		expect(Value.Check(assignGlobalRoleBody, { role: "DIRECTOR" })).toBe(true);
	});

	test("accepts SYSTEM_ADMINISTRATOR", () => {
		expect(Value.Check(assignGlobalRoleBody, { role: "SYSTEM_ADMINISTRATOR" })).toBe(true);
	});

	test("rejects newspaper role AUTHOR", () => {
		expect(Value.Check(assignGlobalRoleBody, { role: "AUTHOR" })).toBe(false);
	});

	test("rejects missing role", () => {
		expect(Value.Check(assignGlobalRoleBody, {})).toBe(false);
	});
});

describe("adminConfigBody", () => {
	test("accepts empty object (all optional)", () => {
		expect(Value.Check(adminConfigBody, {})).toBe(true);
	});

	test("accepts valid email config", () => {
		expect(
			Value.Check(adminConfigBody, {
				email: {
					smtp_host: "smtp.example.com",
					smtp_port: 587,
					sender_address: "no-reply@example.com",
				},
			})
		).toBe(true);
	});

	test("rejects smtp_port below 1", () => {
		expect(Value.Check(adminConfigBody, { email: { smtp_port: 0 } })).toBe(false);
	});

	test("rejects smtp_port above 65535", () => {
		expect(Value.Check(adminConfigBody, { email: { smtp_port: 65536 } })).toBe(false);
	});

	test("rejects invalid sender_address email", () => {
		expect(Value.Check(adminConfigBody, { email: { sender_address: "not-an-email" } })).toBe(false);
	});

	test("rejects empty smtp_host", () => {
		expect(Value.Check(adminConfigBody, { email: { smtp_host: "" } })).toBe(false);
	});

	test("accepts valid security config", () => {
		expect(
			Value.Check(adminConfigBody, {
				security: {
					jwt_expiry_hours: 24,
					password_reset_token_expiry_minutes: 30,
					verification_token_expiry_hours: 48,
					max_login_attempts: 5,
				},
			})
		).toBe(true);
	});

	test("rejects jwt_expiry_hours below 1", () => {
		expect(Value.Check(adminConfigBody, { security: { jwt_expiry_hours: 0 } })).toBe(false);
	});

	test("rejects jwt_expiry_hours above 8760 (1 year)", () => {
		expect(Value.Check(adminConfigBody, { security: { jwt_expiry_hours: 8761 } })).toBe(false);
	});

	test("rejects max_login_attempts above 100", () => {
		expect(Value.Check(adminConfigBody, { security: { max_login_attempts: 101 } })).toBe(false);
	});

	test("accepts valid uploads config", () => {
		expect(
			Value.Check(adminConfigBody, {
				uploads: {
					max_image_size_mb: 10,
					allowed_image_types: ["image/jpeg", "image/png"],
				},
			})
		).toBe(true);
	});

	test("rejects max_image_size_mb above 100", () => {
		expect(Value.Check(adminConfigBody, { uploads: { max_image_size_mb: 101 } })).toBe(false);
	});

	test("rejects max_image_size_mb below 1", () => {
		expect(Value.Check(adminConfigBody, { uploads: { max_image_size_mb: 0 } })).toBe(false);
	});
});
