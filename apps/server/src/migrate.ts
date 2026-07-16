/**
 * Production migration runner — uses drizzle-orm migrator (no drizzle-kit CLI).
 * Invoked by docker/entrypoint-api.sh after the DB is reachable.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { resolve } from "node:path";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error("[migrate] DATABASE_URL is required");
    process.exit(1);
}

const migrationsFolder = resolve(
    process.env.MIGRATIONS_FOLDER ?? "./src/db/migrations",
);

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

try {
    console.log(`[migrate] Applying migrations from ${migrationsFolder}...`);
    await migrate(db, { migrationsFolder });
    console.log("[migrate] Done");
} catch (err) {
    console.error("[migrate] Failed:", err);
    process.exit(1);
} finally {
    await pool.end();
}
