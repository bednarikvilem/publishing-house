import { db } from "../db";
import { auditLogs } from "../db/schema";
import { logger } from "./logger";

export type AuditResult = "SUCCESS" | "FAILURE";

export interface AuditParams {
  userId?: string | null;
  operationType: string;
  targetObjectId?: string | null;
  result: AuditResult;
}

export async function audit(params: AuditParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId ?? null,
      operationType: params.operationType,
      targetObjectId: params.targetObjectId ?? null,
      result: params.result,
    });
  } catch (err) {
    logger.error("Failed to write audit log", {
      operation: params.operationType,
      error: String(err),
    });
  }
}