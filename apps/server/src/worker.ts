/**
 * Cloudflare Worker entry point.
 *
 * Deploy with:
 *   npx wrangler deploy --config apps/server/wrangler.toml
 *
 * Local dev uses apps/server/src/index.ts (Bun + file SQLite).
 */
import app from "./app";

export interface Env {
    DB: D1Database;
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
        return app.fetch(request, env, ctx);
    },
};
