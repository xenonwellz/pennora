import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSession } from "../lib/clients/auth";
import { useAcceptInvitation, useInvitation } from "../lib/queries";
import { Button } from "@/components/ui/button";
import { AuthLayout, AuthLink } from "@/components/auth/auth-layout";
import { AuthError, AuthSuccess } from "@/components/auth/auth-form";

export const Route = createFileRoute("/invite/$token")({
    component: InviteAcceptPage,
});

function InviteAcceptPage() {
    const { token } = Route.useParams();
    const navigate = useNavigate();
    const { data: session } = useSession();
    const { data: invitation, isLoading, error } = useInvitation(token);
    const acceptInvitation = useAcceptInvitation();
    const [localError, setLocalError] = useState("");
    const [accepted, setAccepted] = useState(false);

    const handleAccept = async () => {
        setLocalError("");
        try {
            await acceptInvitation.mutateAsync(token);
            setAccepted(true);
            setTimeout(() => navigate({ to: "/" }), 1500);
        } catch (err) {
            setLocalError(err instanceof Error ? err.message : "Failed to accept invitation");
        }
    };

    if (isLoading) {
        return (
            <AuthLayout title="Invitation" subtitle="Loading invitation details...">
                <div className="h-24 rounded-xl bg-muted/40 animate-pulse" />
            </AuthLayout>
        );
    }

    if (error || !invitation) {
        return (
            <AuthLayout
                title="Invitation unavailable"
                subtitle="This link may be invalid or expired."
                footer={<AuthLink to="/login">Go to sign in</AuthLink>}
            >
                <AuthError message="We couldn't find a valid invitation for this link." />
            </AuthLayout>
        );
    }

    if (!session) {
        return (
            <AuthLayout
                title="You're invited"
                subtitle={`Join ${invitation.budgetName} on Pennora.`}
            >
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Sign in or create an account with{" "}
                        <span className="font-medium text-foreground">{invitation.email}</span>{" "}
                        to accept this invitation.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Link to="/login" className="flex-1">
                            <Button className="h-10 w-full">Sign in</Button>
                        </Link>
                        <Link to="/register" className="flex-1">
                            <Button variant="outline" className="h-10 w-full">
                                Create account
                            </Button>
                        </Link>
                    </div>
                </div>
            </AuthLayout>
        );
    }

    const emailMismatch = session.user.email.toLowerCase() !== invitation.email.toLowerCase();

    return (
        <AuthLayout
            title="Accept invitation"
            subtitle={`Join ${invitation.budgetName} as a collaborator.`}
        >
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Invitation sent to <span className="font-medium text-foreground">{invitation.email}</span>
                </p>

                {emailMismatch && (
                    <AuthError
                        message={`You're signed in as ${session.user.email}. Sign out and use ${invitation.email} to accept.`}
                    />
                )}

                <AuthError message={localError} />
                {accepted && <AuthSuccess message="Invitation accepted. Opening your dashboard..." />}

                <Button
                    className="w-full"
                    disabled={emailMismatch || acceptInvitation.isPending || accepted}
                    onClick={handleAccept}
                >
                    {acceptInvitation.isPending ? "Accepting..." : "Accept invitation"}
                </Button>
            </div>
        </AuthLayout>
    );
}
