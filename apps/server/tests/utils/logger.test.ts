import { test, expect, describe, beforeEach, afterEach, spyOn } from "bun:test";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { logger } from "../../src/utils/logger";

describe("logger", () => {
  let logSpy: ReturnType<typeof spyOn>;
  let errorSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    logSpy   = spyOn(console, "log").mockImplementation(() => {});
    errorSpy = spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    delete process.env.LOG_LEVEL;
    delete process.env.LOG_FILE;
  });

  test("output is valid JSON containing level, timestamp, and message", () => {
    logger.info("hello");
    const line = logSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(line);
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("hello");
    expect(typeof parsed.timestamp).toBe("string");
    expect(new Date(parsed.timestamp).toISOString()).toBe(parsed.timestamp);
  });

  test("merges meta fields into the JSON output", () => {
    logger.info("msg", { userId: "u1", count: 3 });
    const parsed = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(parsed.userId).toBe("u1");
    expect(parsed.count).toBe(3);
  });

  test("error and warn write to console.error", () => {
    logger.error("bad thing");
    logger.warn("careful");
    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).not.toHaveBeenCalled();
  });

  test("info writes to console.log", () => {
    logger.info("ok");
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test("debug is silent in production, active otherwise", () => {
    const original = process.env.NODE_ENV;

    process.env.NODE_ENV = "production";
    logger.debug("nope");
    expect(logSpy).not.toHaveBeenCalled();

    process.env.NODE_ENV = "development";
    logger.debug("yep");
    expect(logSpy).toHaveBeenCalledTimes(1);

    process.env.NODE_ENV = original;
  });

  test("does not throw when DB insert rejects", async () => {
    expect(() => logger.error("something")).not.toThrow();
    expect(() => logger.warn("something")).not.toThrow();
    expect(() => logger.info("something")).not.toThrow();
    expect(() => logger.debug("something")).not.toThrow();
  });

  test("LOG_LEVEL=warn suppresses info and debug", () => {
    process.env.LOG_LEVEL = "warn";
    logger.info("suppressed");
    logger.debug("also suppressed");
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test("LOG_LEVEL=warn still emits warn and error", () => {
    process.env.LOG_LEVEL = "warn";
    logger.warn("visible");
    logger.error("also visible");
    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).not.toHaveBeenCalled();
  });

  test("LOG_LEVEL=error suppresses warn", () => {
    process.env.LOG_LEVEL = "error";
    logger.warn("suppressed");
    expect(errorSpy).not.toHaveBeenCalled();

    logger.error("visible");
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  test("LOG_LEVEL=debug overrides production NODE_ENV default", () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    process.env.LOG_LEVEL = "debug"; // explicit opt-in, e.g. for a debug pod

    logger.debug("visible despite production NODE_ENV");
    expect(logSpy).toHaveBeenCalledTimes(1);

    process.env.NODE_ENV = original;
  });

  test("unknown LOG_LEVEL value falls back to NODE_ENV default", () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    process.env.LOG_LEVEL = "verbose"; // not a valid level

    logger.debug("should still be suppressed");
    expect(logSpy).not.toHaveBeenCalled();

    process.env.NODE_ENV = original;
  });

  test("writes each log line to LOG_FILE as NDJSON", () => {
    const tmpFile = join(tmpdir(), `logger-test-${Date.now()}.ndjson`);
    process.env.LOG_FILE = tmpFile;

    try {
      logger.info("file log test", { key: "value" });
      logger.warn("second line");

      const lines = readFileSync(tmpFile, "utf8").trim().split("\n");
      expect(lines).toHaveLength(2);

      const first = JSON.parse(lines[0]!);
      expect(first.level).toBe("info");
      expect(first.message).toBe("file log test");
      expect(first.key).toBe("value");

      const second = JSON.parse(lines[1]!);
      expect(second.level).toBe("warn");
    } finally {
      if (existsSync(tmpFile)) unlinkSync(tmpFile);
    }
  });

  test("suppressed levels are not written to LOG_FILE either", () => {
    const tmpFile = join(tmpdir(), `logger-test-${Date.now()}.ndjson`);
    process.env.LOG_FILE  = tmpFile;
    process.env.LOG_LEVEL = "warn";

    try {
      logger.info("suppressed"); // below the warn threshold
      expect(existsSync(tmpFile)).toBe(false);
    } finally {
      if (existsSync(tmpFile)) unlinkSync(tmpFile);
    }
  });

  test("does not throw when LOG_FILE path is not writable", () => {
    process.env.LOG_FILE = "/nonexistent-dir/app.log";
    expect(() => logger.info("should not crash")).not.toThrow();
  });
});