import { z } from "zod";

type RuntimeEnv = Record<string, string | undefined>;

export const urlsFromCsv = z
    .string()
    .transform((raw) =>
        raw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
    )
    .pipe(z.array(z.string().url()).min(1));

function getRuntimeEnv(): RuntimeEnv {
    const viteEnv = (import.meta as unknown as { env?: RuntimeEnv }).env;
    if (viteEnv) {
        return { ...process.env, ...viteEnv };
    }
    return process.env;
}

function emptyStringsAsUndefined(runtimeEnv: RuntimeEnv) {
    return Object.fromEntries(
        Object.entries(runtimeEnv).map(([key, value]) => [
            key,
            value === "" ? undefined : value,
        ]),
    );
}

export function Env<const T extends z.ZodRawShape>(envSchema: T) {
    const parsed = emptyStringsAsUndefined(getRuntimeEnv());
    const parsedEnv = z.object(envSchema).safeParse(parsed);
    if (!parsedEnv.success) {
        const issues = parsedEnv.error.issues
            .map((i) => `  ${i.path.join(".")}: ${i.message}`)
            .join("\n");
        throw new Error(`Invalid environment:\n${issues}`);
    }
    return parsedEnv.data;
}
