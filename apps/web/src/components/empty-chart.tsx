import type { ReactNode } from "react";
import { ChartContainer } from "@/components/ui/chart";

type EmptyChartProps = {
    config: Record<string, { label?: string; color?: string }>;
    className?: string;
    message?: string;
    layout?: "horizontal" | "vertical";
};

export function EmptyChart({
    config,
    className,
    message = "No data",
    layout = "horizontal",
}: EmptyChartProps) {
    return (
        <div className="relative">
            <ChartContainer config={config} className={className}>
                <svg viewBox="0 0 400 200" className="w-full h-full min-h-[200px]">
                    <line x1="48" y1="160" x2="380" y2="160" className="stroke-border/60" strokeWidth="1" />
                    <line x1="48" y1="20" x2="48" y2="160" className="stroke-border/60" strokeWidth="1" />
                </svg>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="text-sm text-muted-foreground/70">{message}</span>
            </div>
        </div>
    );
}

export function EmptyPieChart({
    config,
    className,
    message = "No data",
}: {
    config: Record<string, { label?: string; color?: string }>;
    className?: string;
    message?: string;
}) {
    return (
        <div className="relative">
            <ChartContainer config={config} className={className}>
                <svg viewBox="0 0 200 200" className="w-full h-full min-h-[200px]">
                    <circle
                        cx="100"
                        cy="100"
                        r="70"
                        fill="none"
                        className="stroke-border/40"
                        strokeWidth="24"
                    />
                    <circle
                        cx="100"
                        cy="100"
                        r="42"
                        fill="none"
                        className="stroke-border/20"
                        strokeWidth="2"
                    />
                </svg>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="text-sm text-muted-foreground/70">{message}</span>
            </div>
        </div>
    );
}
