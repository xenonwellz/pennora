import { loadEnv } from "@expense/env/load";
loadEnv();

import { Env, urlsFromCsv } from "@expense/env";
import { z } from "zod";

export const env = Env({
    PORT: z.coerce.number().int().positive().default(19801),
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.string().min(1).default("http://localhost:19801"),
    APP_URL: z.string().min(1).default("http://localhost:19802"),
    CORS_ORIGINS: urlsFromCsv.default("http://localhost:19802"),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default("Pennora <onboarding@resend.dev>"),
});
