import { describe, test, expect } from "bun:test";
import { Value } from "@sinclair/typebox/value";
import { categoryBody } from "../../src/schemas/categories";

describe("categoryBody", () => {
	test("accepts valid name", () => {
		expect(Value.Check(categoryBody, { name: "Politics" })).toBe(true);
	});

	test("rejects empty name", () => {
		expect(Value.Check(categoryBody, { name: "" })).toBe(false);
	});

	test("rejects name longer than 255 characters", () => {
		expect(Value.Check(categoryBody, { name: "a".repeat(256) })).toBe(false);
	});

	test("accepts name at max length (255)", () => {
		expect(Value.Check(categoryBody, { name: "a".repeat(255) })).toBe(true);
	});

	test("rejects missing name", () => {
		expect(Value.Check(categoryBody, {})).toBe(false);
	});
});
