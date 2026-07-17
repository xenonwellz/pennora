import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
    useExpenseDrafts,
    useIncomeDrafts,
    useSetItemDraft,
    useSetIncomeDraft,
    useDeleteBudgetItem,
    useDeleteIncomeTarget,
} from "../lib/queries";
import { DivideFrame, DivideSectionLabel } from "@/components/divide-frame";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency, monthLabel, cn } from "../lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Delete01Icon,
    InboxUploadIcon,
} from "@hugeicons/core-free-icons";

export const Route = createFileRoute("/drafts")({
    component: DraftsPage,
});

type PendingDelete =
    | { kind: "expense"; id: string; name: string }
    | { kind: "income"; id: string; name: string }
    | null;

/** Same ghost icon chrome as budget expense row actions */
const actionBtn = "size-8 shrink-0 text-muted-foreground";

function DraftsPage() {
    const { data: expenses, isLoading: loadingExp } = useExpenseDrafts();
    const { data: income, isLoading: loadingInc } = useIncomeDrafts();
    const setExpenseDraft = useSetItemDraft();
    const setIncomeDraft = useSetIncomeDraft();
    const deleteExpense = useDeleteBudgetItem();
    const deleteIncome = useDeleteIncomeTarget();
    const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);

    const isLoading = loadingExp || loadingInc;
    const expCount = expenses?.length ?? 0;
    const incCount = income?.length ?? 0;
    const empty = !isLoading && expCount === 0 && incCount === 0;
    const activating = setExpenseDraft.isPending || setIncomeDraft.isPending;

    return (
        <div className="space-y-4 sm:space-y-5">
            <div>
                <h1 className="text-xl sm:text-2xl font-heading font-semibold">Drafts</h1>
                <p className="text-sm text-muted-foreground">
                    Expenses and earnings saved as draft — activate to include them in totals
                </p>
            </div>

            {isLoading && (
                <DivideFrame>
                    <div className="h-32 animate-pulse bg-muted/30" />
                </DivideFrame>
            )}

            {empty && (
                <DivideFrame>
                    <div className="flex flex-col items-center text-center px-6 py-10">
                        <p className="text-sm text-muted-foreground mb-3">No drafts yet</p>
                        <Button size="sm" render={<Link to="/budget" />}>
                            Go to Budget
                        </Button>
                    </div>
                </DivideFrame>
            )}

            {expCount > 0 && (
                <DivideFrame className="divide-y divide-border">
                    <DivideSectionLabel>
                        Expense drafts ({expCount})
                    </DivideSectionLabel>
                    {expenses!.map((item) => (
                        <DraftExpenseRow
                            key={item.id}
                            name={item.name}
                            amount={item.amount}
                            currency={item.currency}
                            yearMonth={item.yearMonth}
                            category={item.category?.name ?? "Uncategorized"}
                            pending={activating}
                            onActivate={() =>
                                setExpenseDraft.mutate({ id: item.id, isDraft: false })
                            }
                            onDelete={() =>
                                setPendingDelete({
                                    kind: "expense",
                                    id: item.id,
                                    name: item.name,
                                })
                            }
                        />
                    ))}
                </DivideFrame>
            )}

            {incCount > 0 && (
                <DivideFrame className="divide-y divide-border">
                    <DivideSectionLabel>
                        Income drafts ({incCount})
                    </DivideSectionLabel>
                    {income!.map((item) => {
                        const name = item.label ?? "Income";
                        return (
                            <DraftIncomeRow
                                key={item.id}
                                name={name}
                                amount={item.amount}
                                currency={item.currency}
                                yearMonth={item.yearMonth}
                                pending={activating}
                                onActivate={() =>
                                    setIncomeDraft.mutate({ id: item.id, isDraft: false })
                                }
                                onDelete={() =>
                                    setPendingDelete({
                                        kind: "income",
                                        id: item.id,
                                        name,
                                    })
                                }
                            />
                        );
                    })}
                </DivideFrame>
            )}

            <ConfirmDialog
                open={!!pendingDelete}
                onOpenChange={(open) => !open && setPendingDelete(null)}
                title={
                    pendingDelete?.kind === "income"
                        ? "Delete income draft?"
                        : "Delete expense draft?"
                }
                description={
                    pendingDelete
                        ? `“${pendingDelete.name}” will be permanently removed.`
                        : undefined
                }
                confirmLabel="Delete"
                pending={deleteExpense.isPending || deleteIncome.isPending}
                onConfirm={async () => {
                    if (!pendingDelete) return;
                    if (pendingDelete.kind === "expense") {
                        await deleteExpense.mutateAsync(pendingDelete.id);
                    } else {
                        await deleteIncome.mutateAsync(pendingDelete.id);
                    }
                }}
            />
        </div>
    );
}

/** Mirrors mobile expense card layout on the budget page */
function DraftExpenseRow({
    name,
    amount,
    currency,
    yearMonth,
    category,
    pending,
    onActivate,
    onDelete,
}: {
    name: string;
    amount: number;
    currency: string;
    yearMonth: string;
    category: string;
    pending: boolean;
    onActivate: () => void;
    onDelete: () => void;
}) {
    return (
        <div className="bg-muted/40 px-4 py-3.5 opacity-80 transition-colors">
            <div className="flex items-start gap-3">
                {/* Same dashed draft checkbox as budget expense drafts */}
                <div className="pt-0.5 shrink-0">
                    <div
                        className="size-5 rounded border border-dashed border-muted-foreground/40"
                        title="Draft — activate to track"
                    />
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                            <span className="min-w-0 truncate text-sm font-medium block">
                                {name}
                            </span>
                        </div>
                        <span className="shrink-0 font-mono text-sm font-semibold tabular-nums leading-5">
                            {formatCurrency(amount, currency)}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-medium text-muted-foreground">Expense</span>
                        <span className="text-muted-foreground/50">·</span>
                        <span className="font-medium text-muted-foreground">Draft</span>
                        <span className="text-muted-foreground/50">·</span>
                        <span className="truncate text-muted-foreground">
                            {monthLabel(yearMonth)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                            <span
                                title={category}
                                className="block w-fit max-w-full truncate rounded-md border border-border bg-muted/60 px-2 py-0.5 text-left text-xs font-medium text-muted-foreground"
                            >
                                {category}
                            </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                disabled={pending}
                                onClick={onActivate}
                                className={actionBtn}
                                title="Activate"
                                aria-label={`Activate ${name}`}
                            >
                                <HugeiconsIcon
                                    icon={InboxUploadIcon}
                                    strokeWidth={2}
                                    className="size-4"
                                />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={onDelete}
                                className={cn(
                                    actionBtn,
                                    "hover:bg-destructive/10 hover:text-destructive",
                                )}
                                title="Delete"
                                aria-label={`Delete ${name}`}
                            >
                                <HugeiconsIcon
                                    icon={Delete01Icon}
                                    strokeWidth={2}
                                    className="size-4"
                                />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DraftIncomeRow({
    name,
    amount,
    currency,
    yearMonth,
    pending,
    onActivate,
    onDelete,
}: {
    name: string;
    amount: number;
    currency: string;
    yearMonth: string;
    pending: boolean;
    onActivate: () => void;
    onDelete: () => void;
}) {
    return (
        <div className="bg-muted/40 px-4 py-3.5 opacity-80 transition-colors">
            <div className="flex items-start gap-3">
                <div className="pt-0.5 shrink-0">
                    <div
                        className="size-5 rounded border border-dashed border-muted-foreground/40"
                        title="Draft — activate to track"
                    />
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                            <span className="block min-w-0 truncate text-sm font-medium">
                                {name}
                            </span>
                        </div>
                        <span className="shrink-0 font-mono text-sm font-semibold tabular-nums leading-5 text-success">
                            {formatCurrency(amount, currency)}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-medium text-success">Income</span>
                        <span className="text-muted-foreground/50">·</span>
                        <span className="font-medium text-muted-foreground">Draft</span>
                        <span className="text-muted-foreground/50">·</span>
                        <span className="truncate text-muted-foreground">
                            {monthLabel(yearMonth)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1" />
                        <div className="flex shrink-0 items-center gap-0.5">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                disabled={pending}
                                onClick={onActivate}
                                className={actionBtn}
                                title="Activate"
                                aria-label={`Activate ${name}`}
                            >
                                <HugeiconsIcon
                                    icon={InboxUploadIcon}
                                    strokeWidth={2}
                                    className="size-4"
                                />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={onDelete}
                                className={cn(
                                    actionBtn,
                                    "hover:bg-destructive/10 hover:text-destructive",
                                )}
                                title="Delete"
                                aria-label={`Delete ${name}`}
                            >
                                <HugeiconsIcon
                                    icon={Delete01Icon}
                                    strokeWidth={2}
                                    className="size-4"
                                />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
