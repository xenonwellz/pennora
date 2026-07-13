import type { ProxyOptions } from "vite";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_TARGET = "http://localhost:19801";

export const apiProxy: Record<string, string | ProxyOptions> = {
    "/rpc": { target: API_TARGET, changeOrigin: true },
    "/api/": { target: API_TARGET, changeOrigin: true },
};

export const rootEnvDir = path.resolve(__dirname, "..");
