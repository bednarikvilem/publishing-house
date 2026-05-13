import { test, expect, describe, beforeEach, afterEach, mock, spyOn } from "bun:test";

const valuesSpy = mock(async () => undefined);
const insertSpy = mock(() => ({ values: valuesSpy }));

mock.module("../../src/db", () => ({
  db: { insert: insertSpy },
}));

const { audit } = await import("../../src/utils/audit");
const { auditLogs } = await import("../../src/db/schema");
const { logger } = await import("../../src/utils/logger");

describe("audit", () => {
  let loggerErrorSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    valuesSpy.mockClear();
    insertSpy.mockClear();
    valuesSpy.mockImplementation(async () => undefined);
    loggerErrorSpy = spyOn(logger, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  test("inserts an audit row with all provided fields", async () => {
    await audit({
      userId: "user-1",
      operationType: "ARTICLE_CREATE",
      targetObjectId: "article-7",
      result: "SUCCESS",
    });

    expect(insertSpy).toHaveBeenCalledWith(auditLogs);
    expect(valuesSpy).toHaveBeenCalledWith({
      userId: "user-1",
      operationType: "ARTICLE_CREATE",
      targetObjectId: "article-7",
      result: "SUCCESS",
    });
  });

  test("substitutes null for missing optional fields", async () => {
    await audit({
      operationType: "LOGIN_FAIL",
      result: "FAILURE",
    });

    expect(valuesSpy).toHaveBeenCalledWith({
      userId: null,
      operationType: "LOGIN_FAIL",
      targetObjectId: null,
      result: "FAILURE",
    });
  });

  test("does not throw when DB insert rejects", async () => {
    valuesSpy.mockImplementationOnce(async () => {
      throw new Error("connection refused");
    });

    await expect(
      audit({ operationType: "X", result: "SUCCESS" })
    ).resolves.toBeUndefined();
  });

  test("logs an error when DB insert rejects", async () => {
    valuesSpy.mockImplementationOnce(async () => {
      throw new Error("boom");
    });

    await audit({ operationType: "ARTICLE_DELETE", result: "FAILURE" });

    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    const [message, meta] = loggerErrorSpy.mock.calls[0]!;
    expect(message).toBe("Failed to write audit log");
    expect(meta).toMatchObject({ operation: "ARTICLE_DELETE" });
    expect(typeof (meta as Record<string, unknown>).error).toBe("string");
  });
});
