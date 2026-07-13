import { env } from "./env";

// Re-export env for backwards compatibility
export { env };

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
