import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currYear } from "@/lib/utils";

export type DashboardPeriod =
    | { type: "year"; year: number }
    | { type: "range"; startYearMonth: string; endYearMonth: string }
    | { type: "all" };

type DurationSelectorProps = {
    value: DashboardPeriod;
    onChange: (period: DashboardPeriod) => void;
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

export function DurationSelector({ value, onChange }: DurationSelectorProps) {
    const mode = value.type;
    const years = Array.from({ length: 8 }, (_, i) => currYear() - i + 1);

    return (
        <div className="flex flex-wrap items-end gap-3 w-full sm:w-auto">
            <div className="space-y-1 w-full min-[400px]:w-auto">
                <Label className="text-xs text-muted-foreground">Period</Label>
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
                    <SelectTrigger className="w-full min-[400px]:w-40">
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
                <div className="space-y-1 w-full min-[400px]:w-auto">
                    <Label className="text-xs text-muted-foreground">Year</Label>
                    <Select
                        value={String(value.year)}
                        onValueChange={(v) => onChange({ type: "year", year: Number(v) })}
                    >
                        <SelectTrigger className="w-full min-[400px]:w-28">
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
            )}

            {value.type === "range" && (
                <>
                    <div className="space-y-1 w-full min-[400px]:w-auto">
                        <Label className="text-xs text-muted-foreground">From</Label>
                        <Input
                            type="month"
                            value={value.startYearMonth}
                            onChange={(e) =>
                                onChange({
                                    ...value,
                                    startYearMonth: e.target.value,
                                })
                            }
                            className="w-full min-[400px]:w-40"
                        />
                    </div>
                    <div className="space-y-1 w-full min-[400px]:w-auto">
                        <Label className="text-xs text-muted-foreground">To</Label>
                        <Input
                            type="month"
                            value={value.endYearMonth}
                            onChange={(e) =>
                                onChange({
                                    ...value,
                                    endYearMonth: e.target.value,
                                })
                            }
                            className="w-full min-[400px]:w-40"
                        />
                    </div>
                </>
            )}
        </div>
    );
}
