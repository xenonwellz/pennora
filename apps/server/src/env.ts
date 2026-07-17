import { loadEnv } from "@expense/env/load";
loadEnv();

import { Env, corsOriginsFromCsv } from "@expense/env";
import { z } from "zod";

export const env = Env({
    PORT: z.coerce.number().int().positive().default(19801),
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.string().min(1).default("http://localhost:19801"),
    APP_URL: z.string().min(1).default("http://localhost:19802"),
    // Use `*` to allow any browser origin (Docker / unknown hosts). Comma-separated URLs otherwise.
    CORS_ORIGINS: corsOriginsFromCsv.default("http://localhost:19802"),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    /** SendByte API key (`sk_test_…` sandbox or `sk_live_…`). https://docs.sendbyte.africa/ */
    SENDBYTE_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default("Pennora <noreply@pennora.cv>"),
});
