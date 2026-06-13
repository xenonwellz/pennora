import { createAuthClient } from "better-auth/react";

const baseURL =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";

export const authClient = createAuthClient({
    baseURL,
});

export const { signIn, signUp, signOut, useSession } = authClient;
