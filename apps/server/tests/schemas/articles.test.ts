import { describe, test, expect } from "bun:test";
import { Value } from "@sinclair/typebox/value";
import {
	createArticleBody,
	updateArticleBody,
	reviewBody,
	scheduleBody,
} from "../../src/schemas/articles";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("createArticleBody", () => {
	const valid = {
		title: "My Article",
		perex: "A short summary",
		content: "The full content of the article",
	};

	test("accepts valid input", () => {
		expect(Value.Check(createArticleBody, valid)).toBe(true);
	});

	test("accepts with optional category_id", () => {
		expect(Value.Check(createArticleBody, { ...valid, category_id: VALID_UUID })).toBe(true);
	});

	test("accepts with keywords as string", () => {
		expect(Value.Check(createArticleBody, { ...valid, keywords: "politics" })).toBe(true);
	});

	test("accepts with keywords as array", () => {
		expect(Value.Check(createArticleBody, { ...valid, keywords: ["politics", "world"] })).toBe(true);
	});

	test("rejects empty title", () => {
		expect(Value.Check(createArticleBody, { ...valid, title: "" })).toBe(false);
	});

	test("rejects title longer than 255 characters", () => {
		expect(Value.Check(createArticleBody, { ...valid, title: "a".repeat(256) })).toBe(false);
	});

	test("rejects empty perex", () => {
		expect(Value.Check(createArticleBody, { ...valid, perex: "" })).toBe(false);
	});

	test("rejects perex longer than 1000 characters", () => {
		expect(Value.Check(createArticleBody, { ...valid, perex: "a".repeat(1001) })).toBe(false);
	});

	test("rejects empty content", () => {
		expect(Value.Check(createArticleBody, { ...valid, content: "" })).toBe(false);
	});

	test("rejects content longer than 200000 characters", () => {
		expect(Value.Check(createArticleBody, { ...valid, content: "a".repeat(200_001) })).toBe(false);
	});

	test("rejects missing title", () => {
		const { title: _, ...rest } = valid;
		expect(Value.Check(createArticleBody, rest)).toBe(false);
	});

	test("rejects missing content", () => {
		const { content: _, ...rest } = valid;
		expect(Value.Check(createArticleBody, rest)).toBe(false);
	});

	test("rejects invalid category_id", () => {
		expect(Value.Check(createArticleBody, { ...valid, category_id: "not-a-uuid" })).toBe(false);
	});
});

describe("updateArticleBody", () => {
	test("accepts empty object (all fields optional)", () => {
		expect(Value.Check(updateArticleBody, {})).toBe(true);
	});

	test("accepts partial update with only title", () => {
		expect(Value.Check(updateArticleBody, { title: "New Title" })).toBe(true);
	});

	test("rejects empty title", () => {
		expect(Value.Check(updateArticleBody, { title: "" })).toBe(false);
	});

	test("rejects title longer than 255 characters", () => {
		expect(Value.Check(updateArticleBody, { title: "a".repeat(256) })).toBe(false);
	});

	test("rejects empty perex", () => {
		expect(Value.Check(updateArticleBody, { perex: "" })).toBe(false);
	});

	test("rejects empty content", () => {
		expect(Value.Check(updateArticleBody, { content: "" })).toBe(false);
	});

	test("accepts null category_id (to remove category)", () => {
		expect(Value.Check(updateArticleBody, { category_id: null })).toBe(true);
	});

	test("rejects invalid category_id", () => {
		expect(Value.Check(updateArticleBody, { category_id: "bad" })).toBe(false);
	});
});

describe("reviewBody", () => {
	test("accepts APPROVE decision", () => {
		expect(Value.Check(reviewBody, { decision: "APPROVE" })).toBe(true);
	});

	test("accepts REJECT decision", () => {
		expect(Value.Check(reviewBody, { decision: "REJECT" })).toBe(true);
	});

	test("accepts REQUEST_REVISION decision", () => {
		expect(Value.Check(reviewBody, { decision: "REQUEST_REVISION" })).toBe(true);
	});

	test("accepts decision with optional note", () => {
		expect(Value.Check(reviewBody, { decision: "REJECT", note: "Needs more sources" })).toBe(true);
	});

	test("rejects invalid decision", () => {
		expect(Value.Check(reviewBody, { decision: "PUBLISH" })).toBe(false);
	});

	test("rejects missing decision", () => {
		expect(Value.Check(reviewBody, {})).toBe(false);
	});

	test("rejects empty note", () => {
		expect(Value.Check(reviewBody, { decision: "APPROVE", note: "" })).toBe(false);
	});
});

describe("scheduleBody", () => {
	test("accepts valid date-time", () => {
		expect(Value.Check(scheduleBody, { publication_date: "2025-12-01T10:00:00Z" })).toBe(true);
	});

	test("rejects non-datetime string", () => {
		expect(Value.Check(scheduleBody, { publication_date: "not-a-date" })).toBe(false);
	});

	test("rejects missing publication_date", () => {
		expect(Value.Check(scheduleBody, {})).toBe(false);
	});
});
