import { appendFileSync } from "node:fs";

export type LogLevel = "error" | "warn" | "info" | "debug";

const LEVEL_RANK: Record<LogLevel, number> = {
  error: 0,
  warn:  1,
  info:  2,
  debug: 3,
};

function minRank(): number {
  const raw = process.env.LOG_LEVEL?.toLowerCase();
  if (raw && raw in LEVEL_RANK) return LEVEL_RANK[raw as LogLevel];
  return LEVEL_RANK.debug;
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (LEVEL_RANK[level] > minRank()) return;

  const line = JSON.stringify({
    level,
    timestamp: new Date().toISOString(),
    message,
    ...meta,
  });

  // Route to the correct stdio stream so external collectors
  // (Docker, systemd, etc.) can separate error traffic from info.
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }

  // Optionally mirror every line to a file.
  // Set LOG_FILE=/var/log/app.ndjson (or any writable path) in production.
  const logFile = process.env.LOG_FILE;
  if (logFile) {
    try {
      appendFileSync(logFile, line + "\n");
    } catch {
      // Never let a file-write failure propagate and crash the process.
    }
  }
}

export const logger = {
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
  warn:  (message: string, meta?: Record<string, unknown>) => log("warn",  message, meta),
  info:  (message: string, meta?: Record<string, unknown>) => log("info",  message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => log("debug", message, meta),
};