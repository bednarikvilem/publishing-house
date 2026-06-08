import type { users } from "../db/schema";
import type { userRolesEnum } from "../db/enums";

export type AuthUser = typeof users.$inferSelect;
export type Role = typeof userRolesEnum.enumValues[number];
export type Roles = Role[];
