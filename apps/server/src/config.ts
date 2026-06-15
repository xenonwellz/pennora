export const env = {
    BETTER_AUTH_SECRET: "",
    BETTER_AUTH_URL: "",
    APP_URL: "",
    CORS_ORIGINS: "",
    GOOGLE_CLIENT_ID: undefined as string | undefined,
    GOOGLE_CLIENT_SECRET: undefined as string | undefined,
    RESEND_API_KEY: undefined as string | undefined,
    EMAIL_FROM: "",
};

/**
 * Returns the list of allowed CORS / trusted origins.
 * If CORS_ORIGINS is set (comma-separated), it takes precedence.
 * Otherwise falls back to sensible dev defaults.
 */
export function getAllowedOrigins(): string[] {
    if (env.CORS_ORIGINS) {
        return env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [
        "http://localhost:5173",
        "http://localhost:80",
        "http://localhost:8080",
        "http://localhost:3001",
        env.BETTER_AUTH_URL,
        env.APP_URL,
    ].filter((origin, index, list) => Boolean(origin) && list.indexOf(origin) === index);
}

export function setConfig(overrides: Partial<typeof env>) {
    Object.assign(env, overrides);
}

export function isGoogleEnabled() {
    return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function isEmailEnabled() {
    return Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);
}

export function publicConfig() {
    return {
        googleEnabled: isGoogleEnabled(),
        emailEnabled: isEmailEnabled(),
    };
}
