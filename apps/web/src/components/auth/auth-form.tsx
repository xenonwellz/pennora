import { cn } from "@/lib/utils";

export function AuthError({ message }: { message: string }) {
    if (!message) return null;
    return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            {message}
        </div>
    );
}

export function AuthSuccess({ message }: { message: string }) {
    if (!message) return null;
    return (
        <div className="rounded-lg border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 px-3 py-2.5 text-sm text-[var(--color-success)]">
            {message}
        </div>
    );
}

export function AuthField({
    label,
    children,
    className,
}: {
    label: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("space-y-1.5", className)}>
            <label className="text-sm font-medium text-foreground">{label}</label>
            {children}
        </div>
    );
}
