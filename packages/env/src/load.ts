import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";

export function loadEnv(startDir?: string, opts?: { verbose?: boolean }): void {
    let dir = startDir ? resolve(startDir) : process.cwd();
    const candidates: string[] = [];

    while (true) {
        const candidate = resolve(dir, ".env");
        if (existsSync(candidate)) candidates.push(candidate);
        const parent = dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }

    for (const candidate of candidates.reverse()) {
        const before = { ...process.env };
        const result = config({ path: candidate });
        if (opts?.verbose && result.parsed) {
            const injected = Object.keys(result.parsed).filter((k) => !(k in before));
            if (injected.length > 0) {
                console.log(`◇ loadEnv  ${candidate}  →  ${injected.join(", ")}`);
            }
        }
    }
}
