import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeftIcon, ArrowRightIcon, Calendar03Icon } from "@hugeicons/core-free-icons";

const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function parseYearMonth(ym: string): { year: number; month: number } {
    const [y, m] = ym.split("-").map(Number);
    return { year: y ?? new Date().getFullYear(), month: m ?? new Date().getMonth() + 1 };
}

function formatYearMonth(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, "0")}`;
}

function formatLabel(ym: string): string {
    const { year, month } = parseYearMonth(ym);
    const date = new Date(year, month - 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

interface MonthPickerProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

export function MonthPicker({ value, onChange, className }: MonthPickerProps) {
    const [open, setOpen] = useState(false);
    const { year, month } = parseYearMonth(value);
    const [viewYear, setViewYear] = useState(year);

    const selectMonth = (m: number) => {
        onChange(formatYearMonth(viewYear, m));
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={
                    <Button
                        variant="outline"
                        className={cn(
                            "w-full justify-start gap-2 text-left font-normal sm:w-auto",
                            className,
                        )}
                    />
                }
            >
                <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{formatLabel(value)}</span>
            </PopoverTrigger>
            <PopoverContent className="p-4" align="start">
                <div className="flex items-center justify-between mb-3">
                    <button
                        onClick={() => setViewYear((y) => y - 1)}
                        className="size-7 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
                    >
                        <HugeiconsIcon icon={ArrowLeftIcon} strokeWidth={2} className="size-3.5" />
                    </button>
                    <span className="text-sm font-semibold tabular-nums">{viewYear}</span>
                    <button
                        onClick={() => setViewYear((y) => y + 1)}
                        className="size-7 rounded-lg flex items-center justify-center hover:bg-accent transition-colors"
                    >
                        <HugeiconsIcon icon={ArrowRightIcon} strokeWidth={2} className="size-3.5" />
                    </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                    {MONTHS.map((label, i) => {
                        const m = i + 1;
                        const isSelected = year === viewYear && month === m;
                        const isCurrent =
                            new Date().getFullYear() === viewYear &&
                            new Date().getMonth() + 1 === m;
                        return (
                            <button
                                key={m}
                                onClick={() => selectMonth(m)}
                                className={cn(
                                    "h-9 rounded-xl text-sm font-medium transition-all duration-150",
                                    isSelected
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-accent text-foreground/70 hover:text-foreground",
                                    isCurrent && !isSelected && "ring-1 ring-primary/40"
                                )}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}
