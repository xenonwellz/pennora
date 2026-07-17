import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = Record<
    string,
    {
        label?: React.ReactNode;
        icon?: React.ComponentType;
        color?: string;
    }
>;

type ChartContextProps = {
    config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
    const context = React.useContext(ChartContext);
    if (!context) {
        throw new Error("useChart must be used within a <ChartContainer />");
    }
    return context;
}

function ChartContainer({
    id,
    className,
    children,
    config,
    ...props
}: React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
}) {
    const uniqueId = React.useId();
    const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

    return (
        <ChartContext.Provider value={{ config }}>
            <div
                data-slot="chart"
                data-chart={chartId}
                className={cn(
                    "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-hidden [&_.recharts-surface]:outline-hidden",
                    className,
                )}
                {...props}
            >
                <ChartStyle id={chartId} config={config} />
                <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
            </div>
        </ChartContext.Provider>
    );
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
    const colorConfig = Object.entries(config).filter(([, c]) => c.color);

    if (colorConfig.length === 0) return null;

    return (
        <style
            dangerouslySetInnerHTML={{
                __html: Object.entries(THEMES)
                    .map(
                        ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
    .map(([key, itemConfig]) => {
        const color = itemConfig.color;
        return color ? `  --color-${key}: ${color};` : null;
    })
    .join("\n")}
}
`,
                    )
                    .join("\n"),
            }}
        />
    );
}

function ChartTooltipContent({
    active,
    payload,
    className,
    hideLabel = false,
    labelFormatter,
    formatter,
    labelClassName,
    nameKey,
    labelKey,
}: {
    active?: boolean;
    payload?: Array<{
        name?: string;
        value?: number;
        dataKey?: string;
        color?: string;
        payload: Record<string, unknown>;
    }>;
    className?: string;
    hideLabel?: boolean;
    labelFormatter?: (label: unknown, payload: unknown) => React.ReactNode;
    formatter?: (value: number, name: string, item: unknown, index: number, payload: unknown) => React.ReactNode;
    labelClassName?: string;
    nameKey?: string;
    labelKey?: string;
}) {
    const { config } = useChart();

    if (!active || !payload?.length) return null;

    return (
        <div
            className={cn(
                "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-card px-2.5 py-1.5 text-xs",
                className,
            )}
        >
            {!hideLabel && payload[0] && (
                <div className={cn("font-medium", labelClassName)}>
                    {labelFormatter
                        ? labelFormatter(payload[0].payload[labelKey ?? "name"], payload)
                        : String(payload[0].payload[labelKey ?? "name"] ?? "")}
                </div>
            )}
            <div className="grid gap-1.5">
                {payload.map((item: (typeof payload)[number], index: number) => {
                    const key = `${nameKey || item.name || item.dataKey || "value"}`;
                    const itemConfig = config[key];
                    const indicatorColor = item.color || item.payload.fill || itemConfig?.color;

                    return (
                        <div
                            key={item.dataKey}
                            className="flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground"
                        >
                            <div
                                className="shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)"
                                style={
                                    {
                                        "--color-bg": indicatorColor,
                                        "--color-border": indicatorColor,
                                    } as React.CSSProperties
                                }
                            />
                            <div className="flex flex-1 justify-between leading-none">
                                <span className="text-muted-foreground">
                                    {itemConfig?.label || item.name}
                                </span>
                                {formatter && item?.value !== undefined && item.name ? (
                                    formatter(item.value, item.name, item, index, item.payload)
                                ) : (
                                    <span className="font-mono font-medium tabular-nums text-foreground">
                                        {typeof item.value === "number"
                                            ? item.value.toLocaleString()
                                            : item.value}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartStyle };
