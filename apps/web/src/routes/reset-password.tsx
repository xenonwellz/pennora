import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { authClient } from "../lib/clients/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthLayout, AuthLink } from "@/components/auth/auth-layout";
import { AuthError, AuthField, AuthSuccess } from "@/components/auth/auth-form";

const searchSchema = z.object({
    token: z.string().optional(),
});

export const Route = createFileRoute("/reset-password")({
    validateSearch: searchSchema,
    component: ResetPasswordPage,
});

function ResetPasswordPage() {
    const navigate = useNavigate();
    const { token } = Route.useSearch();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [pending, setPending] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!token) {
            setError("Reset link is invalid or missing a token.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        setPending(true);
        try {
            const result = await authClient.resetPassword({ newPassword: password, token });
            if (result.error) {
                setError(result.error.message ?? "Failed to reset password");
                return;
            }
            setSuccess(true);
            setTimeout(() => navigate({ to: "/login" }), 2000);
        } catch {
            setError("Failed to reset password. The link may have expired.");
        } finally {
            setPending(false);
        }
    };

    return (
        <AuthLayout
            title="Reset password"
            subtitle="Choose a new password for your account."
            footer={<AuthLink to="/login">Back to sign in</AuthLink>}
            variant="centered"
        >
            {!token ? (
                <AuthError message="This reset link is invalid. Request a new one from the sign-in page." />
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <AuthField label="New password">
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

                    <AuthField label="Confirm password">
                        <Input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={8}
                            autoComplete="new-password"
                            placeholder="Repeat your password"
                            className="h-10"
                        />
                    </AuthField>

                    <AuthError message={error} />
                    {success && (
                        <AuthSuccess message="Password updated. Redirecting to sign in..." />
                    )}

                    <Button type="submit" className="h-10 w-full" disabled={pending || success}>
                        {pending ? "Updating..." : "Update password"}
                    </Button>
                </form>
            )}
        </AuthLayout>
    );
}
