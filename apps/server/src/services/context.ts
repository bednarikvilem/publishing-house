import type { users } from "../db/schema";

export type AuthUser = typeof users.$inferSelect;
export type Roles = string[];
