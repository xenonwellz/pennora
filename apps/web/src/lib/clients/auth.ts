import { createAuthClient } from "better-auth/react";

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? window.location.origin;

export const authClient = createAuthClient({
    baseURL: backendUrl,
});

export const { signIn, signUp, signOut, useSession } = authClient;
