import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

import * as authSchema from "./schema/auth";
import * as domainSchema from "./schema/domain";

function createDb() {
    const path = Bun.env.DB_PATH ?? "data.db";
    const sqlite = new Database(path);
    sqlite.run("PRAGMA journal_mode=WAL");
    sqlite.run("PRAGMA foreign_keys=ON");
    const instance = drizzle(sqlite, { schema: { ...authSchema, ...domainSchema } });
    migrate(instance, { migrationsFolder: "./src/db/migrations" });
    return instance;
}

let _db: ReturnType<typeof createDb> | null = null;

export const db = new Proxy({} as ReturnType<typeof createDb>, {
    get(_, prop) {
        if (!_db) _db = createDb();
        return (_db as any)[prop as string];
    },
});

export type DB = ReturnType<typeof createDb>;
