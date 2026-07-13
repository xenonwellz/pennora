/**
 * Worker entry — kept for parity but local dev uses index.ts with Bun.
 * For production, deploy to a VM/container that runs `bun run src/index.ts`.
 */
import { loadEnv } from "@expense/env/load";

loadEnv(import.meta.dir);

const [{ env }, { initDB }, { default: app }] = await Promise.all([
    import("./env"),
    import("./db"),
    import("./app"),
]);

initDB(env.DATABASE_URL);

export default {
    port: env.PORT,
    fetch: app.fetch,
};
