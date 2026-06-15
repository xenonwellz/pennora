import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

import { setDB } from "./db";
import { setConfig } from "./config";
import * as authSchema from "./db/schema/auth";
import * as domainSchema from "./db/schema/domain";
import app from "./app";

// Initialize config from Bun.env
setConfig({
    BETTER_AUTH_SECRET: Bun.env.BETTER_AUTH_SECRET ?? "dev-secret-replace-in-production-32chars!!",
    BETTER_AUTH_URL: Bun.env.BETTER_AUTH_URL ?? "http://localhost:5173",
    APP_URL: Bun.env.APP_URL ?? Bun.env.BETTER_AUTH_URL ?? "http://localhost:5173",
    CORS_ORIGINS: Bun.env.CORS_ORIGINS ?? "",
    GOOGLE_CLIENT_ID: Bun.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: Bun.env.GOOGLE_CLIENT_SECRET,
    RESEND_API_KEY: Bun.env.RESEND_API_KEY,
    EMAIL_FROM: Bun.env.EMAIL_FROM ?? "Peak Finance <onboarding@resend.dev>",
});

// Initialize SQLite database
const path = Bun.env.DB_PATH ?? "data.db";
const sqlite = new Database(path);
sqlite.run("PRAGMA journal_mode=WAL");
sqlite.run("PRAGMA foreign_keys=ON");
const database = drizzle(sqlite, { schema: { ...authSchema, ...domainSchema } });
migrate(database, { migrationsFolder: "./src/db/migrations" });
setDB(database);

export default {
    port: Number(Bun.env.PORT) || 3001,
    fetch: app.fetch,
};
