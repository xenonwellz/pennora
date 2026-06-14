export const env = {
    BETTER_AUTH_SECRET: "",
    BETTER_AUTH_URL: "",
    APP_URL: "",
    GOOGLE_CLIENT_ID: undefined as string | undefined,
    GOOGLE_CLIENT_SECRET: undefined as string | undefined,
    RESEND_API_KEY: undefined as string | undefined,
    EMAIL_FROM: "",
};

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
