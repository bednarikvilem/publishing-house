import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const queryClient = postgres(process.env.DATABASE_URL!);
export const db = drizzle(queryClient, { schema });

const appQueryClient = postgres(process.env.DATABASE_URL_APP_USER!);
export const appDb = drizzle(appQueryClient, { schema });
