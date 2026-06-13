import { defineConfig } from "drizzle-kit";

const dbPath = (typeof Bun !== "undefined" ? Bun.env.DB_PATH : process.env.DB_PATH) ?? "data.db";

export default defineConfig({
    schema: "./src/db/schema/*",
    out: "./src/db/migrations",
    dialect: "sqlite",
    dbCredentials: {
        url: dbPath,
    },
});
