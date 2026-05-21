import { describe, test, expect } from "bun:test";
import { Value } from "@sinclair/typebox/value";
import { commentBody } from "../../src/schemas/comments";

describe("commentBody", () => {
	test("accepts valid content", () => {
		expect(Value.Check(commentBody, { content: "Great article!" })).toBe(true);
	});

	test("rejects empty content", () => {
		expect(Value.Check(commentBody, { content: "" })).toBe(false);
	});

	test("rejects content longer than 2000 characters", () => {
		expect(Value.Check(commentBody, { content: "a".repeat(2001) })).toBe(false);
	});

	test("accepts content at max length (2000)", () => {
		expect(Value.Check(commentBody, { content: "a".repeat(2000) })).toBe(true);
	});

	test("rejects missing content", () => {
		expect(Value.Check(commentBody, {})).toBe(false);
	});
});
