import { test, expect, describe, beforeEach, afterEach, spyOn } from "bun:test";
import { logger } from "../../src/utils/logger";

describe("logger", () => {
  let logSpy: ReturnType<typeof spyOn>;
  let errorSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    logSpy = spyOn(console, "log").mockImplementation(() => {});
    errorSpy = spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
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
});
