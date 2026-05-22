import { describe, test, expect } from "bun:test";
import { Value } from "@sinclair/typebox/value";
import {
	subscriptionParams,
	confirmSubscriptionBody,
	subscriptionStatusResponse,
	subscriptionConfirmResponse,
} from "../../src/schemas/subscriptions";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("subscriptionParams", () => {
	test("accepts valid UUID", () => {
		expect(Value.Check(subscriptionParams, { newspaper_id: VALID_UUID })).toBe(true);
	});

	test("rejects non-UUID string", () => {
		expect(Value.Check(subscriptionParams, { newspaper_id: "not-a-uuid" })).toBe(false);
	});

	test("rejects missing newspaper_id", () => {
		expect(Value.Check(subscriptionParams, {})).toBe(false);
	});
});

describe("confirmSubscriptionBody", () => {
	test("accepts a non-empty token string", () => {
		expect(Value.Check(confirmSubscriptionBody, { token: VALID_UUID })).toBe(true);
	});

	test("accepts any non-empty string as token", () => {
		expect(Value.Check(confirmSubscriptionBody, { token: "some-token-value" })).toBe(true);
	});

	test("rejects empty token", () => {
		expect(Value.Check(confirmSubscriptionBody, { token: "" })).toBe(false);
	});

	test("rejects missing token", () => {
		expect(Value.Check(confirmSubscriptionBody, {})).toBe(false);
	});
});

describe("subscriptionStatusResponse", () => {
	test("accepts active subscription with expires_at", () => {
		expect(
			Value.Check(subscriptionStatusResponse, {
				is_active: true,
				expires_at: "2026-06-22T00:00:00Z",
			})
		).toBe(true);
	});

	test("accepts inactive subscription with null expires_at", () => {
		expect(
			Value.Check(subscriptionStatusResponse, {
				is_active: false,
				expires_at: null,
			})
		).toBe(true);
	});

	test("rejects non-boolean is_active", () => {
		expect(
			Value.Check(subscriptionStatusResponse, {
				is_active: "yes",
				expires_at: null,
			})
		).toBe(false);
	});

	test("rejects missing is_active", () => {
		expect(Value.Check(subscriptionStatusResponse, { expires_at: null })).toBe(false);
	});

	test("rejects invalid date-time format for expires_at", () => {
		expect(
			Value.Check(subscriptionStatusResponse, {
				is_active: true,
				expires_at: "not-a-date",
			})
		).toBe(false);
	});
});

describe("subscriptionConfirmResponse", () => {
	test("accepts valid response", () => {
		expect(
			Value.Check(subscriptionConfirmResponse, {
				message: "Subscription activated.",
				expires_at: "2026-06-22T00:00:00Z",
			})
		).toBe(true);
	});

	test("rejects missing message", () => {
		expect(
			Value.Check(subscriptionConfirmResponse, {
				expires_at: "2026-06-22T00:00:00Z",
			})
		).toBe(false);
	});

	test("rejects missing expires_at", () => {
		expect(
			Value.Check(subscriptionConfirmResponse, {
				message: "Subscription activated.",
			})
		).toBe(false);
	});

	test("rejects invalid date-time format for expires_at", () => {
		expect(
			Value.Check(subscriptionConfirmResponse, {
				message: "Subscription activated.",
				expires_at: "not-a-date",
			})
		).toBe(false);
	});
});
