import { loadEnv } from "@expense/env/load";
import { defineConfig } from "drizzle-kit";

// drizzle-kit may evaluate this as CJS (no import.meta). turbo runs from apps/server,
// so process.cwd() is apps/server and loadEnv walks up to the repo root .env.
loadEnv(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error(
        "DATABASE_URL is required for drizzle-kit. Set it in the repo root .env\n" +
            "  e.g. DATABASE_URL=postgres://expense:expense@localhost:19832/expense\n" +
            "  and ensure Postgres is up: docker compose --profile deps up -d",
    );
}

export default defineConfig({
    schema: "./src/db/schema/*",
    out: "./src/db/migrations",
    dialect: "postgresql",
    dbCredentials: {
        url: databaseUrl,
    },
});
