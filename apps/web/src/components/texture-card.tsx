import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type TextureCardProps = {
    children: ReactNode;
    className?: string;
    /** Pass to enable a subtle background texture overlay */
    texture?: "card" | "card-2";
};

export function TextureCard({ children, className, texture }: TextureCardProps) {
    const src = texture === "card-2" ? "/textures/card-2.jpg" : "/textures/card.png";

    return (
        <div className={cn("relative rounded-xl border bg-card overflow-hidden", className)}>
            {texture && (
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.015] bg-cover bg-center"
                    style={{ backgroundImage: `url(${src})` }}
                />
            )}
            <div className={texture ? "relative" : undefined}>{children}</div>
        </div>
    );
}
