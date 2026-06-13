import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TextureCard } from "@/components/texture-card";

type PanelCardProps = {
    children: ReactNode;
    className?: string;
    texture?: "card" | "card-2";
};

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
            <div className={cn("flex items-start justify-between gap-4 px-6 py-5", className)}>
                <div className="min-w-0">
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {title}
                    </div>
                    {description ? (
                        <p className="mt-1 text-sm font-normal normal-case tracking-normal text-muted-foreground">
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
    return <div className={cn("p-6", className)}>{children}</div>;
}

export function PanelCardFooter({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <>
            <div className="border-t border-border" />
            <div className={cn("px-6 py-5", className)}>{children}</div>
        </>
    );
}
