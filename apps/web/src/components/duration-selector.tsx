import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { currYear, cn } from "@/lib/utils";

export type DashboardPeriod =
    | { type: "year"; year: number }
    | { type: "range"; startYearMonth: string; endYearMonth: string }
    | { type: "all" };

type DurationSelectorProps = {
    value: DashboardPeriod;
    onChange: (period: DashboardPeriod) => void;
    className?: string;
};

const MODE_LABELS = {
    year: "Year",
    range: "Custom range",
    all: "All time",
} as const;

export function periodToApiParams(period: DashboardPeriod) {
    if (period.type === "year") return { year: period.year };
    if (period.type === "all") return { allTime: true as const };
    return { startYearMonth: period.startYearMonth, endYearMonth: period.endYearMonth };
}

export function periodLabel(period: DashboardPeriod): string {
    if (period.type === "year") return String(period.year);
    if (period.type === "all") return "All time";
    return `${period.startYearMonth} – ${period.endYearMonth}`;
}

/** Joined control — rounded flat group, no shadow */
const groupShell =
    "flex w-full min-w-0 overflow-hidden rounded-xl border border-border bg-card";
const segmentTrigger =
    "h-11 !w-full min-w-0 rounded-none border-0 bg-transparent shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 data-[size=default]:h-11";

export function DurationSelector({ value, onChange, className }: DurationSelectorProps) {
    const mode = value.type;
    const years = Array.from({ length: 8 }, (_, i) => currYear() - i + 1);

    return (
        <div className={cn("w-full sm:w-auto sm:min-w-[280px]", className)}>
            <div className={groupShell}>
                {/* Mode */}
                <div
                    className={cn(
                        "min-w-0 shrink",
                        mode === "all" ? "flex-1" : "flex-[1.1]",
                    )}
                >
                    <Select
                        value={mode}
                        onValueChange={(v) => {
                            if (v === "year") onChange({ type: "year", year: currYear() });
                            else if (v === "all") onChange({ type: "all" });
                            else
                                onChange({
                                    type: "range",
                                    startYearMonth: `${currYear()}-01`,
                                    endYearMonth: `${currYear()}-12`,
                                });
                        }}
                    >
                        <SelectTrigger className={cn(segmentTrigger, "px-3")}>
                            <SelectValue>{MODE_LABELS[mode]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="year">Year</SelectItem>
                            <SelectItem value="range">Custom range</SelectItem>
                            <SelectItem value="all">All time</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {value.type === "year" && (
                    <>
                        <div className="w-px shrink-0 self-stretch bg-border" aria-hidden />
                        <div className="min-w-0 flex-[0.9]">
                            <Select
                                value={String(value.year)}
                                onValueChange={(v) => onChange({ type: "year", year: Number(v) })}
                            >
                                <SelectTrigger className={cn(segmentTrigger, "px-3")}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map((y) => (
                                        <SelectItem key={y} value={String(y)}>
                                            {y}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </>
                )}

                {value.type === "range" && (
                    <>
                        <div className="w-px shrink-0 self-stretch bg-border" aria-hidden />
                        <div className="min-w-0 flex-1">
                            <Input
                                type="month"
                                value={value.startYearMonth}
                                onChange={(e) =>
                                    onChange({
                                        ...value,
                                        startYearMonth: e.target.value,
                                    })
                                }
                                className="h-11 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 px-2 sm:px-3"
                                aria-label="From month"
                            />
                        </div>
                        <div className="w-px shrink-0 self-stretch bg-border" aria-hidden />
                        <div className="min-w-0 flex-1">
                            <Input
                                type="month"
                                value={value.endYearMonth}
                                onChange={(e) =>
                                    onChange({
                                        ...value,
                                        endYearMonth: e.target.value,
                                    })
                                }
                                className="h-11 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 px-2 sm:px-3"
                                aria-label="To month"
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
