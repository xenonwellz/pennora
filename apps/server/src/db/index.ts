import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as authSchema from "./schema/auth";
import * as domainSchema from "./schema/domain";

let _db: ReturnType<typeof drizzle<typeof authSchema & typeof domainSchema>> | null = null;
let _pool: Pool | null = null;

export function initDB(databaseUrl: string) {
    _pool = new Pool({ connectionString: databaseUrl });
    _db = drizzle(_pool, { schema: { ...authSchema, ...domainSchema } });
}

export function getDB() {
    if (!_db) {
        throw new Error("Database not initialized. Call initDB() first.");
    }
    return _db;
}

export function getPool() {
    if (!_pool) {
        throw new Error("Database pool not initialized. Call initDB() first.");
    }
    return _pool;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof authSchema & typeof domainSchema>>, {
    get(_, prop) {
        return (getDB() as any)[prop];
    },
});
