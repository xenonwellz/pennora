import { loadEnv } from "@expense/env/load";

loadEnv(import.meta.dir);

// Dynamic imports — must come AFTER loadEnv so .env vars are in process.env
const [{ env }, { initDB }, { default: app }] = await Promise.all([
    import("./env"),
    import("./db"),
    import("./app"),
]);

initDB(env.DATABASE_URL);

console.log(`API running on port ${env.PORT}`);

export default {
    port: env.PORT,
    fetch: app.fetch,
};
