import { sql } from "drizzle-orm";
import { appDb } from "./index";

export type Tx = Parameters<Parameters<typeof appDb.transaction>[0]>[0];

export type RlsSession = {
    userId: string | null;
    newspaperId: string | null;
    roles: string[];
};

export function withRls<T>(
    session: RlsSession,
    fn: (tx: Tx) => Promise<T>,
): Promise<T> {
    return appDb.transaction(async (tx) => {
        await tx.execute(sql`SELECT set_config('app.user_id', ${session.userId ?? ""}, true)`);
        await tx.execute(sql`SELECT set_config('app.newspaper_id', ${session.newspaperId ?? ""}, true)`);
        await tx.execute(sql`SELECT set_config('app.roles', ${session.roles.join(",")}, true)`);
        return fn(tx);
    });
}
