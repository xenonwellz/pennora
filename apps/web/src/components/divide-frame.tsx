import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Divide UI panel — bordered, rounded, flat (no shadow).
 * Children use divide-y / divide-x; each cell owns its padding.
 */
export function DivideFrame({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "overflow-hidden rounded-xl border border-border bg-card",
                className,
            )}
        >
            {children}
        </div>
    );
}

/** Section label row inside a divide frame */
export function DivideSectionLabel({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30",
                className,
            )}
        >
            {children}
        </div>
    );
}
