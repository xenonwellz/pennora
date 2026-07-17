import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TextureCard } from "@/components/texture-card";

type PanelCardProps = {
    children: ReactNode;
    className?: string;
    texture?: "card" | "card-2";
};

/** Flat section panel — prefer nesting via divide-y parent when stacking many sections. */
export function PanelCard({ children, className, texture }: PanelCardProps) {
    return (
        <TextureCard className={cn("p-0", className)} texture={texture}>
            {children}
        </TextureCard>
    );
}

type PanelCardHeaderProps = {
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    className?: string;
};

export function PanelCardHeader({ title, description, action, className }: PanelCardHeaderProps) {
    return (
        <>
            <div className={cn("flex items-start justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5", className)}>
                <div className="min-w-0">
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {title}
                    </div>
                    {description ? (
                        <p className="mt-1 text-sm font-normal normal-case tracking-normal text-muted-foreground line-clamp-2">
                            {description}
                        </p>
                    ) : null}
                </div>
                {action}
            </div>
            <div className="border-b border-border" />
        </>
    );
}

export function PanelCardContent({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn("px-4 py-3.5 sm:px-5 sm:py-4", className)}>{children}</div>;
}

export function PanelCardFooter({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <>
            <div className="border-t border-border" />
            <div className={cn("px-4 py-3 sm:px-5 sm:py-3.5", className)}>{children}</div>
        </>
    );
}
