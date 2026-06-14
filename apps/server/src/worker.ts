/**
 * Cloudflare Worker entry point.
 *
 * Deploy with:
 *   cd apps/server && npx wrangler deploy
 *
 * Local dev uses apps/server/src/index.ts (Bun + file SQLite).
 */
import { drizzle } from "drizzle-orm/d1";
import app from "./app";
import { setDB } from "./db";
import { setConfig } from "./config";
import * as authSchema from "./db/schema/auth";
import * as domainSchema from "./db/schema/domain";

export interface Env {
    DB: D1Database;
    BUCKET: R2Bucket;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
    APP_URL: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
}

export default {
    fetch(request: Request, env: Env, ctx: ExecutionContext) {
        setConfig({
            BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
            BETTER_AUTH_URL: env.BETTER_AUTH_URL,
            APP_URL: env.APP_URL,
            GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
            RESEND_API_KEY: env.RESEND_API_KEY,
            EMAIL_FROM: env.EMAIL_FROM,
        });

        const database = drizzle(env.DB, { schema: { ...authSchema, ...domainSchema } });
        setDB(database);

        return app.fetch(request, env, ctx);
    },
};
