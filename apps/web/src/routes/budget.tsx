import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import type { BudgetMonthStatus } from "@expense/shared";
import { orpc } from "../lib/clients/orpc";
import {
    useBudgetItems,
    useIncomeTarget,
    useTogglePaid,
    useAddBudgetItem,
    useUpdateBudgetItem,
    useDeleteBudgetItem,
    useCategories,
    useSetIncomeTarget,
    useUpdateIncomeTarget,
    useAddIncomeEntry,
    useDeleteIncomeEntry,
    useMonthStatus,
    useStartPlan,
    useCompleteMonth,
    useMonthAnalysis,
    useRateForMonth,
    useUpsertRate,
    type BudgetItem,
} from "../lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Dialog,
    DialogFooter,
    DialogPanelBody,
    DialogPanelContent,
    DialogPanelHeader,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
    DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { MonthPicker } from "@/components/month-picker";
import { PanelCard, PanelCardContent, PanelCardHeader } from "@/components/panel-card";
import { CategoryDrilldownDialog } from "@/components/category-drilldown-dialog";
import { currMonth, formatCurrency, formatNGN, monthLabel, prevMonth, computeRecurringEndOptions, cn } from "../lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    AddCircleIcon,
    Coins02Icon,
    MoneyAdd01Icon,
    Delete01Icon,
    RepeatIcon,
    ArrowDown01Icon,
    MoreHorizontalIcon,
    CheckmarkCircle02Icon,
    Edit02Icon,
} from "@hugeicons/core-free-icons";

type TypeFilter = "all" | "income" | "expense";

type UnifiedRow =
    | {
        kind: "expense";
        id: string;
        name: string;
        categoryId: string | null;
        category: string;
        amount: number;
        currency: string;
        paid: boolean;
        isRecurring: boolean;
        defaulted?: boolean;
    }
    | {
        kind: "income-target";
        id: string;
        name: string;
        source: string;
        amount: number;
        currency: string;
        received: number;
        isReceived: boolean;
        isRecurring: boolean;
    }
    | {
        kind: "income-entry";
        id: string;
        name: string;
        source: string;
        amount: number;
        currency: string;
    };

function formatAmount(amount: number, currency: string) {
    return formatCurrency(amount, currency);
}

function buildUnifiedRows(
    items: {
        id: string;
        name: string;
        amount: number;
        currency: string;
        paid: boolean;
        isRecurring: boolean;
        categoryId?: string | null;
        category?: { name: string } | null;
    }[] | undefined,
    income: {
        id: string;
        amount: number;
        currency: string;
        label?: string | null;
        isRecurring?: boolean | null;
        totalReceived: number;
        entries: { id: string; amount: number; currency: string }[];
    } | null | undefined,
    isCompleted: boolean,
): UnifiedRow[] {
    const rows: UnifiedRow[] = [];

    if (income) {
        const source = income.label ?? "Income";
        rows.push({
            kind: "income-target",
            id: income.id,
            name: source,
            source,
            amount: income.amount,
            currency: income.currency,
            received: income.totalReceived,
            isReceived: income.totalReceived >= income.amount,
            isRecurring: income.isRecurring ?? false,
        });
    }

    const unpaid = items?.filter((i) => !i.paid) ?? [];
    const paid = items?.filter((i) => i.paid) ?? [];

    for (const item of [...unpaid, ...paid]) {
        rows.push({
            kind: "expense",
            id: item.id,
            name: item.name,
            categoryId: item.categoryId ?? null,
            category: item.category?.name ?? "Uncategorized",
            amount: item.amount,
            currency: item.currency,
            paid: item.paid,
            isRecurring: item.isRecurring,
            defaulted: isCompleted && !item.paid,
        });
    }

    return rows;
}

function filterRows(rows: UnifiedRow[], typeFilter: TypeFilter): UnifiedRow[] {
    if (typeFilter === "all") return rows;
    if (typeFilter === "income") return rows.filter((r) => r.kind !== "expense");
    return rows.filter((r) => r.kind === "expense");
}

export interface BudgetSearch {
    ym?: string;
}

export const Route = createFileRoute("/budget")({
    validateSearch: (search: Record<string, string>): BudgetSearch => ({
        ym: search.ym ?? currMonth(),
    }),
    component: BudgetPage,
});

const FREQUENCY_OPTIONS = [
    { value: 1, label: "Every month" },
    { value: 2, label: "Every 2 months" },
    { value: 3, label: "Quarterly" },
    { value: 6, label: "Every 6 months" },
    { value: 12, label: "Yearly" },
];

const STATUS_LABELS: Record<BudgetMonthStatus, string> = {
    uninitialized: "Not started",
    planning: "Planning",
    completed: "Completed",
};

const TYPE_FILTER_LABELS: Record<TypeFilter, string> = {
    all: "All",
    income: "Income",
    expense: "Expense",
};

function TypeFilterBar({
    value,
    onChange,
    className,
}: {
    value: TypeFilter;
    onChange: (value: TypeFilter) => void;
    className?: string;
}) {
    return (
        <div className={cn("flex rounded-xl border border-border bg-muted/30 p-1", className)}>
            {(Object.keys(TYPE_FILTER_LABELS) as TypeFilter[]).map((filter) => (
                <button
                    key={filter}
                    type="button"
                    onClick={() => onChange(filter)}
                    className={cn(
                        "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                        value === filter
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                    )}
                >
                    {TYPE_FILTER_LABELS[filter]}
                </button>
            ))}
        </div>
    );
}

function BudgetPage() {
    const { ym } = useSearch({ from: "/budget" });
    const navigate = useNavigate({ from: "/budget" });
    const yearMonth = ym ?? currMonth();

    const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
    const [showAdd, setShowAdd] = useState(false);
    const [showIncome, setShowIncome] = useState(false);
    const [showRates, setShowRates] = useState(false);
    const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
    const [showCarryOver, setShowCarryOver] = useState(false);
    const [carryOverCandidates, setCarryOverCandidates] = useState<
        { id: string; name: string; amount: number; currency: string; category?: { name: string } | null }[]
    >([]);
    const [carryOverSelected, setCarryOverSelected] = useState<Set<string>>(new Set());
    const [editExpense, setEditExpense] = useState<{
        id: string;
        name: string;
        amount: number;
        currency: string;
        categoryId: string | null;
        isRecurring: boolean;
        frequencyMonths: number;
        endsAtYearMonth: string | null;
    } | null>(null);
    const [categoryDrilldown, setCategoryDrilldown] = useState<{
        categoryId: string | null;
        categoryName: string;
    } | null>(null);

    const { data: monthStatus } = useMonthStatus(yearMonth);
    const status = monthStatus?.status ?? "uninitialized";
    const isMonthStarted = status !== "uninitialized";
    const isPlanning = status === "planning";
    const isCompleted = status === "completed";
    const isReadOnly = !isPlanning;

    const { data: items, isLoading } = useBudgetItems(yearMonth, isMonthStarted);
    const { data: income } = useIncomeTarget(yearMonth, isMonthStarted);
    const { data: categories } = useCategories();
    const { data: analysis } = useMonthAnalysis(yearMonth, isCompleted);
    const { data: rate } = useRateForMonth(yearMonth, isPlanning);

    const startPlan = useStartPlan();
    const completeMonth = useCompleteMonth();
    const queryClient = useQueryClient();
    const togglePaid = useTogglePaid();
    const deleteItem = useDeleteBudgetItem();
    const deleteIncomeEntry = useDeleteIncomeEntry();
    const addIncomeEntry = useAddIncomeEntry();
    const upsertRate = useUpsertRate();

    const allRows = useMemo(
        () => buildUnifiedRows(items, income, isCompleted),
        [items, income, isCompleted],
    );
    const visibleRows = useMemo(
        () => filterRows(allRows, typeFilter),
        [allRows, typeFilter],
    );

    const handleStartPlan = async () => {
        const prevYm = prevMonth(yearMonth);
        try {
            const prevItems = await queryClient.fetchQuery<BudgetItem[]>({
                queryKey: ["budget", "items", prevYm],
                queryFn: () => orpc.budget.getBudgetItems({ yearMonth: prevYm }),
            });
            const oneOffs = prevItems.filter((item) => !item.isRecurring);
            if (oneOffs.length > 0) {
                setCarryOverCandidates(oneOffs);
                setCarryOverSelected(new Set(oneOffs.map((item) => item.id)));
                setShowCarryOver(true);
                return;
            }
        } catch {
            // Previous month may not exist — proceed without carry-over
        }
        startPlan.mutate({ yearMonth });
    };

    const handleConfirmCarryOver = (carry: boolean) => {
        const ids = carry ? [...carryOverSelected] : undefined;
        startPlan.mutate(
            { yearMonth, carryOverItemIds: ids },
            { onSuccess: () => setShowCarryOver(false) },
        );
    };

    const toggleCarryOverItem = (id: string) => {
        setCarryOverSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleConfirmComplete = () => {
        completeMonth.mutate(yearMonth, {
            onSuccess: () => {
                setShowCompleteConfirm(false);
            },
        });
    };

    const handleAddExpense = () => setShowAdd(true);
    const handleAddIncome = () => setShowIncome(true);

    const handleToggleIncome = (incomeId: string, isReceived: boolean, amount: number, currency: "NGN" | "USD", received: number) => {
        if (isReceived) {
            const remaining = amount - received;
            if (remaining > 0) {
                addIncomeEntry.mutate({
                    incomeTargetId: incomeId,
                    yearMonth,
                    amount: remaining,
                    currency,
                });
            }
        } else {
            if (income?.entries) {
                for (const entry of income.entries) {
                    deleteIncomeEntry.mutate(entry.id);
                }
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-2.5 min-w-0 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                        <MonthPicker
                            value={yearMonth}
                            onChange={(m) => navigate({ search: { ym: m } })}
                        />
                        {status !== "uninitialized" && (
                            <Select
                                value={typeFilter}
                                onValueChange={(v) => setTypeFilter(v as TypeFilter)}
                            >
                                <SelectTrigger className="hidden sm:flex w-fit rounded-lg border-transparent bg-transparent shadow-none hover:bg-muted/50">
                                    <SelectValue>{TYPE_FILTER_LABELS[typeFilter]}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {(Object.keys(TYPE_FILTER_LABELS) as TypeFilter[]).map((filter) => (
                                        <SelectItem key={filter} value={filter}>
                                            {TYPE_FILTER_LABELS[filter]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                    {status !== "uninitialized" && (
                        <TypeFilterBar
                            value={typeFilter}
                            onChange={setTypeFilter}
                            className="sm:hidden"
                        />
                    )}
                    <p className="text-xs text-muted-foreground">
                        <span
                            className={
                                status === "completed"
                                    ? "text-success"
                                    : status === "planning"
                                        ? "text-primary"
                                        : ""
                            }
                        >
                            {STATUS_LABELS[status]}
                        </span>
                        {" · "}
                        {monthLabel(yearMonth)}
                    </p>
                </div>
                <div className="flex gap-2 items-stretch w-full sm:w-auto sm:shrink-0">
                    {status === "uninitialized" && (
                        <Button size="sm" onClick={handleStartPlan} disabled={startPlan.isPending} className="flex-1 sm:flex-none">
                            Start plan
                        </Button>
                    )}
                    {isPlanning && (
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button size="sm" variant="outline" className="flex-1 sm:flex-none">
                                        <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} className="size-4" />
                                        Actions
                                    </Button>
                                }
                            />
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Month actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setShowRates(true)}>
                                        <HugeiconsIcon icon={Coins02Icon} strokeWidth={2} className="size-4" />
                                        {rate ? "Update rates" : "Set rates"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setShowCompleteConfirm(true)}>
                                        <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
                                        Mark complete
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    {!isReadOnly && (
                        typeFilter === "expense" ? (
                            <Button size="sm" onClick={handleAddExpense} className="flex-1 sm:flex-none">
                                <HugeiconsIcon icon={AddCircleIcon} strokeWidth={2} className="size-4" />
                                Add expense
                            </Button>
                        ) : typeFilter === "income" ? (
                            <Button size="sm" onClick={handleAddIncome} className="flex-1 sm:flex-none">
                                <HugeiconsIcon icon={MoneyAdd01Icon} strokeWidth={2} className="size-4" />
                                {income ? "Edit income" : "Set income"}
                            </Button>
                        ) : (
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button size="sm" className="flex-1 sm:flex-none">
                                            <HugeiconsIcon icon={AddCircleIcon} strokeWidth={2} className="size-4" />
                                            Add
                                            <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className="size-3.5 opacity-60" />
                                        </Button>
                                    }
                                />
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={handleAddExpense}>
                                        <HugeiconsIcon icon={Coins02Icon} strokeWidth={2} className="size-4" />
                                        Add expense
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleAddIncome}>
                                        <HugeiconsIcon icon={MoneyAdd01Icon} strokeWidth={2} className="size-4" />
                                        {income ? "Edit income" : "Set income"}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )
                    )}
                </div>
            </div>

            {status === "uninitialized" && (
                <div className="flex flex-col items-center py-6 text-center rounded-xl border border-dashed border-border bg-card/50">
                    <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                        <HugeiconsIcon icon={MoneyAdd01Icon} strokeWidth={2} className="size-6 text-primary" />
                    </div>
                    <p className="text-sm font-medium mb-1">No plan started for {yearMonth}</p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                        Start a plan to seed recurring items and exchange rates for this month. You can edit expenses and income after starting.
                    </p>
                </div>
            )}

            {isCompleted && analysis && (
                <CompletedMonthAnalytics analysis={analysis} />
            )}

            {status !== "uninitialized" && (
                <>
                    {isLoading && (
                        <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-14 rounded-xl bg-card border border-border animate-pulse" />
                            ))}
                        </div>
                    )}

                    {!isLoading && (
                        <>
                            {typeFilter !== "expense" && (income || (items && items.length > 0)) && (
                                <BudgetSummary
                                    income={income}
                                    items={items}
                                />
                            )}

                            <div className="border-t border-border pt-6 mt-6">
                                {visibleRows.length > 0 && (
                                    <>
                                        <div className="space-y-2 sm:hidden">
                                            {visibleRows.map((row) => (
                                                <UnifiedBudgetCard
                                                    key={`${row.kind}-${row.id}`}
                                                    row={row}
                                                    readOnly={isReadOnly}
                                                    onTogglePaid={() => togglePaid.mutate(row.id)}
                                                    onToggleIncome={() => {
                                                        if (row.kind === "income-target") {
                                                            handleToggleIncome(
                                                                row.id,
                                                                !row.isReceived,
                                                                row.amount,
                                                                row.currency as "NGN" | "USD",
                                                                row.received,
                                                            );
                                                        }
                                                    }}
                                                    onDeleteExpense={() => deleteItem.mutate(row.id)}
                                                    onDeleteIncomeEntry={() => deleteIncomeEntry.mutate(row.id)}
                                                    onEditIncome={() => setShowIncome(true)}
                                                    onCategoryClick={(cat) => setCategoryDrilldown(cat)}
                                                    onEditExpense={() => {
                                                        const item = items?.find((i) => i.id === row.id);
                                                        if (item && row.kind === "expense") {
                                                            setEditExpense({
                                                                id: item.id,
                                                                name: item.name,
                                                                amount: item.amount,
                                                                currency: item.currency,
                                                                categoryId: item.categoryId ?? null,
                                                                isRecurring: item.isRecurring,
                                                                frequencyMonths: item.frequencyMonths,
                                                                endsAtYearMonth: item.endsAtYearMonth ?? null,
                                                            });
                                                        }
                                                    }}
                                                />
                                            ))}
                                        </div>

                                        <div className="hidden sm:block">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="hover:bg-transparent">
                                                        <TableHead className="w-10" />
                                                        <TableHead>Name</TableHead>
                                                        <TableHead>Type</TableHead>
                                                        <TableHead>Category</TableHead>
                                                        <TableHead className="text-right">Amount</TableHead>
                                                        <TableHead className="text-right">Status</TableHead>
                                                        <TableHead className="w-10" />
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {visibleRows.map((row) => (
                                                        <UnifiedBudgetRow
                                                            key={`${row.kind}-${row.id}`}
                                                            row={row}
                                                            readOnly={isReadOnly}
                                                            onTogglePaid={() => togglePaid.mutate(row.id)}
                                                            onToggleIncome={() => {
                                                                if (row.kind === "income-target") {
                                                                    handleToggleIncome(
                                                                        row.id,
                                                                        !row.isReceived,
                                                                        row.amount,
                                                                        row.currency as "NGN" | "USD",
                                                                        row.received,
                                                                    );
                                                                }
                                                            }}
                                                            onDeleteExpense={() => deleteItem.mutate(row.id)}
                                                            onDeleteIncomeEntry={() => deleteIncomeEntry.mutate(row.id)}
                                                            onEditIncome={() => setShowIncome(true)}
                                                            onCategoryClick={(cat) => setCategoryDrilldown(cat)}
                                                            onEditExpense={() => {
                                                                const item = items?.find((i) => i.id === row.id);
                                                                if (item && row.kind === "expense") {
                                                                    setEditExpense({
                                                                        id: item.id,
                                                                        name: item.name,
                                                                        amount: item.amount,
                                                                        currency: item.currency,
                                                                        categoryId: item.categoryId ?? null,
                                                                        isRecurring: item.isRecurring,
                                                                        frequencyMonths: item.frequencyMonths,
                                                                        endsAtYearMonth: item.endsAtYearMonth ?? null,
                                                                    });
                                                                }
                                                            }}
                                                        />
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </>
                                )}

                                {visibleRows.length === 0 && isPlanning && (
                                    <div className="flex flex-col items-center py-6 text-center">
                                        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                                            <HugeiconsIcon
                                                icon={typeFilter === "income" ? MoneyAdd01Icon : Coins02Icon}
                                                strokeWidth={2}
                                                className="size-6 text-primary"
                                            />
                                        </div>
                                        <p className="text-sm font-medium mb-1">
                                            {typeFilter === "income"
                                                ? "No income yet"
                                                : typeFilter === "expense"
                                                    ? "No expenses yet"
                                                    : "No items yet"}
                                        </p>
                                        <p className="text-xs text-muted-foreground mb-4">
                                            {typeFilter === "income"
                                                ? "Set an income target or add a payment."
                                                : "Add expenses and income to plan this month."}
                                        </p>
                                        {!isReadOnly && (
                                            <div className="flex gap-2">
                                                {typeFilter !== "income" && (
                                                    <Button size="sm" onClick={handleAddExpense}>
                                                        <HugeiconsIcon icon={AddCircleIcon} strokeWidth={2} className="size-4" />
                                                        Add expense
                                                    </Button>
                                                )}
                                                {typeFilter !== "expense" && (
                                                    <Button size="sm" variant="outline" onClick={handleAddIncome}>
                                                        <HugeiconsIcon icon={MoneyAdd01Icon} strokeWidth={2} className="size-4" />
                                                        {income ? "Edit income" : "Set income"}
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                        </>
                    )}
                </>
            )}

            <Dialog open={showCarryOver} onOpenChange={setShowCarryOver}>
                <DialogPanelContent className="max-w-md">
                    <DialogPanelHeader
                        title={`Carry over one-off expenses from ${monthLabel(prevMonth(yearMonth))}?`}
                        description="Select which one-off expenses to copy into this month's plan. Recurring items are added automatically."
                    />
                    <DialogPanelBody className="space-y-2 max-h-64 overflow-y-auto">
                        {carryOverCandidates.map((item) => (
                            <label
                                key={item.id}
                                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 cursor-pointer hover:bg-muted/40"
                            >
                                <Checkbox
                                    checked={carryOverSelected.has(item.id)}
                                    onCheckedChange={() => toggleCarryOverItem(item.id)}
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {item.category?.name ?? "Uncategorized"}
                                    </p>
                                </div>
                                <span className="text-sm tabular-nums shrink-0">
                                    {formatAmount(item.amount, item.currency)}
                                </span>
                            </label>
                        ))}
                    </DialogPanelBody>
                    <div className="border-t border-border px-6 py-4 flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => handleConfirmCarryOver(false)}
                            disabled={startPlan.isPending}
                        >
                            No, skip
                        </Button>
                        <Button
                            onClick={() => handleConfirmCarryOver(true)}
                            disabled={startPlan.isPending}
                        >
                            Yes, carry over
                        </Button>
                    </div>
                </DialogPanelContent>
            </Dialog>

            <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogPanelContent>
                    <DialogPanelHeader title="Add Expense" />
                    <DialogPanelBody>
                        <AddItemForm
                            yearMonth={yearMonth}
                            categories={categories ?? []}
                            onDone={() => setShowAdd(false)}
                        />
                    </DialogPanelBody>
                </DialogPanelContent>
            </Dialog>

            <Dialog open={!!editExpense} onOpenChange={(open) => !open && setEditExpense(null)}>
                <DialogPanelContent>
                    <DialogPanelHeader title="Edit Expense" />
                    <DialogPanelBody>
                        {editExpense && (
                            <EditItemForm
                                yearMonth={yearMonth}
                                item={editExpense}
                                categories={categories ?? []}
                                onDone={() => setEditExpense(null)}
                            />
                        )}
                    </DialogPanelBody>
                </DialogPanelContent>
            </Dialog>

            <Dialog open={showIncome} onOpenChange={setShowIncome}>
                <DialogPanelContent>
                    <DialogPanelHeader title={income ? "Edit Income" : "Set Income Target"} />
                    <DialogPanelBody>
                        <IncomeForm
                            yearMonth={yearMonth}
                            income={income}
                            onDone={() => setShowIncome(false)}
                        />
                    </DialogPanelBody>
                </DialogPanelContent>
            </Dialog>

            <Dialog open={showCompleteConfirm} onOpenChange={setShowCompleteConfirm}>
                <DialogPanelContent>
                    <DialogPanelHeader
                        title="Mark month complete?"
                        description="You won't be able to edit items after completing this month. Unpaid expenses will be marked as defaulted."
                    />
                    <DialogPanelBody>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowCompleteConfirm(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleConfirmComplete} disabled={completeMonth.isPending}>
                                Mark complete
                            </Button>
                        </div>
                    </DialogPanelBody>
                </DialogPanelContent>
            </Dialog>

            <Dialog open={showRates} onOpenChange={setShowRates}>
                <DialogPanelContent>
                    <DialogPanelHeader title={rate ? "Update USD Rates" : "Set USD Rates"} />
                    <DialogPanelBody>
                        <RateEditor
                            yearMonth={yearMonth}
                            rate={rate}
                            isPending={upsertRate.isPending}
                            onDone={() => setShowRates(false)}
                            onSave={async (usdBuyRate, usdSellRate) => {
                                await upsertRate.mutateAsync({ yearMonth, usdBuyRate, usdSellRate });
                            }}
                        />
                    </DialogPanelBody>
                </DialogPanelContent>
            </Dialog>

            {categoryDrilldown && (
                <CategoryDrilldownDialog
                    open
                    onOpenChange={(open) => !open && setCategoryDrilldown(null)}
                    categoryId={categoryDrilldown.categoryId}
                    categoryName={categoryDrilldown.categoryName}
                    period={{ type: "range", startYearMonth: yearMonth, endYearMonth: yearMonth }}
                />
            )}
        </div>
    );
}

function BudgetSummary({
    income,
    items,
}: {
    income: {
        amount: number;
        currency: string;
        totalReceived: number;
    } | null | undefined;
    items: {
        amount: number;
        currency: string;
        paid: boolean;
    }[] | undefined;
}) {
    const totalExpenses = items?.reduce((sum, i) => sum + i.amount, 0) ?? 0;
    const paidExpenses = items?.filter((i) => i.paid).reduce((sum, i) => sum + i.amount, 0) ?? 0;
    const unpaidExpenses = totalExpenses - paidExpenses;
    const incomeAmount = income?.amount ?? 0;
    const incomeReceived = income?.totalReceived ?? 0;
    const currency = income?.currency ?? "NGN";
    const remaining = incomeReceived - totalExpenses;

    const hasData = incomeAmount > 0 || totalExpenses > 0;
    if (!hasData) return null;

    return (
        <PanelCard>
            <PanelCardContent className="space-y-5">
                <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <div className="size-2 rounded-full bg-success" />
                            <span className="text-xs font-medium text-muted-foreground">Income</span>
                        </div>
                        <p className="font-mono text-lg font-semibold text-success">
                            {formatAmount(incomeReceived, currency)}
                        </p>
                        {incomeAmount > 0 && (
                            <p className="text-xs text-muted-foreground">
                                of {formatAmount(incomeAmount, currency)} target
                            </p>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <div className="size-2 rounded-full bg-expense" />
                            <span className="text-xs font-medium text-muted-foreground">Expenses</span>
                        </div>
                        <p className="font-mono text-lg font-semibold text-expense">
                            {formatAmount(totalExpenses, currency)}
                        </p>
                        {unpaidExpenses > 0 && (
                            <p className="text-xs text-muted-foreground">
                                {formatAmount(unpaidExpenses, currency)} unpaid
                            </p>
                        )}
                    </div>
                </div>

                {incomeAmount > 0 && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Income received</span>
                            <span>{Math.min(100, Math.round((incomeReceived / incomeAmount) * 100))}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                                className="h-full rounded-full bg-success transition-all duration-500"
                                style={{ width: `${Math.min(100, (incomeReceived / incomeAmount) * 100)}%` }}
                            />
                        </div>
                    </div>
                )}

                {totalExpenses > 0 && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Expenses paid</span>
                            <span>{totalExpenses > 0 ? Math.round((paidExpenses / totalExpenses) * 100) : 0}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                                className="h-full rounded-full bg-expense transition-all duration-500"
                                style={{ width: `${totalExpenses > 0 ? (paidExpenses / totalExpenses) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                )}

                {incomeAmount > 0 && totalExpenses > 0 && (
                    <div className={`flex items-center justify-between rounded-lg px-4 py-3 ${remaining >= 0 ? "bg-success/10" : "bg-expense/10"}`}>
                        <span className="text-sm font-medium">Remaining</span>
                        <span className={`font-mono text-sm font-semibold ${remaining >= 0 ? "text-success" : "text-expense"}`}>
                            {remaining >= 0 ? "+" : ""}{formatAmount(remaining, currency)}
                        </span>
                    </div>
                )}
            </PanelCardContent>
        </PanelCard>
    );
}

function CompletedMonthAnalytics({
    analysis,
}: {
    analysis: {
        incomeReceivedNgn: number;
        paidExpensesNgn: number;
        unpaidExpensesNgn: number;
        unpaidCount: number;
        leftoverAfterBills: number;
        defaultedItems: { id: string; name: string; amountNgn: number; categoryName: string }[];
        defaultedByCategory: { name: string; totalNgn: number; count: number }[];
    };
}) {
    return (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-5 space-y-4">
            <div>
                <h3 className="text-sm font-semibold">Unpaid & defaulted expenses</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {analysis.unpaidCount} item{analysis.unpaidCount === 1 ? "" : "s"} totaling{" "}
                    <span className="font-medium text-warning tabular-nums">
                        {formatNGN(analysis.unpaidExpensesNgn)}
                    </span>
                </p>
            </div>

            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="rounded-lg bg-card border border-border p-3">
                    <p className="text-muted-foreground text-xs">Income received</p>
                    <p className="font-medium tabular-nums mt-0.5">{formatNGN(analysis.incomeReceivedNgn)}</p>
                </div>
                <div className="rounded-lg bg-card border border-border p-3">
                    <p className="text-muted-foreground text-xs">Paid expenses</p>
                    <p className="font-medium tabular-nums mt-0.5 text-success">
                        {formatNGN(analysis.paidExpensesNgn)}
                    </p>
                </div>
                <div className="rounded-lg bg-card border border-border p-3">
                    <p className="text-muted-foreground text-xs">Unpaid total</p>
                    <p className="font-medium tabular-nums mt-0.5 text-warning">
                        {formatNGN(analysis.unpaidExpensesNgn)}
                    </p>
                </div>
                <div className="rounded-lg bg-card border border-border p-3">
                    <p className="text-muted-foreground text-xs">Leftover</p>
                    <p className="font-medium tabular-nums mt-0.5">{formatNGN(analysis.leftoverAfterBills)}</p>
                </div>
            </div>

            {analysis.defaultedByCategory.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">By category</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {analysis.defaultedByCategory.map((cat) => (
                            <div
                                key={cat.name}
                                className="flex items-center justify-between rounded-lg bg-card border border-border px-3 py-2 text-sm"
                            >
                                <span>
                                    {cat.name}
                                    <span className="text-muted-foreground ml-1.5">({cat.count})</span>
                                </span>
                                <span className="tabular-nums text-warning font-medium">
                                    {formatNGN(cat.totalNgn)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {analysis.defaultedItems.length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">What wasn&apos;t paid</p>
                    {analysis.defaultedItems.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center justify-between py-2 px-3 text-sm rounded-lg bg-card border border-warning/20"
                        >
                            <div className="min-w-0">
                                <p className="font-medium truncate">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.categoryName}</p>
                            </div>
                            <span className="tabular-nums text-warning font-medium shrink-0 ml-3">
                                {formatNGN(item.amountNgn)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function RateEditor({
    yearMonth,
    rate,
    onSave,
    onDone,
    isPending,
}: {
    yearMonth: string;
    rate: { usdBuyRate: number; usdSellRate: number } | null | undefined;
    onSave: (buy: number, sell: number) => Promise<void>;
    onDone: () => void;
    isPending: boolean;
}) {
    const [buy, setBuy] = useState(rate ? String(rate.usdBuyRate) : "");
    const [sell, setSell] = useState(rate ? String(rate.usdSellRate) : "");

    useEffect(() => {
        if (rate) {
            setBuy(String(rate.usdBuyRate));
            setSell(String(rate.usdSellRate));
        }
    }, [rate?.usdBuyRate, rate?.usdSellRate]);

    const handleSave = async () => {
        if (!buy || !sell) return;
        await onSave(Number(buy), Number(sell));
        onDone();
    };

    return (
        <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Rates for {yearMonth}</p>
            <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Buy rate</label>
                <Input type="number" value={buy} onChange={(e) => setBuy(e.target.value)} placeholder="Buy" step="0.01" />
            </div>
            <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Sell rate</label>
                <Input type="number" value={sell} onChange={(e) => setSell(e.target.value)} placeholder="Sell" step="0.01" />
            </div>
            <div className="flex gap-2 justify-end pt-1">
                <Button variant="outline" onClick={onDone}>Cancel</Button>
                <Button disabled={isPending || !buy || !sell} onClick={handleSave}>
                    Save rates
                </Button>
            </div>
        </div>
    );
}

function CategoryBadge({
    categoryName,
    onClick,
    className,
}: {
    categoryName: string;
    onClick: () => void;
    className?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex max-w-full items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-medium text-muted-foreground truncate transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary cursor-pointer ${className ?? ""}`}
        >
            {categoryName}
        </button>
    );
}

function getUnifiedRowMeta(row: UnifiedRow) {
    const isExpense = row.kind === "expense";
    const isIncome = row.kind !== "expense";
    const paid = isExpense && row.paid;
    const defaulted = isExpense && row.defaulted && !row.paid;

    const typeLabel = isExpense ? "Expense" : "Income";
    const categoryOrSource = isExpense ? row.category : row.source;

    let statusLabel: string;
    let statusClass: string;
    if (row.kind === "expense") {
        if (row.defaulted && !row.paid) {
            statusLabel = "Defaulted";
            statusClass = "text-[var(--color-warning)]";
        } else if (row.paid) {
            statusLabel = "Paid";
            statusClass = "text-[var(--color-success)]";
        } else {
            statusLabel = "Unpaid";
            statusClass = "text-muted-foreground";
        }
    } else if (row.kind === "income-target") {
        statusLabel = row.isReceived ? "Received" : "Not received";
        statusClass = row.isReceived ? "text-[var(--color-success)]" : "text-muted-foreground";
    } else {
        statusLabel = "Received";
        statusClass = "text-[var(--color-success)]";
    }

    const isFullyReceived = isIncome && row.kind === "income-target" && row.isReceived;
    const isRecurring =
        (isExpense && row.isRecurring) || (row.kind === "income-target" && row.isRecurring);

    const rowBg = defaulted
        ? "bg-[var(--color-warning)]/5"
        : isFullyReceived
            ? "bg-[var(--color-success)]/5"
            : "";

    return {
        isExpense,
        isIncome,
        paid,
        defaulted,
        typeLabel,
        categoryOrSource,
        statusLabel,
        statusClass,
        isFullyReceived,
        isRecurring,
        rowBg,
    };
}

type UnifiedBudgetRowProps = {
    row: UnifiedRow;
    readOnly: boolean;
    onTogglePaid: () => void;
    onToggleIncome: () => void;
    onDeleteExpense: () => void;
    onDeleteIncomeEntry: () => void;
    onEditIncome: () => void;
    onEditExpense: () => void;
    onCategoryClick: (cat: { categoryId: string | null; categoryName: string }) => void;
};

function BudgetRowCheckbox({
    row,
    readOnly,
    onTogglePaid,
    onToggleIncome,
}: Pick<UnifiedBudgetRowProps, "row" | "readOnly" | "onTogglePaid" | "onToggleIncome">) {
    const { isExpense, isIncome } = getUnifiedRowMeta(row);

    if (isExpense) {
        return !readOnly ? (
            <Checkbox
                checked={row.kind === "expense" && row.paid}
                onCheckedChange={onTogglePaid}
                className="size-5"
            />
        ) : (
            <div className={`size-3 rounded-full ${row.kind === "expense" && row.paid ? "bg-success" : "bg-muted-foreground/30"}`} />
        );
    }

    if (isIncome && row.kind === "income-target") {
        return !readOnly ? (
            <Checkbox
                checked={row.isReceived}
                onCheckedChange={onToggleIncome}
                className="size-5 data-checked:bg-success data-checked:border-success"
            />
        ) : (
            <div className={`size-3 rounded-full ${row.isReceived ? "bg-success" : "bg-muted-foreground/30"}`} />
        );
    }

    return <div className="size-5" />;
}

function BudgetRowActions({
    row,
    readOnly,
    onDeleteExpense,
    onDeleteIncomeEntry,
    onEditIncome,
    onEditExpense,
    mobile = false,
}: Pick<
    UnifiedBudgetRowProps,
    "row" | "readOnly" | "onDeleteExpense" | "onDeleteIncomeEntry" | "onEditIncome" | "onEditExpense"
> & { mobile?: boolean }) {
    if (readOnly) return null;

    const actionBtn = mobile
        ? "size-8 rounded-lg flex items-center justify-center text-muted-foreground transition-colors"
        : "size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100";

    return (
        <>
            {row.kind === "expense" && (
                <>
                    <button
                        onClick={onEditExpense}
                        className={`${actionBtn} hover:text-foreground hover:bg-muted`}
                    >
                        <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} className="size-4" />
                    </button>
                    <button
                        onClick={onDeleteExpense}
                        className={`${actionBtn} hover:text-destructive hover:bg-destructive/10`}
                    >
                        <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} className="size-4" />
                    </button>
                </>
            )}
            {row.kind === "income-entry" && (
                <button
                    onClick={onDeleteIncomeEntry}
                    className={`${actionBtn} hover:text-destructive hover:bg-destructive/10`}
                >
                    <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} className="size-4" />
                </button>
            )}
            {row.kind === "income-target" && (
                <button
                    onClick={onEditIncome}
                    className={`${actionBtn} hover:text-foreground hover:bg-muted text-xs font-medium px-2 w-auto`}
                >
                    Edit
                </button>
            )}
        </>
    );
}

function UnifiedBudgetCard({
    row,
    readOnly,
    onTogglePaid,
    onToggleIncome,
    onDeleteExpense,
    onDeleteIncomeEntry,
    onEditIncome,
    onEditExpense,
    onCategoryClick,
}: UnifiedBudgetRowProps) {
    const meta = getUnifiedRowMeta(row);

    return (
        <div
            className={`rounded-xl border border-border bg-card p-4 transition-colors ${meta.rowBg} ${meta.paid ? "opacity-75" : ""}`}
        >
            <div className="flex items-start gap-3">
                <div className="pt-0.5 shrink-0">
                    <BudgetRowCheckbox
                        row={row}
                        readOnly={readOnly}
                        onTogglePaid={onTogglePaid}
                        onToggleIncome={onToggleIncome}
                    />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <span className={`font-medium truncate ${meta.paid ? "line-through" : ""}`}>
                                    {row.name}
                                </span>
                                {meta.isRecurring && (
                                    <HugeiconsIcon icon={RepeatIcon} strokeWidth={2} className="size-3.5 text-primary shrink-0" />
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className={`text-xs font-medium ${meta.isIncome ? "text-success" : "text-muted-foreground"}`}>
                                    {meta.typeLabel}
                                </span>
                                <span className="text-xs text-muted-foreground">·</span>
                                {meta.isExpense && row.kind === "expense" ? (
                                    <CategoryBadge
                                        categoryName={row.category}
                                        onClick={() => onCategoryClick({ categoryId: row.categoryId, categoryName: row.category })}
                                    />
                                ) : (
                                    <span className="text-xs text-muted-foreground truncate">{meta.categoryOrSource}</span>
                                )}
                            </div>
                        </div>

                        <span className={`font-mono text-sm font-semibold shrink-0 tabular-nums ${meta.isIncome ? "text-success" : ""}`}>
                            {formatAmount(row.amount, row.currency)}
                        </span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
                        <span className={`text-xs font-medium ${meta.statusClass}`}>{meta.statusLabel}</span>
                        <div className="flex items-center gap-0.5">
                            <BudgetRowActions
                                row={row}
                                readOnly={readOnly}
                                onDeleteExpense={onDeleteExpense}
                                onDeleteIncomeEntry={onDeleteIncomeEntry}
                                onEditIncome={onEditIncome}
                                onEditExpense={onEditExpense}
                                mobile
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function UnifiedBudgetRow({
    row,
    readOnly,
    onTogglePaid,
    onToggleIncome,
    onDeleteExpense,
    onDeleteIncomeEntry,
    onEditIncome,
    onEditExpense,
    onCategoryClick,
}: UnifiedBudgetRowProps) {
    const meta = getUnifiedRowMeta(row);

    return (
        <TableRow className={`group ${meta.paid ? "opacity-60" : ""} ${meta.rowBg}`}>
            <TableCell className="w-12">
                <div className="flex items-center">
                    <BudgetRowCheckbox
                        row={row}
                        readOnly={readOnly}
                        onTogglePaid={onTogglePaid}
                        onToggleIncome={onToggleIncome}
                    />
                </div>
            </TableCell>
            <TableCell>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={`font-medium truncate ${meta.paid ? "line-through" : ""}`}>{row.name}</span>
                        {meta.isRecurring && (
                            <HugeiconsIcon icon={RepeatIcon} strokeWidth={2} className="size-3.5 text-primary shrink-0" />
                        )}
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <span className={`text-sm font-medium ${meta.isIncome ? "text-success" : "text-muted-foreground"}`}>
                    {meta.typeLabel}
                </span>
            </TableCell>
            <TableCell>
                {meta.isExpense && row.kind === "expense" ? (
                    <CategoryBadge
                        categoryName={row.category}
                        onClick={() => onCategoryClick({ categoryId: row.categoryId, categoryName: row.category })}
                    />
                ) : (
                    <span className="text-sm text-muted-foreground truncate">{meta.categoryOrSource}</span>
                )}
            </TableCell>
            <TableCell className="text-right">
                <span className={`font-mono text-sm font-medium ${meta.isIncome ? "text-success" : ""}`}>
                    {formatAmount(row.amount, row.currency)}
                </span>
            </TableCell>
            <TableCell className="text-right">
                <span className={`text-sm font-medium ${meta.statusClass}`}>{meta.statusLabel}</span>
            </TableCell>
            <TableCell className="w-10">
                <div className="flex items-center justify-end gap-1">
                    <BudgetRowActions
                        row={row}
                        readOnly={readOnly}
                        onDeleteExpense={onDeleteExpense}
                        onDeleteIncomeEntry={onDeleteIncomeEntry}
                        onEditIncome={onEditIncome}
                        onEditExpense={onEditExpense}
                    />
                </div>
            </TableCell>
        </TableRow>
    );
}

function AddItemForm({
    yearMonth,
    categories,
    onDone,
}: {
    yearMonth: string;
    categories: { id: string; name: string }[];
    onDone: () => void;
}) {
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [currency, setCurrency] = useState<"NGN" | "USD">("NGN");
    const [categoryId, setCategoryId] = useState("none");
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequencyMonths, setFrequencyMonths] = useState("1");
    const [endsAtYearMonth, setEndsAtYearMonth] = useState<string>("none");
    const addItem = useAddBudgetItem();

    const endOptions = isRecurring
        ? computeRecurringEndOptions(yearMonth, Number(frequencyMonths))
        : [];

    const submit = async () => {
        if (!name.trim() || !amount) return;
        await addItem.mutateAsync({
            yearMonth,
            name: name.trim(),
            amount: Number(amount),
            currency,
            categoryId: categoryId === "none" ? undefined : categoryId,
            isRecurring: isRecurring || undefined,
            frequencyMonths: isRecurring ? Number(frequencyMonths) : undefined,
            endsAtYearMonth:
                isRecurring && endsAtYearMonth !== "none" ? endsAtYearMonth : null,
        });
        onDone();
    };

    return (
        <div className="space-y-3">
            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" />
            <div className="flex gap-2">
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" step="0.01" className="flex-1" />
                <Select value={currency} onValueChange={(v) => setCurrency(v as "NGN" | "USD")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="NGN">NGN</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "none")}>
                <SelectTrigger className="w-full"><SelectValue placeholder="No category" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <div className="flex items-center gap-3 py-2">
                <Checkbox id="recurring" checked={isRecurring} onCheckedChange={(v) => setIsRecurring(v === true)} />
                <label htmlFor="recurring" className="text-sm cursor-pointer select-none">Recurring</label>
            </div>
            {isRecurring && endOptions.length > 0 && (
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">End month (optional)</label>
                    <Select value={endsAtYearMonth} onValueChange={(v) => setEndsAtYearMonth(v ?? "none")}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="No end date" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No end date</SelectItem>
                            {endOptions.map((ym) => (
                                <SelectItem key={ym} value={ym}>{monthLabel(ym)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            {isRecurring && (
                <Select value={frequencyMonths} onValueChange={(v) => setFrequencyMonths(v ?? "1")}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {FREQUENCY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
            <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={onDone}>Cancel</Button>
                <Button onClick={submit} disabled={addItem.isPending}>Add</Button>
            </div>
        </div>
    );
}

function EditItemForm({
    yearMonth,
    item,
    categories,
    onDone,
}: {
    yearMonth: string;
    item: {
        id: string;
        name: string;
        amount: number;
        currency: string;
        categoryId: string | null;
        isRecurring: boolean;
        frequencyMonths: number;
        endsAtYearMonth: string | null;
    };
    categories: { id: string; name: string }[];
    onDone: () => void;
}) {
    const [name, setName] = useState(item.name);
    const [amount, setAmount] = useState(String(item.amount));
    const [currency, setCurrency] = useState<"NGN" | "USD">(item.currency as "NGN" | "USD");
    const [categoryId, setCategoryId] = useState(item.categoryId ?? "none");
    const [frequencyMonths, setFrequencyMonths] = useState(String(item.frequencyMonths));
    const [endsAtYearMonth, setEndsAtYearMonth] = useState(item.endsAtYearMonth ?? "none");
    const [updateBase, setUpdateBase] = useState(false);
    const updateItem = useUpdateBudgetItem();

    const endOptions = item.isRecurring
        ? computeRecurringEndOptions(yearMonth, Number(frequencyMonths))
        : [];

    const submit = async () => {
        if (!name.trim() || !amount) return;
        await updateItem.mutateAsync({
            id: item.id,
            name: name.trim(),
            amount: Number(amount),
            currency,
            categoryId: categoryId === "none" ? null : categoryId,
            frequencyMonths: item.isRecurring ? Number(frequencyMonths) : undefined,
            endsAtYearMonth:
                item.isRecurring && updateBase && endsAtYearMonth !== "none" ? endsAtYearMonth : null,
            updateBase: item.isRecurring && updateBase ? true : undefined,
        });
        onDone();
    };

    return (
        <div className="space-y-3">
            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" />
            <div className="flex gap-2">
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" step="0.01" className="flex-1" />
                <Select value={currency} onValueChange={(v) => setCurrency(v as "NGN" | "USD")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="NGN">NGN</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "none")}>
                <SelectTrigger className="w-full"><SelectValue placeholder="No category" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {item.isRecurring && (
                <>
                    <div className="flex items-center gap-3 py-1">
                        <Checkbox id="edit-update-base" checked={updateBase} onCheckedChange={(v) => setUpdateBase(v === true)} />
                        <label htmlFor="edit-update-base" className="text-sm cursor-pointer select-none">
                            Update recurring template (affects future months)
                        </label>
                    </div>
                    {updateBase && endOptions.length > 0 && (
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">End month (optional)</label>
                            <Select value={endsAtYearMonth} onValueChange={(v) => setEndsAtYearMonth(v ?? "none")}>
                                <SelectTrigger className="w-full"><SelectValue placeholder="No end date" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No end date</SelectItem>
                                    {endOptions.map((ym) => (
                                        <SelectItem key={ym} value={ym}>{monthLabel(ym)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <Select value={frequencyMonths} onValueChange={(v) => setFrequencyMonths(v ?? "1")}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {FREQUENCY_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </>
            )}
            <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={onDone}>Cancel</Button>
                <Button onClick={submit} disabled={updateItem.isPending}>Save</Button>
            </div>
        </div>
    );
}

function IncomeForm({
    yearMonth,
    income,
    onDone,
}: {
    yearMonth: string;
    income: {
        id: string;
        amount: number;
        currency: string;
        label?: string | null;
        isRecurring?: boolean | null;
        frequencyMonths?: number | null;
        endsAtYearMonth?: string | null;
        entries: { id: string; amount: number; currency: string }[];
    } | null | undefined;
    onDone: () => void;
}) {
    const [targetName, setTargetName] = useState(income?.label ?? "");
    const [targetAmount, setTargetAmount] = useState(income ? String(income.amount) : "");
    const [currency, setCurrency] = useState<"NGN" | "USD">((income?.currency as "NGN" | "USD") ?? "NGN");
    const [isRecurring, setIsRecurring] = useState(income?.isRecurring ?? false);
    const [frequencyMonths, setFrequencyMonths] = useState(String(income?.frequencyMonths ?? 1));
    const [endsAtYearMonth, setEndsAtYearMonth] = useState(income?.endsAtYearMonth ?? "none");
    const [updateBase, setUpdateBase] = useState(false);
    const setTarget = useSetIncomeTarget();
    const updateTarget = useUpdateIncomeTarget();

    const endOptions = isRecurring
        ? computeRecurringEndOptions(yearMonth, Number(frequencyMonths))
        : [];

    const handleSetTarget = async () => {
        if (!targetAmount || !targetName.trim()) return;
        const payload = {
            amount: Number(targetAmount),
            currency,
            label: targetName.trim(),
            isRecurring: isRecurring || undefined,
            frequencyMonths: isRecurring ? Number(frequencyMonths) : undefined,
            endsAtYearMonth:
                isRecurring && (!income?.isRecurring || updateBase) && endsAtYearMonth !== "none"
                    ? endsAtYearMonth
                    : null,
        };
        if (income) {
            await updateTarget.mutateAsync({
                id: income.id,
                ...payload,
                updateBase: updateBase || undefined,
            });
        } else {
            await setTarget.mutateAsync({ yearMonth, ...payload });
        }
        onDone();
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Source name</label>
                <Input type="text" value={targetName} onChange={(e) => setTargetName(e.target.value)} placeholder="e.g. Salary" maxLength={64} />
            </div>
            <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Target amount</label>
                <div className="flex gap-2">
                    <Input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="Target amount" className="flex-1" />
                    <Select value={currency} onValueChange={(v) => setCurrency(v as "NGN" | "USD")}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="NGN">NGN</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="flex items-center gap-3 py-1">
                <Checkbox id="income-recurring" checked={isRecurring} onCheckedChange={(v) => setIsRecurring(v === true)} />
                <label htmlFor="income-recurring" className="text-sm cursor-pointer select-none">Recurring</label>
            </div>
            {income?.isRecurring && (
                <div className="flex items-center gap-3 py-1">
                    <Checkbox id="income-update-base" checked={updateBase} onCheckedChange={(v) => setUpdateBase(v === true)} />
                    <label htmlFor="income-update-base" className="text-sm cursor-pointer select-none">
                        Update recurring template (affects future months)
                    </label>
                </div>
            )}
            {isRecurring && (!income?.isRecurring || updateBase) && endOptions.length > 0 && (
                <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">End month (optional)</label>
                    <Select value={endsAtYearMonth} onValueChange={(v) => setEndsAtYearMonth(v ?? "none")}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="No end date" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No end date</SelectItem>
                            {endOptions.map((ym) => (
                                <SelectItem key={ym} value={ym}>{monthLabel(ym)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            {isRecurring && (
                <Select value={frequencyMonths} onValueChange={(v) => setFrequencyMonths(v ?? "1")}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {FREQUENCY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
            <Button onClick={handleSetTarget} disabled={setTarget.isPending || updateTarget.isPending || !targetName.trim()} className="w-full">
                {income ? "Save changes" : "Set target"}
            </Button>
        </div>
    );
}
