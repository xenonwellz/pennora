import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type TextureCardProps = {
    children: ReactNode;
    className?: string;
    /** @deprecated Photo textures removed — kept for call-site compat (ignored). */
    texture?: "card" | "card-2";
};

/**
 * Flat bordered surface (Divide UI).
 * No elevation/shadows — hairline borders divide space.
 */
export function TextureCard({ children, className }: TextureCardProps) {
    return (
        <div className={cn("relative overflow-hidden rounded-xl border border-border bg-card", className)}>
            {children}
        </div>
    );
}
