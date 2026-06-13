import {
    Dialog,
    DialogPanelBody,
    DialogPanelContent,
    DialogPanelHeader,
} from "@/components/ui/dialog";
import { usePeriodCategoryBreakdown } from "@/lib/queries";
import { formatNGN, monthLabel } from "@/lib/utils";
import type { DashboardPeriod } from "@/components/duration-selector";
import { periodLabel, periodToApiParams } from "@/components/duration-selector";

type CategoryDrilldownDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categoryId: string | null;
    categoryName: string;
    period: DashboardPeriod;
};

export function CategoryDrilldownDialog({
    open,
    onOpenChange,
    categoryId,
    categoryName,
    period,
}: CategoryDrilldownDialogProps) {
    const { data, isLoading } = usePeriodCategoryBreakdown(
        { ...periodToApiParams(period), categoryId },
        open,
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPanelContent className="max-w-lg">
                <DialogPanelHeader
                    title={categoryName}
                    description={`${periodLabel(period)} · ${data ? formatNGN(data.totalNgn) : "—"}`}
                />
                <DialogPanelBody className="max-h-96 overflow-y-auto">
                    {isLoading && (
                        <div className="h-24 rounded-lg bg-muted/40 animate-pulse" />
                    )}
                    {!isLoading && data && data.items.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">No items in this period.</p>
                    )}
                    {!isLoading && data && data.items.length > 0 && (
                        <div className="space-y-1">
                            {data.items.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0"
                                >
                                    <div className="min-w-0">
                                        <p className={`text-sm font-medium truncate ${item.paid ? "line-through text-muted-foreground" : ""}`}>
                                            {item.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{monthLabel(item.yearMonth)}</p>
                                    </div>
                                    <span className="text-sm font-medium tabular-nums shrink-0 ml-3">
                                        {formatNGN(item.amountNgn)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </DialogPanelBody>
            </DialogPanelContent>
        </Dialog>
    );
}
