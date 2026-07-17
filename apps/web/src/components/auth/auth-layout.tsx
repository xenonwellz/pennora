import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/logo";

type AuthLayoutProps = {
    title: string;
    subtitle: string;
    children: ReactNode;
    footer?: ReactNode;
    variant?: "split" | "centered";
};

function GradientPanel() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="orb orb-1" />
            <div className="orb orb-2" />
            <div className="orb orb-3" />
        </div>
    );
}

export function AuthLayout({
    title,
    subtitle,
    children,
    footer,
    variant = "split",
}: AuthLayoutProps) {
    if (variant === "centered") {
        return (
            <div className="relative flex min-h-screen items-center justify-center bg-sidebar px-4 py-10 sm:px-8 safe-inset">
                <GradientPanel />
                <div className="relative z-10 w-full max-w-md">
                    <div className="mb-8 text-center">
                        <Logo size={48} className="mx-auto mb-4 rounded-2xl" />
                        <p className="font-heading text-sm font-semibold text-white/90">Pennora</p>
                    </div>

                    <div className="rounded-2xl border border-border bg-white px-6 py-8 sm:px-8">
                        <h1 className="font-heading text-xl font-semibold text-foreground">
                            {title}
                        </h1>
                        <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
                        <div className="mt-6 space-y-5">{children}</div>
                        {footer && (
                            <div className="mt-6 border-t border-border pt-4 text-center text-sm text-muted-foreground">
                                {footer}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid min-h-screen lg:grid-cols-2">
            <aside className="relative hidden overflow-hidden bg-sidebar lg:flex lg:flex-col lg:justify-between px-10 py-10 safe-pt safe-pb safe-pl">
                <GradientPanel />
                <div className="relative z-10">
                    <div className="mb-12 flex items-center gap-3">
                        <Logo size={44} className="rounded-2xl" />
                        <div>
                            <p className="font-heading text-base font-semibold text-white">
                                Pennora
                            </p>
                            <p className="text-xs text-white/60">Expense tracking</p>
                        </div>
                    </div>
                    <h2 className="font-heading text-3xl font-semibold text-white leading-tight">
                        Clarity for every naira.
                    </h2>
                    <p className="mt-4 text-sm leading-relaxed text-white/70 max-w-sm">
                        Plan monthly budgets, track spending, and collaborate with your household or team.
                    </p>
                </div>
                <p className="relative z-10 text-[11px] text-white/40">
                    Secure sign-in · Multi-budget workspaces
                </p>
            </aside>

            <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8 bg-background safe-inset">
                <div className="w-full max-w-md">
                    <div className="mb-8 text-center lg:hidden">
                        <Logo size={48} className="mx-auto mb-4 rounded-2xl" />
                        <p className="font-heading text-sm font-semibold text-foreground">Pennora</p>
                    </div>

                    <h1 className="font-heading text-xl font-semibold text-foreground">
                        {title}
                    </h1>
                    <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>

                    <div className="mt-6 space-y-5">{children}</div>

                    {footer && (
                        <div className="mt-6 text-center text-sm text-muted-foreground">
                            {footer}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function AuthLink({ to, children }: { to: string; children: ReactNode }) {
    return (
        <Link to={to} className="font-medium text-primary hover:underline">
            {children}
        </Link>
    );
}
