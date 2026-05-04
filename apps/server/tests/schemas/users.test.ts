import { describe, test, expect } from "bun:test";
import { Value } from "@sinclair/typebox/value";
import { updateMeBody } from "../../src/schemas/users";

describe("updateMeBody", () => {
	test("accepts empty object (all fields optional)", () => {
		expect(Value.Check(updateMeBody, {})).toBe(true);
	});

	test("accepts valid username", () => {
		expect(Value.Check(updateMeBody, { username: "valid_user" })).toBe(true);
	});

	test("rejects username shorter than 3 characters", () => {
		expect(Value.Check(updateMeBody, { username: "ab" })).toBe(false);
	});

	test("rejects username longer than 63 characters", () => {
		expect(Value.Check(updateMeBody, { username: "a".repeat(64) })).toBe(false);
	});

	test("rejects username with special characters", () => {
		expect(Value.Check(updateMeBody, { username: "invalid user!" })).toBe(false);
	});

	test("accepts username with underscores and mixed case", () => {
		expect(Value.Check(updateMeBody, { username: "John_Doe_42" })).toBe(true);
	});

	test("accepts valid full_name", () => {
		expect(Value.Check(updateMeBody, { full_name: "John Doe" })).toBe(true);
	});

	test("rejects empty full_name", () => {
		expect(Value.Check(updateMeBody, { full_name: "" })).toBe(false);
	});

	test("rejects full_name longer than 127 characters", () => {
		expect(Value.Check(updateMeBody, { full_name: "a".repeat(128) })).toBe(false);
	});

	test("accepts valid password", () => {
		expect(Value.Check(updateMeBody, { password: "securepass" })).toBe(true);
	});

	test("rejects password shorter than 8 characters", () => {
		expect(Value.Check(updateMeBody, { password: "short" })).toBe(false);
	});

	test("rejects password longer than 128 characters", () => {
		expect(Value.Check(updateMeBody, { password: "a".repeat(129) })).toBe(false);
	});

	test("accepts valid bio", () => {
		expect(Value.Check(updateMeBody, { bio: "I write articles." })).toBe(true);
	});

	test("rejects bio longer than 2000 characters", () => {
		expect(Value.Check(updateMeBody, { bio: "a".repeat(2001) })).toBe(false);
	});

	test("accepts all fields together", () => {
		expect(
			Value.Check(updateMeBody, {
				username: "john_42",
				full_name: "John Doe",
				password: "newpassword",
				bio: "Hello world",
			})
		).toBe(true);
	});
});
