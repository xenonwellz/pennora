import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { signIn, useSession } from "../lib/clients/auth";
import { useAuthConfig } from "../lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthLayout, AuthLink } from "@/components/auth/auth-layout";
import {
    AuthDivider,
    GoogleSignInButton,
    useGoogleSignInVisible,
} from "@/components/auth/google-sign-in-button";
import { AuthError, AuthField } from "@/components/auth/auth-form";

export const Route = createFileRoute("/login")({
    component: LoginPage,
});

function LoginPage() {
    const navigate = useNavigate();
    const { data: session } = useSession();
    const showGoogle = useGoogleSignInVisible();
    const { data: config } = useAuthConfig();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);

    useEffect(() => {
        if (session) navigate({ to: "/" });
    }, [session, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setPending(true);
        try {
            const { error: err } = await signIn.email({ email, password });
            if (err) {
                setError(err.message ?? err.statusText);
            } else {
                navigate({ to: "/" });
            }
        } finally {
            setPending(false);
        }
    };

    if (session) return null;

    return (
        <AuthLayout
            title="Sign in"
            subtitle="Welcome back. Enter your credentials to continue."
            footer={
                <>
                    Don&apos;t have an account? <AuthLink to="/register">Create one</AuthLink>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <AuthField label="Email">
                    <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        placeholder="you@example.com"
                        className="h-10"
                    />
                </AuthField>

                <AuthField label="Password">
                    <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        className="h-10"
                    />
                </AuthField>

                {config?.emailEnabled && (
                    <div className="text-right">
                        <AuthLink to="/forgot-password">Forgot password?</AuthLink>
                    </div>
                )}

                <AuthError message={error} />

                <Button type="submit" className="h-10 w-full" disabled={pending}>
                    {pending ? "Signing in..." : "Sign in"}
                </Button>
            </form>

            {showGoogle && (
                <>
                    <AuthDivider />
                    <GoogleSignInButton />
                </>
            )}
        </AuthLayout>
    );
}
