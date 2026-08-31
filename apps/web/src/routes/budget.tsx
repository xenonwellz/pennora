import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { toNgn, computeBudgetMonthSummary, normalizeExpenseSummaryItem, type BudgetMonthStatus, type Currency } from "@expense/shared";
import { orpc } from "../lib/clients/orpc";
import {
    useBudgetItems,
    useIncomeTargets,
    useTogglePaid,
    useAdjustPaidAmount,
    useSetItemDraft,
    useSetIncomeDraft,
    useAddBudgetItem,
    useUpdateBudgetItem,
    useDeleteBudgetItem,
    useCategories,
    useSetIncomeTarget,
    useUpdateIncomeTarget,
    useDeleteIncomeTarget,
    useAddIncomeEntry,
    useDeleteIncomeEntry,
    useMonthStatus,
    useStartPlan,
    useCompleteMonth,
    useMonthAnalysis,
    useRateForMonth,
    useUpsertRate,
    type BudgetItem,
    type IncomeTargetSummary,
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
import { DivideFrame, DivideSectionLabel } from "@/components/divide-frame";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CategoryDrilldownDialog } from "@/components/category-drilldown-dialog";
import { ExpensePaidControl } from "@/components/expense-paid-control";
import { currMonth, formatCurrency, formatNGN, formatNGNFull, monthLabel, prevMonth, computeRecurringEndOptions, cn } from "../lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    AddCircleIcon,
    Coins02Icon,
    MoneyAdd01Icon,
    Delete01Icon,
    RepeatIcon,
    MoreHorizontalIcon,
    CheckmarkCircle02Icon,
    Edit02Icon,
    InboxDownloadIcon,
    Loading03Icon,
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
        amountPaid: number;
        isDraft: boolean;
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

function formatExpenseAmountDisplay(amount: number, currency: string, amountPaid: number) {
    const isPartial = amountPaid > 0 && amountPaid < amount;
    if (!isPartial) return formatAmount(amount, currency);
    return (
        <>
            <span className="text-expense">{formatAmount(amountPaid, currency)}</span>
            <span className="text-muted-foreground"> / {formatAmount(amount, currency)}</span>
        </>
    );
}

function amountToNgn(amount: number, currency: string, usdBuyRate: number): number {
    return toNgn(amount, currency as Currency, { usdBuyRate });
}

function buildUnifiedRows(
    items: {
        id: string;
        name: string;
        amount: number;
        currency: string;
        paid: boolean;
        amountPaid?: number;
        isDraft?: boolean;
        isRecurring: boolean;
        categoryId?: string | null;
        category?: { name: string } | null;
    }[] | undefined,
    incomes: IncomeTargetSummary[] | undefined,
    isCompleted: boolean,
): UnifiedRow[] {
    const rows: UnifiedRow[] = [];

    for (const income of incomes ?? []) {
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

    // Drafts live on /drafts — main budget list is active items only
    const active = items?.filter((i) => !i.isDraft) ?? [];
    const unpaid = active.filter((i) => (i.amountPaid ?? 0) < i.amount);
    const paid = active.filter((i) => (i.amountPaid ?? 0) >= i.amount);

    for (const item of [...unpaid, ...paid]) {
        const amountPaid = item.amountPaid ?? (item.paid ? item.amount : 0);
        rows.push({
            kind: "expense",
            id: item.id,
            name: item.name,
            categoryId: item.categoryId ?? null,
            category: item.category?.name ?? "Uncategorized",
            amount: item.amount,
            currency: item.currency,
            paid: amountPaid >= item.amount,
            amountPaid,
            isDraft: false,
            isRecurring: item.isRecurring,
            defaulted: isCompleted && amountPaid < item.amount,
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

/** Base UI Select needs `items` so the trigger shows labels, not raw values (UUIDs). */
const CURRENCY_ITEMS = [
    { value: "NGN", label: "NGN" },
    { value: "USD", label: "USD" },
] as const;

const FREQUENCY_ITEMS = FREQUENCY_OPTIONS.map((opt) => ({
    value: String(opt.value),
    label: opt.label,
}));

function categorySelectItems(categories: { id: string; name: string }[]) {
    return [
        { value: "none", label: "No category" },
        ...categories.map((c) => ({ value: c.id, label: c.name })),
    ];
}

function endMonthSelectItems(endOptions: string[]) {
    return [
        { value: "none", label: "No end date" },
        ...endOptions.map((ym) => ({ value: ym, label: monthLabel(ym) })),
    ];
}

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

/** Shared chrome for joined control groups — rounded, flat, no shadow */
const formGroupShell =
    "flex w-full min-w-0 overflow-hidden rounded-xl border border-border bg-card";

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
        <div
            className={cn(
                // Mobile: fill row with equal segments. Desktop: hug content so labels never clip.
                "flex min-w-0 flex-1 p-0 sm:flex-none sm:w-auto",
                className,
            )}
            role="tablist"
            aria-label="Item type"
        >
            {(Object.keys(TYPE_FILTER_LABELS) as TypeFilter[]).map((filter, i) => (
                <button
                    key={filter}
                    type="button"
                    role="tab"
                    aria-selected={value === filter}
                    aria-label={TYPE_FILTER_LABELS[filter]}
                    onClick={() => onChange(filter)}
                    className={cn(
                        "h-11 text-sm font-medium transition-colors whitespace-nowrap",
                        // Mobile equal columns; desktop fixed padding so “Expense” never truncates
                        "min-w-0 flex-1 basis-0 px-2 text-center sm:min-w-0 sm:flex-none sm:basis-auto sm:px-4",
                        i > 0 && "border-l border-border",
                        value === filter
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "text-foreground/70 hover:text-foreground hover:bg-muted",
                    )}
                >
                    {TYPE_FILTER_LABELS[filter]}
                </button>
            ))}
        </div>
    );
}

function StatusBadge({ status }: { status: BudgetMonthStatus }) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0",
                status === "completed" && "bg-success/20 text-success ring-1 ring-success/30",
                status === "planning" && "bg-primary text-primary-foreground",
                status === "uninitialized" &&
                    "bg-muted text-foreground/80 ring-1 ring-border",
            )}
        >
            {STATUS_LABELS[status]}
        </span>
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
    const [editIncome, setEditIncome] = useState<IncomeTargetSummary | null>(null);
    const [categoryDrilldown, setCategoryDrilldown] = useState<{
        categoryId: string | null;
        categoryName: string;
    } | null>(null);
    const [pendingDelete, setPendingDelete] = useState<
        | { kind: "expense"; id: string; name: string }
        | { kind: "income"; id: string; name: string }
        | { kind: "income-entries"; ids: string[]; name: string }
        | null
    >(null);

    const { data: monthStatus } = useMonthStatus(yearMonth);
    const status = monthStatus?.status ?? "uninitialized";
    const isMonthStarted = status !== "uninitialized";
    const isPlanning = status === "planning";
    const isCompleted = status === "completed";
    const isReadOnly = !isPlanning;

    const { data: items, isLoading } = useBudgetItems(yearMonth, isMonthStarted);
    const { data: incomes } = useIncomeTargets(yearMonth, isMonthStarted);
    const { data: categories } = useCategories();
    const { data: analysis } = useMonthAnalysis(yearMonth, isCompleted);
    // Need rates whenever month is started so summary can convert USD→NGN
    const { data: rate } = useRateForMonth(yearMonth, isMonthStarted);

    const startPlan = useStartPlan();
    const completeMonth = useCompleteMonth();
    const queryClient = useQueryClient();
    const togglePaid = useTogglePaid();
    const adjustPaidAmount = useAdjustPaidAmount();
    const setItemDraft = useSetItemDraft();
    const setIncomeDraft = useSetIncomeDraft();
    const deleteItem = useDeleteBudgetItem();
    const deleteIncomeEntry = useDeleteIncomeEntry();
    const deleteIncomeTarget = useDeleteIncomeTarget();
    const addIncomeEntry = useAddIncomeEntry();
    const upsertRate = useUpsertRate();

    const isRowTogglePending = (id: string) =>
        (togglePaid.isPending && togglePaid.variables === id) ||
        (adjustPaidAmount.isPending && adjustPaidAmount.variables?.id === id) ||
        (addIncomeEntry.isPending &&
            addIncomeEntry.variables?.incomeTargetId === id);

    const allRows = useMemo(
        () => buildUnifiedRows(items, incomes, isCompleted),
        [items, incomes, isCompleted],
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
    const handleAddIncome = () => {
        setEditIncome(null);
        setShowIncome(true);
    };
    const handleEditIncome = (target: IncomeTargetSummary) => {
        setEditIncome(target);
        setShowIncome(true);
    };

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
            const target = incomes?.find((t) => t.id === incomeId);
            if (target?.entries?.length) {
                setPendingDelete({
                    kind: "income-entries",
                    ids: target.entries.map((e) => e.id),
                    name: target.label ?? "Income",
                });
            }
        }
    };

    const monthMenu = isPlanning ? (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        size="icon-sm"
                        variant="ghost"
                        className="h-11 w-11 shrink-0 rounded-none border-0 shadow-none"
                        aria-label="Month options"
                    >
                        <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} className="size-4" />
                    </Button>
                }
            />
            <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => setShowRates(true)}>
                    <HugeiconsIcon icon={Coins02Icon} strokeWidth={2} className="size-4" />
                    {rate ? "Update rates" : "Set rates"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowCompleteConfirm(true)}>
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
                    Mark complete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    ) : null;

    // Mobile: icon-only so All / Income / Expense keep full labels
    const addControl = !isReadOnly ? (
        typeFilter === "expense" ? (
            <Button
                size="sm"
                onClick={handleAddExpense}
                aria-label="Add expense"
                className="h-11 w-11 shrink-0 rounded-none border-0 px-0 shadow-none sm:w-auto sm:px-3.5"
            >
                <HugeiconsIcon icon={AddCircleIcon} strokeWidth={2} className="size-4" />
                <span className="hidden sm:inline">Add</span>
            </Button>
        ) : typeFilter === "income" ? (
            <Button
                size="sm"
                onClick={handleAddIncome}
                aria-label="Add income"
                className="h-11 w-11 shrink-0 rounded-none border-0 px-0 shadow-none sm:w-auto sm:px-3.5"
            >
                <HugeiconsIcon icon={MoneyAdd01Icon} strokeWidth={2} className="size-4" />
                <span className="hidden sm:inline">Add</span>
            </Button>
        ) : (
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <Button
                            size="sm"
                            aria-label="Add item"
                            className="h-11 w-11 shrink-0 rounded-none border-0 px-0 shadow-none sm:w-auto sm:px-3.5"
                        >
                            <HugeiconsIcon icon={AddCircleIcon} strokeWidth={2} className="size-4" />
                            <span className="hidden sm:inline">Add</span>
                        </Button>
                    }
                />
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleAddExpense}>
                        <HugeiconsIcon icon={Coins02Icon} strokeWidth={2} className="size-4" />
                        Expense
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleAddIncome}>
                        <HugeiconsIcon icon={MoneyAdd01Icon} strokeWidth={2} className="size-4" />
                        Income
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        )
    ) : null;

    return (
        <div className="space-y-5 sm:space-y-6">
            {/* Two rows max: month · filter+add — no separate Actions bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
                {/* Month + status + ⋯ */}
                <div className={cn(formGroupShell, "items-stretch min-w-0 sm:max-w-sm sm:flex-none")}>
                    <div className="min-w-0 flex-1 sm:min-w-[10rem]">
                        <MonthPicker
                            value={yearMonth}
                            onChange={(m) => navigate({ search: { ym: m } })}
                            className="h-11 w-full rounded-none border-0 bg-transparent shadow-none hover:bg-muted/50 justify-start px-3"
                        />
                    </div>
                    <div className="w-px shrink-0 self-stretch bg-border" aria-hidden />
                    <div className="flex items-center shrink-0">
                        <div className="flex items-center px-2.5 sm:px-3">
                            <StatusBadge status={status} />
                        </div>
                        {monthMenu && (
                            <>
                                <div className="w-px self-stretch bg-border" aria-hidden />
                                {monthMenu}
                            </>
                        )}
                    </div>
                </div>

                {status === "uninitialized" && (
                    <Button
                        size="sm"
                        onClick={handleStartPlan}
                        disabled={startPlan.isPending}
                        className="w-full sm:w-auto sm:ml-auto"
                    >
                        Start plan
                    </Button>
                )}

                {/* Filter + Add — desktop hugs content; mobile fills width */}
                {status !== "uninitialized" && (
                    <div
                        className={cn(
                            formGroupShell,
                            "w-full items-stretch sm:ml-auto sm:w-auto sm:max-w-none sm:shrink-0",
                        )}
                    >
                        <TypeFilterBar
                            value={typeFilter}
                            onChange={setTypeFilter}
                        />
                        {addControl && (
                            <>
                                <div className="w-px shrink-0 self-stretch bg-border" aria-hidden />
                                {addControl}
                            </>
                        )}
                    </div>
                )}
            </div>

            {status === "uninitialized" && (
                <div className="flex flex-col items-center py-6 text-center rounded-xl border border-dashed border-border bg-card/50">
                    <div className="size-12 rounded-xl bg-primary flex items-center justify-center mb-4">
                        <HugeiconsIcon icon={MoneyAdd01Icon} strokeWidth={2} className="size-6 text-primary-foreground" />
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
                            {/* Summary on every tab when the month has data */}
                            {((incomes && incomes.length > 0) || (items && items.length > 0)) && (
                                <BudgetSummary
                                    incomes={incomes}
                                    items={items}
                                    usdBuyRate={rate?.usdBuyRate ?? 1}
                                />
                            )}

                            {(visibleRows.length > 0 || isPlanning) && (
                            <DivideFrame className="divide-y divide-border">
                                {visibleRows.length > 0 && (
                                    <>
                                        <DivideSectionLabel className="sm:hidden">
                                            {typeFilter === "income"
                                                ? "Income"
                                                : typeFilter === "expense"
                                                    ? "Expenses"
                                                    : "Items"}
                                        </DivideSectionLabel>
                                        <div className="divide-y divide-border sm:hidden">
                                            {visibleRows.map((row) => (
                                                <UnifiedBudgetCard
                                                    key={`${row.kind}-${row.id}`}
                                                    row={row}
                                                    readOnly={isReadOnly}
                                                    togglePending={isRowTogglePending(row.id)}
                                                    onTogglePaid={() => togglePaid.mutate(row.id)}
                                                    onAdjustPaid={(delta) =>
                                                        adjustPaidAmount.mutate({ id: row.id, delta })
                                                    }
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
                                                    onDeleteExpense={() => {
                                                        if (row.kind === "expense") {
                                                            setPendingDelete({
                                                                kind: "expense",
                                                                id: row.id,
                                                                name: row.name,
                                                            });
                                                        }
                                                    }}
                                                    onDeleteIncomeEntry={() => {
                                                        if (row.kind === "income-entry") {
                                                            setPendingDelete({
                                                                kind: "income-entries",
                                                                ids: [row.id],
                                                                name: row.name,
                                                            });
                                                        }
                                                    }}
                                                    onDeleteIncome={() => {
                                                        if (row.kind === "income-target") {
                                                            setPendingDelete({
                                                                kind: "income",
                                                                id: row.id,
                                                                name: row.name,
                                                            });
                                                        }
                                                    }}
                                                    onEditIncome={() => {
                                                        if (row.kind === "income-target") {
                                                            const target = incomes?.find((t) => t.id === row.id);
                                                            if (target) handleEditIncome(target);
                                                        }
                                                    }}
                                                    onSetDraft={(isDraft) => {
                                                        if (row.kind === "expense") {
                                                            setItemDraft.mutate({ id: row.id, isDraft });
                                                        } else if (row.kind === "income-target") {
                                                            setIncomeDraft.mutate({ id: row.id, isDraft });
                                                        }
                                                    }}
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
                                    </>
                                )}

                                {visibleRows.length > 0 && (
                                    <div className="hidden sm:block">
                                        {/* No nested border — DivideFrame already provides the outer chrome */}
                                        <Table containerClassName="relative w-full overflow-x-auto">
                                            <TableHeader>
                                                <TableRow className="hover:bg-transparent">
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
                                                        togglePending={isRowTogglePending(row.id)}
                                                        onTogglePaid={() => togglePaid.mutate(row.id)}
                                                    onAdjustPaid={(delta) =>
                                                        adjustPaidAmount.mutate({ id: row.id, delta })
                                                    }
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
                                                        onDeleteExpense={() => {
                                                            if (row.kind === "expense") {
                                                                setPendingDelete({
                                                                    kind: "expense",
                                                                    id: row.id,
                                                                    name: row.name,
                                                                });
                                                            }
                                                        }}
                                                        onDeleteIncomeEntry={() => {
                                                            if (row.kind === "income-entry") {
                                                                setPendingDelete({
                                                                    kind: "income-entries",
                                                                    ids: [row.id],
                                                                    name: row.name,
                                                                });
                                                            }
                                                        }}
                                                        onDeleteIncome={() => {
                                                            if (row.kind === "income-target") {
                                                                setPendingDelete({
                                                                    kind: "income",
                                                                    id: row.id,
                                                                    name: row.name,
                                                                });
                                                            }
                                                        }}
                                                        onEditIncome={() => {
                                                            if (row.kind === "income-target") {
                                                                const target = incomes?.find((t) => t.id === row.id);
                                                                if (target) handleEditIncome(target);
                                                            }
                                                        }}
                                                        onSetDraft={(isDraft) => {
                                                            if (row.kind === "expense") {
                                                                setItemDraft.mutate({ id: row.id, isDraft });
                                                            } else if (row.kind === "income-target") {
                                                                setIncomeDraft.mutate({ id: row.id, isDraft });
                                                            }
                                                        }}
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
                                )}

                                {visibleRows.length === 0 && isPlanning && (
                                    <div className="flex flex-col items-center py-8 px-4 text-center">
                                        <div className="size-12 rounded-xl bg-primary flex items-center justify-center mb-3">
                                            <HugeiconsIcon
                                                icon={typeFilter === "income" ? MoneyAdd01Icon : Coins02Icon}
                                                strokeWidth={2}
                                                className="size-6 text-primary-foreground"
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
                                                ? "Add one or more income sources (salary, freelance, etc.)."
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
                                                        Add income
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </DivideFrame>
                            )}
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
                                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 cursor-pointer hover:bg-muted/40"
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

            <Dialog
                open={showIncome}
                onOpenChange={(open) => {
                    setShowIncome(open);
                    if (!open) setEditIncome(null);
                }}
            >
                <DialogPanelContent>
                    <DialogPanelHeader title={editIncome ? "Edit Income" : "Add Income"} />
                    <DialogPanelBody>
                        <IncomeForm
                            yearMonth={yearMonth}
                            income={editIncome}
                            onDone={() => {
                                setShowIncome(false);
                                setEditIncome(null);
                            }}
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

            <ConfirmDialog
                open={!!pendingDelete}
                onOpenChange={(open) => !open && setPendingDelete(null)}
                title={
                    pendingDelete?.kind === "expense"
                        ? "Delete expense?"
                        : pendingDelete?.kind === "income"
                            ? "Delete income source?"
                            : "Clear received amount?"
                }
                description={
                    pendingDelete
                        ? pendingDelete.kind === "income-entries"
                            ? `This will remove recorded payments for “${pendingDelete.name}”.`
                            : `“${pendingDelete.name}” will be permanently deleted.`
                        : undefined
                }
                confirmLabel={pendingDelete?.kind === "income-entries" ? "Clear" : "Delete"}
                pending={
                    deleteItem.isPending ||
                    deleteIncomeTarget.isPending ||
                    deleteIncomeEntry.isPending
                }
                onConfirm={async () => {
                    if (!pendingDelete) return;
                    if (pendingDelete.kind === "expense") {
                        await deleteItem.mutateAsync(pendingDelete.id);
                    } else if (pendingDelete.kind === "income") {
                        await deleteIncomeTarget.mutateAsync(pendingDelete.id);
                    } else {
                        for (const id of pendingDelete.ids) {
                            await deleteIncomeEntry.mutateAsync(id);
                        }
                    }
                }}
            />
        </div>
    );
}

function BudgetSummary({
    incomes,
    items,
    usdBuyRate,
}: {
    incomes: IncomeTargetSummary[] | undefined;
    items: {
        amount: number;
        currency: string;
        amountPaid?: number;
        paid?: boolean;
        isDraft?: boolean;
    }[] | undefined;
    usdBuyRate: number;
}) {
    const summary = computeBudgetMonthSummary(
        (items ?? []).map((item) => normalizeExpenseSummaryItem(item)),
        incomes ?? [],
        usdBuyRate,
    );

    const hasData = summary.plannedIncome > 0 || summary.totalExpenses > 0;
    if (!hasData) return null;

    const paidPct =
        summary.totalExpenses > 0
            ? Math.min(100, Math.round((summary.paid / summary.totalExpenses) * 100))
            : 0;

    return (
        <div className="space-y-3 sm:space-y-4">
            <DivideFrame>
                <DivideSectionLabel>This month so far</DivideSectionLabel>
                <div className="space-y-3 px-4 py-3.5">
                    {summary.totalExpenses > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                                Paid{" "}
                                <span className="font-mono font-semibold tabular-nums text-expense">
                                    {formatNGNFull(summary.paid)}
                                </span>
                                {" of "}
                                <span className="font-mono font-semibold tabular-nums text-foreground">
                                    {formatNGNFull(summary.totalExpenses)}
                                </span>
                                {" expenses"}
                            </p>
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-expense transition-all duration-500"
                                    style={{ width: `${paidPct}%` }}
                                    role="progressbar"
                                    aria-valuenow={paidPct}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-label={`${paidPct}% of expenses paid`}
                                />
                            </div>
                        </div>
                    )}
                    {(summary.plannedIncome > 0 || summary.recordedIncome > 0) && (
                        <p className="text-sm text-muted-foreground">
                            Recorded{" "}
                            <span className="font-mono font-semibold tabular-nums text-success">
                                {formatNGNFull(summary.recordedIncome)}
                            </span>
                            {" in"}
                        </p>
                    )}
                </div>
            </DivideFrame>

            <DivideFrame>
                <DivideSectionLabel>Plan</DivideSectionLabel>
                <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                    <div className="px-4 py-3.5">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Income
                        </p>
                        <p className="mt-1.5 font-mono text-lg font-semibold leading-none tabular-nums text-success">
                            {formatNGNFull(summary.plannedIncome)}
                        </p>
                    </div>
                    <div className="px-4 py-3.5">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Expenses
                        </p>
                        <p className="mt-1.5 font-mono text-lg font-semibold leading-none tabular-nums text-expense">
                            {formatNGNFull(summary.plannedExpenses)}
                        </p>
                    </div>
                    <div className="px-4 py-3.5">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Reserve
                        </p>
                        <p
                            className={cn(
                                "mt-1.5 font-mono text-lg font-semibold leading-none tabular-nums",
                                summary.reserve >= 0 ? "text-success" : "text-expense",
                            )}
                        >
                            {formatNGNFull(summary.reserve)}
                        </p>
                    </div>
                </div>
            </DivideFrame>
        </div>
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
            title={categoryName}
            className={cn(
                // Block + truncate so long names never blow out the row
                "block min-w-0 max-w-full truncate rounded-md border border-border bg-muted/60 px-2 py-0.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary cursor-pointer",
                className,
            )}
        >
            {categoryName}
        </button>
    );
}

function getUnifiedRowMeta(row: UnifiedRow) {
    const isExpense = row.kind === "expense";
    const isIncome = row.kind !== "expense";
    const isDraft = isExpense && row.isDraft;
    const isFullyPaid = isExpense && row.amountPaid >= row.amount && !row.isDraft;
    const isPartial = isExpense && row.amountPaid > 0 && row.amountPaid < row.amount && !row.isDraft;
    const paid = isFullyPaid;
    const defaulted = isExpense && row.defaulted && row.amountPaid < row.amount && !row.isDraft;

    const typeLabel = isExpense ? "Expense" : "Income";
    const categoryOrSource = isExpense ? row.category : row.source;

    let statusLabel: string;
    let statusClass: string;
    if (row.kind === "expense") {
        if (row.isDraft) {
            statusLabel = "Draft";
            statusClass = "text-muted-foreground";
        } else if (row.defaulted && row.amountPaid < row.amount) {
            statusLabel = isPartial ? "Partial · defaulted" : "Defaulted";
            statusClass = "text-[var(--color-warning)]";
        } else if (isFullyPaid) {
            statusLabel = "Paid";
            statusClass = "text-[var(--color-success)]";
        } else if (isPartial) {
            statusLabel = "Partial";
            statusClass = "text-[var(--color-warning)]";
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

    const rowBg = isDraft
        ? "bg-muted/40"
        : defaulted
            ? "bg-[var(--color-warning)]/5"
            : isFullyReceived
                ? "bg-[var(--color-success)]/5"
                : "";

    return {
        isExpense,
        isIncome,
        isDraft,
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
    togglePending?: boolean;
    onTogglePaid: () => void;
    onAdjustPaid: (delta: number) => void;
    onToggleIncome: () => void;
    onDeleteExpense: () => void;
    onDeleteIncomeEntry: () => void;
    onDeleteIncome: () => void;
    onEditIncome: () => void;
    onEditExpense: () => void;
    onSetDraft: (isDraft: boolean) => void;
    onCategoryClick: (cat: { categoryId: string | null; categoryName: string }) => void;
};

function CheckboxLoading() {
    return (
        <div
            className="flex size-5 shrink-0 items-center justify-center rounded-[3px] border-2 border-border bg-background"
            aria-busy="true"
            aria-label="Updating"
            title="Updating…"
        >
            <HugeiconsIcon
                icon={Loading03Icon}
                strokeWidth={2}
                className="size-3 animate-spin text-muted-foreground"
            />
        </div>
    );
}

function BudgetRowCheckbox({
    row,
    readOnly,
    togglePending,
    onTogglePaid,
    onAdjustPaid,
    onToggleIncome,
}: Pick<
    UnifiedBudgetRowProps,
    "row" | "readOnly" | "togglePending" | "onTogglePaid" | "onAdjustPaid" | "onToggleIncome"
>) {
    const { isExpense, isIncome, isDraft } = getUnifiedRowMeta(row);

    if (isExpense && row.kind === "expense") {
        return (
            <ExpensePaidControl
                id={row.id}
                name={row.name}
                amount={row.amount}
                currency={row.currency}
                amountPaid={row.amountPaid}
                isDraft={isDraft}
                readOnly={readOnly}
                pending={togglePending}
                onTogglePaid={onTogglePaid}
                onAdjustPaid={onAdjustPaid}
            />
        );
    }

    if (togglePending) {
        return <CheckboxLoading />;
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

    return <div className="size-5 shrink-0" />;
}

function BudgetRowActions({
    row,
    readOnly,
    onDeleteExpense,
    onDeleteIncomeEntry,
    onDeleteIncome,
    onEditIncome,
    onEditExpense,
    onSetDraft,
    mobile = false,
}: Pick<
    UnifiedBudgetRowProps,
    | "row"
    | "readOnly"
    | "onDeleteExpense"
    | "onDeleteIncomeEntry"
    | "onDeleteIncome"
    | "onEditIncome"
    | "onEditExpense"
    | "onSetDraft"
> & { mobile?: boolean }) {
    if (readOnly) return null;

    const actionBtn = mobile
        ? "size-8 shrink-0 text-muted-foreground"
        : "size-8 text-muted-foreground opacity-0 group-hover:opacity-100";

    return (
        <>
            {row.kind === "expense" && (
                <>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onSetDraft(!row.isDraft)}
                        className={actionBtn}
                        title={row.isDraft ? "Activate expense" : "Move to draft"}
                        aria-label={row.isDraft ? "Activate expense" : "Move to draft"}
                    >
                        <HugeiconsIcon icon={InboxDownloadIcon} strokeWidth={2} className="size-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={onEditExpense}
                        className={actionBtn}
                        title="Edit"
                        aria-label="Edit"
                    >
                        <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} className="size-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={onDeleteExpense}
                        className={cn(actionBtn, "hover:bg-destructive/10 hover:text-destructive")}
                        title="Delete"
                        aria-label="Delete"
                    >
                        <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} className="size-4" />
                    </Button>
                </>
            )}
            {row.kind === "income-entry" && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={onDeleteIncomeEntry}
                    className={cn(actionBtn, "hover:bg-destructive/10 hover:text-destructive")}
                    title="Delete"
                    aria-label="Delete"
                >
                    <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} className="size-4" />
                </Button>
            )}
            {row.kind === "income-target" && (
                <>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onSetDraft(true)}
                        className={actionBtn}
                        title="Move to draft"
                        aria-label="Move to draft"
                    >
                        <HugeiconsIcon icon={InboxDownloadIcon} strokeWidth={2} className="size-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={onEditIncome}
                        className={actionBtn}
                        title="Edit income"
                        aria-label="Edit income"
                    >
                        <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} className="size-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={onDeleteIncome}
                        className={cn(actionBtn, "hover:bg-destructive/10 hover:text-destructive")}
                        title="Delete income source"
                        aria-label="Delete income source"
                    >
                        <HugeiconsIcon icon={Delete01Icon} strokeWidth={2} className="size-4" />
                    </Button>
                </>
            )}
        </>
    );
}

/** Mobile list row — checkbox sits with the title only, not the full card stack. */
function UnifiedBudgetCard({
    row,
    readOnly,
    togglePending,
    onTogglePaid,
    onAdjustPaid,
    onToggleIncome,
    onDeleteExpense,
    onDeleteIncomeEntry,
    onDeleteIncome,
    onEditIncome,
    onEditExpense,
    onSetDraft,
    onCategoryClick,
}: UnifiedBudgetRowProps) {
    const meta = getUnifiedRowMeta(row);

    return (
        <div
            className={cn(
                "space-y-1.5 px-4 py-3.5 transition-colors",
                meta.rowBg,
                meta.paid && "opacity-75",
                meta.isDraft && "opacity-80",
            )}
        >
            {/* Title row: checkbox + name · amount */}
            <div className="flex items-center gap-2">
                <BudgetRowCheckbox
                    row={row}
                    readOnly={readOnly}
                    togglePending={togglePending}
                    onTogglePaid={onTogglePaid}
                    onAdjustPaid={onAdjustPaid}
                    onToggleIncome={onToggleIncome}
                />
                <div className="min-w-0 flex-1 flex items-center gap-1.5">
                    <span
                        className={cn(
                            "min-w-0 truncate text-sm font-medium",
                            meta.paid && "line-through",
                        )}
                    >
                        {row.name}
                    </span>
                    {meta.isRecurring && (
                        <HugeiconsIcon
                            icon={RepeatIcon}
                            strokeWidth={2}
                            className="size-3.5 shrink-0 text-primary"
                        />
                    )}
                </div>
                <span
                    className={cn(
                        "shrink-0 font-mono text-sm font-semibold tabular-nums leading-5",
                        meta.isIncome && "text-success",
                    )}
                >
                    {meta.isExpense && row.kind === "expense"
                        ? formatExpenseAmountDisplay(row.amount, row.currency, row.amountPaid)
                        : formatAmount(row.amount, row.currency)}
                </span>
            </div>

            {/* Meta — full width under the title (no checkbox column) */}
            <div className="flex items-center gap-1.5 text-xs">
                <span
                    className={cn(
                        "font-medium",
                        meta.isIncome ? "text-success" : "text-muted-foreground",
                    )}
                >
                    {meta.typeLabel}
                </span>
                <span className="text-muted-foreground/50">·</span>
                <span className={cn("font-medium", meta.statusClass)}>
                    {meta.statusLabel}
                </span>
            </div>

            <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                    {meta.isExpense && row.kind === "expense" ? (
                        <CategoryBadge
                            categoryName={row.category}
                            onClick={() =>
                                onCategoryClick({
                                    categoryId: row.categoryId,
                                    categoryName: row.category,
                                })
                            }
                            className="w-fit max-w-full"
                        />
                    ) : (
                        <p className="truncate text-xs text-muted-foreground">
                            {meta.categoryOrSource}
                        </p>
                    )}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                    <BudgetRowActions
                        row={row}
                        readOnly={readOnly}
                        onDeleteExpense={onDeleteExpense}
                        onDeleteIncomeEntry={onDeleteIncomeEntry}
                        onDeleteIncome={onDeleteIncome}
                        onEditIncome={onEditIncome}
                        onEditExpense={onEditExpense}
                        onSetDraft={onSetDraft}
                        mobile
                    />
                </div>
            </div>
        </div>
    );
}

function UnifiedBudgetRow({
    row,
    readOnly,
    togglePending,
    onTogglePaid,
    onAdjustPaid,
    onToggleIncome,
    onDeleteExpense,
    onDeleteIncomeEntry,
    onDeleteIncome,
    onEditIncome,
    onEditExpense,
    onSetDraft,
    onCategoryClick,
}: UnifiedBudgetRowProps) {
    const meta = getUnifiedRowMeta(row);

    return (
        <TableRow className={`group ${meta.paid ? "opacity-60" : ""} ${meta.rowBg} ${meta.isDraft ? "opacity-80" : ""}`}>
            {/* Checkbox only beside title */}
            <TableCell>
                <div className="flex min-w-0 items-center gap-2">
                    <BudgetRowCheckbox
                        row={row}
                        readOnly={readOnly}
                        togglePending={togglePending}
                        onTogglePaid={onTogglePaid}
                        onAdjustPaid={onAdjustPaid}
                        onToggleIncome={onToggleIncome}
                    />
                    <div className="min-w-0 flex items-center gap-1.5">
                        <span className={`font-medium truncate ${meta.paid ? "line-through" : ""}`}>
                            {row.name}
                        </span>
                        {meta.isRecurring && (
                            <HugeiconsIcon
                                icon={RepeatIcon}
                                strokeWidth={2}
                                className="size-3.5 text-primary shrink-0"
                            />
                        )}
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <span className={`text-sm font-medium ${meta.isIncome ? "text-success" : "text-muted-foreground"}`}>
                    {meta.typeLabel}
                </span>
            </TableCell>
            <TableCell className="max-w-[10rem]">
                {meta.isExpense && row.kind === "expense" ? (
                    <CategoryBadge
                        categoryName={row.category}
                        onClick={() => onCategoryClick({ categoryId: row.categoryId, categoryName: row.category })}
                        className="max-w-full"
                    />
                ) : (
                    <span className="block max-w-full truncate text-sm text-muted-foreground">
                        {meta.categoryOrSource}
                    </span>
                )}
            </TableCell>
            <TableCell className="text-right">
                <span className={`font-mono text-sm font-medium ${meta.isIncome ? "text-success" : ""}`}>
                    {meta.isExpense && row.kind === "expense"
                        ? formatExpenseAmountDisplay(row.amount, row.currency, row.amountPaid)
                        : formatAmount(row.amount, row.currency)}
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
                        onDeleteIncome={onDeleteIncome}
                        onEditIncome={onEditIncome}
                        onEditExpense={onEditExpense}
                        onSetDraft={onSetDraft}
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
    const [saveAsDraft, setSaveAsDraft] = useState(false);
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
            isDraft: saveAsDraft || undefined,
        });
        onDone();
    };

    return (
        <div className="min-w-0 space-y-3">
            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" />
            <div className="flex min-w-0 gap-2">
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" step="0.01" className="min-w-0 flex-1" />
                <Select value={currency} onValueChange={(v) => setCurrency(v as "NGN" | "USD")} items={[...CURRENCY_ITEMS]}>
                    <SelectTrigger className="w-[5.5rem] shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {CURRENCY_ITEMS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Select
                value={categoryId}
                onValueChange={(v) => setCategoryId(v ?? "none")}
                items={categorySelectItems(categories)}
            >
                <SelectTrigger className="w-full max-w-full"><SelectValue placeholder="No category" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <div className="flex items-center gap-2 py-2">
                <Checkbox id="recurring" checked={isRecurring} onCheckedChange={(v) => setIsRecurring(v === true)} />
                <label htmlFor="recurring" className="text-sm cursor-pointer select-none">Recurring</label>
            </div>
            <div className="flex items-center gap-2 py-1">
                <Checkbox
                    id="expense-draft"
                    checked={saveAsDraft}
                    onCheckedChange={(v) => setSaveAsDraft(v === true)}
                />
                <label htmlFor="expense-draft" className="text-sm cursor-pointer select-none">
                    Save as draft (not in totals)
                </label>
            </div>
            {isRecurring && endOptions.length > 0 && (
                <div className="space-y-1 min-w-0">
                    <label className="text-xs text-muted-foreground">End month (optional)</label>
                    <Select
                        value={endsAtYearMonth}
                        onValueChange={(v) => setEndsAtYearMonth(v ?? "none")}
                        items={endMonthSelectItems(endOptions)}
                    >
                        <SelectTrigger className="w-full max-w-full"><SelectValue placeholder="No end date" /></SelectTrigger>
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
                <Select
                    value={frequencyMonths}
                    onValueChange={(v) => setFrequencyMonths(v ?? "1")}
                    items={FREQUENCY_ITEMS}
                >
                    <SelectTrigger className="w-full max-w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {FREQUENCY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
            <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={onDone}>Cancel</Button>
                <Button onClick={submit} disabled={addItem.isPending}>
                    {saveAsDraft ? "Save draft" : "Add"}
                </Button>
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
        <div className="min-w-0 space-y-3">
            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" />
            <div className="flex min-w-0 gap-2">
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" step="0.01" className="min-w-0 flex-1" />
                <Select value={currency} onValueChange={(v) => setCurrency(v as "NGN" | "USD")} items={[...CURRENCY_ITEMS]}>
                    <SelectTrigger className="w-[5.5rem] shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {CURRENCY_ITEMS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Select
                value={categoryId}
                onValueChange={(v) => setCategoryId(v ?? "none")}
                items={categorySelectItems(categories)}
            >
                <SelectTrigger className="w-full max-w-full"><SelectValue placeholder="No category" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {item.isRecurring && (
                <>
                    <div className="flex items-center gap-2 py-1">
                        <Checkbox id="edit-update-base" checked={updateBase} onCheckedChange={(v) => setUpdateBase(v === true)} />
                        <label htmlFor="edit-update-base" className="text-sm cursor-pointer select-none">
                            Update recurring template (affects future months)
                        </label>
                    </div>
                    {updateBase && endOptions.length > 0 && (
                        <div className="space-y-1 min-w-0">
                            <label className="text-xs text-muted-foreground">End month (optional)</label>
                            <Select
                                value={endsAtYearMonth}
                                onValueChange={(v) => setEndsAtYearMonth(v ?? "none")}
                                items={endMonthSelectItems(endOptions)}
                            >
                                <SelectTrigger className="w-full max-w-full"><SelectValue placeholder="No end date" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No end date</SelectItem>
                                    {endOptions.map((ym) => (
                                        <SelectItem key={ym} value={ym}>{monthLabel(ym)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <Select
                        value={frequencyMonths}
                        onValueChange={(v) => setFrequencyMonths(v ?? "1")}
                        items={FREQUENCY_ITEMS}
                    >
                        <SelectTrigger className="w-full max-w-full"><SelectValue /></SelectTrigger>
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
    income: IncomeTargetSummary | null | undefined;
    onDone: () => void;
}) {
    const [targetName, setTargetName] = useState(income?.label ?? "");
    const [targetAmount, setTargetAmount] = useState(income ? String(income.amount) : "");
    const [currency, setCurrency] = useState<"NGN" | "USD">((income?.currency as "NGN" | "USD") ?? "NGN");
    const [isRecurring, setIsRecurring] = useState(income?.isRecurring ?? false);
    const [frequencyMonths, setFrequencyMonths] = useState(String(income?.frequencyMonths ?? 1));
    const [endsAtYearMonth, setEndsAtYearMonth] = useState(income?.endsAtYearMonth ?? "none");
    const [updateBase, setUpdateBase] = useState(false);
    const [saveAsDraft, setSaveAsDraft] = useState(false);
    const setTarget = useSetIncomeTarget();
    const updateTarget = useUpdateIncomeTarget();

    // Reset form when switching between add / edit target
    useEffect(() => {
        setTargetName(income?.label ?? "");
        setTargetAmount(income ? String(income.amount) : "");
        setCurrency((income?.currency as "NGN" | "USD") ?? "NGN");
        setIsRecurring(income?.isRecurring ?? false);
        setFrequencyMonths(String(income?.frequencyMonths ?? 1));
        setEndsAtYearMonth(income?.endsAtYearMonth ?? "none");
        setUpdateBase(false);
        setSaveAsDraft(false);
    }, [income?.id]);

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
            await setTarget.mutateAsync({
                yearMonth,
                ...payload,
                isDraft: saveAsDraft || undefined,
            });
        }
        onDone();
    };

    return (
        <div className="min-w-0 space-y-4">
            <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Source name</label>
                <Input type="text" value={targetName} onChange={(e) => setTargetName(e.target.value)} placeholder="e.g. Salary, Freelance" maxLength={64} />
            </div>
            <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Target amount</label>
                <div className="flex min-w-0 gap-2">
                    <Input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="Target amount" className="min-w-0 flex-1" />
                    <Select value={currency} onValueChange={(v) => setCurrency(v as "NGN" | "USD")} items={[...CURRENCY_ITEMS]}>
                        <SelectTrigger className="w-[5.5rem] shrink-0"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {CURRENCY_ITEMS.map((c) => (
                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="flex items-center gap-2 py-1">
                <Checkbox id="income-recurring" checked={isRecurring} onCheckedChange={(v) => setIsRecurring(v === true)} />
                <label htmlFor="income-recurring" className="text-sm cursor-pointer select-none">Recurring</label>
            </div>
            {!income && (
                <div className="flex items-center gap-2 py-1">
                    <Checkbox
                        id="income-draft"
                        checked={saveAsDraft}
                        onCheckedChange={(v) => setSaveAsDraft(v === true)}
                    />
                    <label htmlFor="income-draft" className="text-sm cursor-pointer select-none">
                        Save as draft (not in totals)
                    </label>
                </div>
            )}
            {income?.isRecurring && (
                <div className="flex items-center gap-2 py-1">
                    <Checkbox id="income-update-base" checked={updateBase} onCheckedChange={(v) => setUpdateBase(v === true)} />
                    <label htmlFor="income-update-base" className="text-sm cursor-pointer select-none">
                        Update recurring template (affects future months)
                    </label>
                </div>
            )}
            {isRecurring && (!income?.isRecurring || updateBase) && endOptions.length > 0 && (
                <div className="space-y-1 min-w-0">
                    <label className="text-xs text-muted-foreground">End month (optional)</label>
                    <Select
                        value={endsAtYearMonth}
                        onValueChange={(v) => setEndsAtYearMonth(v ?? "none")}
                        items={endMonthSelectItems(endOptions)}
                    >
                        <SelectTrigger className="w-full max-w-full"><SelectValue placeholder="No end date" /></SelectTrigger>
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
                <Select
                    value={frequencyMonths}
                    onValueChange={(v) => setFrequencyMonths(v ?? "1")}
                    items={FREQUENCY_ITEMS}
                >
                    <SelectTrigger className="w-full max-w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {FREQUENCY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
            <Button onClick={handleSetTarget} disabled={setTarget.isPending || updateTarget.isPending || !targetName.trim()} className="w-full">
                {income ? "Save changes" : saveAsDraft ? "Save draft" : "Add income source"}
            </Button>
        </div>
    );
}
