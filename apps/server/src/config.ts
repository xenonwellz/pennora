function id() {
    return crypto.randomUUID();
}

export const env = {
    BETTER_AUTH_SECRET: Bun.env.BETTER_AUTH_SECRET ?? "dev-secret-replace-in-production-32chars!!",
    BETTER_AUTH_URL: Bun.env.BETTER_AUTH_URL ?? "http://localhost:5173",
    APP_URL: Bun.env.APP_URL ?? Bun.env.BETTER_AUTH_URL ?? "http://localhost:5173",
    GOOGLE_CLIENT_ID: Bun.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: Bun.env.GOOGLE_CLIENT_SECRET,
    RESEND_API_KEY: Bun.env.RESEND_API_KEY,
    EMAIL_FROM: Bun.env.EMAIL_FROM ?? "Peak Finance <onboarding@resend.dev>",
};

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
