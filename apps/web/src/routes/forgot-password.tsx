import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "../lib/clients/auth";
import { useAuthConfig } from "../lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthLayout, AuthLink } from "@/components/auth/auth-layout";
import { AuthError, AuthField, AuthSuccess } from "@/components/auth/auth-form";

export const Route = createFileRoute("/forgot-password")({
    component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
    const { data: config } = useAuthConfig();
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [pending, setPending] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setPending(true);
        try {
            const result = await authClient.requestPasswordReset({
                email,
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (result.error) {
                setError(result.error.message ?? "Failed to send reset email");
                return;
            }
            setSuccess("If an account exists for that email, a reset link is on its way.");
        } catch {
            setError("Failed to send reset email. Try again later.");
        } finally {
            setPending(false);
        }
    };

    if (config && !config.emailEnabled) {
        return (
            <AuthLayout
                title="Password reset"
                subtitle="Email delivery is not configured for this environment."
                footer={<AuthLink to="/login">Back to sign in</AuthLink>}
                variant="centered"
            >
                <p className="text-sm leading-relaxed text-muted-foreground">
                    Password reset emails require a{" "}
                    <code className="rounded bg-muted px-1 py-0.5 text-[11px]">RESEND_API_KEY</code>{" "}
                    in your environment. Contact your administrator to reset your password manually.
                </p>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title="Forgot password"
            subtitle="Enter your email and we'll send a reset link."
            footer={<AuthLink to="/login">Back to sign in</AuthLink>}
            variant="centered"
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

                <AuthError message={error} />
                <AuthSuccess message={success} />

                <Button type="submit" className="h-10 w-full" disabled={pending || Boolean(success)}>
                    {pending ? "Sending..." : "Send reset link"}
                </Button>
            </form>
        </AuthLayout>
    );
}
