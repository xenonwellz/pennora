import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { signUp, useSession } from "../lib/clients/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthLayout, AuthLink } from "@/components/auth/auth-layout";
import {
    AuthDivider,
    GoogleSignInButton,
    useGoogleSignInVisible,
} from "@/components/auth/google-sign-in-button";
import { AuthError, AuthField } from "@/components/auth/auth-form";

export const Route = createFileRoute("/register")({
    component: RegisterPage,
});

function RegisterPage() {
    const navigate = useNavigate();
    const { data: session } = useSession();
    const showGoogle = useGoogleSignInVisible();
    const [name, setName] = useState("");
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
            const { error: err } = await signUp.email({ name, email, password });
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
            title="Create account"
            subtitle="Start tracking expenses with your first budget workspace."
            footer={
                <>
                    Already have an account? <AuthLink to="/login">Sign in</AuthLink>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <AuthField label="Name">
                    <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        autoComplete="name"
                        placeholder="Your name"
                        className="h-10"
                    />
                </AuthField>

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
                        minLength={8}
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        className="h-10"
                    />
                </AuthField>

                <AuthError message={error} />

                <Button type="submit" className="h-10 w-full" disabled={pending}>
                    {pending ? "Creating account..." : "Create account"}
                </Button>
            </form>

            {showGoogle && (
                <>
                    <AuthDivider />
                    <GoogleSignInButton label="Sign up with Google" />
                </>
            )}
        </AuthLayout>
    );
}
