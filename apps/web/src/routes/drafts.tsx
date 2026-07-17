import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { toNgn, type Currency } from "@expense/shared";
import { orpc } from "../lib/clients/orpc";
import {
    useExpenseDrafts,
    useIncomeDrafts,
    useSetItemDraft,
    useSetIncomeDraft,
    useDeleteBudgetItem,
    useDeleteIncomeTarget,
    useAddBudgetItem,
    useSetIncomeTarget,
    useUpdateBudgetItem,
    useUpdateIncomeTarget,
    useCategories,
    useMonthStatus,
    useLatestRate,
    type DraftExpense,
    type DraftIncome,
    type IncomeTargetSummary,
} from "../lib/queries";
import { DivideFrame, DivideSectionLabel } from "@/components/divide-frame";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogPanelBody,
    DialogPanelContent,
    DialogPanelHeader,
} from "@/components/ui/dialog";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { MonthPicker } from "@/components/month-picker";
import {
    formatCurrency,
    formatNGNFull,
    monthLabel,
    currMonth,
    computeRecurringEndOptions,
    cn,
} from "../lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Delete01Icon,
    InboxUploadIcon,
    AddCircleIcon,
    MoneyAdd01Icon,
    Edit02Icon,
    Tick02Icon,
} from "@hugeicons/core-free-icons";

export const Route = createFileRoute("/drafts")({
    component: DraftsPage,
});

type PendingDelete =
    | { kind: "expense"; id: string; name: string }
    | { kind: "income"; id: string; name: string }
    | null;

type CreateDialog = "expense" | "income" | null;

const actionBtn = "size-8 shrink-0 text-muted-foreground";

const CURRENCY_ITEMS = [
    { value: "NGN", label: "NGN" },
    { value: "USD", label: "USD" },
] as const;

const FREQUENCY_OPTIONS = [
    { value: 1, label: "Every month" },
    { value: 2, label: "Every 2 months" },
    { value: 3, label: "Quarterly" },
    { value: 6, label: "Every 6 months" },
    { value: 12, label: "Yearly" },
];

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

function amountToNgn(amount: number, currency: string, usdBuyRate: number): number {
    return toNgn(amount, currency as Currency, { usdBuyRate });
}

/** Unchecked net for a month: open income − unpaid expenses (active items only). */
function computeUncheckedNet(
    items: { amount: number; currency: string; paid: boolean; isDraft?: boolean }[] | undefined,
    incomes: IncomeTargetSummary[] | undefined,
    usdBuyRate: number,
): number {
    const active = (items ?? []).filter((i) => !i.isDraft);
    const totalExpenses = active.reduce(
        (sum, i) => sum + amountToNgn(i.amount, i.currency, usdBuyRate),
        0,
    );
    const paidExpenses = active
        .filter((i) => i.paid)
        .reduce((sum, i) => sum + amountToNgn(i.amount, i.currency, usdBuyRate), 0);
    const unpaidExpenses = totalExpenses - paidExpenses;

    const incomeAmount = (incomes ?? []).reduce(
        (sum, t) => sum + amountToNgn(t.amount, t.currency, usdBuyRate),
        0,
    );
    const incomeReceived = (incomes ?? []).reduce((sum, t) => {
        const fromEntries = (t.entries ?? []).reduce(
            (s, e) => s + amountToNgn(e.amount, e.currency, usdBuyRate),
            0,
        );
        return (
            sum +
            (t.entries?.length
                ? fromEntries
                : amountToNgn(t.totalReceived ?? 0, t.currency, usdBuyRate))
        );
    }, 0);

    const incomeOpen = Math.max(0, incomeAmount - incomeReceived);
    return incomeOpen - unpaidExpenses;
}

function DraftsPage() {
    const { data: expenses, isLoading: loadingExp } = useExpenseDrafts();
    const { data: income, isLoading: loadingInc } = useIncomeDrafts();
    const { data: categories } = useCategories();
    const { data: latestRate } = useLatestRate();
    const usdBuyRate = latestRate?.usdBuyRate ?? 1;
    const setExpenseDraft = useSetItemDraft();
    const setIncomeDraft = useSetIncomeDraft();
    const deleteExpense = useDeleteBudgetItem();
    const deleteIncome = useDeleteIncomeTarget();
    const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
    const [createDialog, setCreateDialog] = useState<CreateDialog>(null);
    const [editExpense, setEditExpense] = useState<DraftExpense | null>(null);
    const [editIncome, setEditIncome] = useState<DraftIncome | null>(null);

    const isLoading = loadingExp || loadingInc;
    const expCount = expenses?.length ?? 0;
    const incCount = income?.length ?? 0;
    const empty = !isLoading && expCount === 0 && incCount === 0;
    const activating = setExpenseDraft.isPending || setIncomeDraft.isPending;

    const draftIncomeTotal = (income ?? []).reduce(
        (sum, d) => sum + amountToNgn(d.amount, d.currency, usdBuyRate),
        0,
    );
    const draftExpenseTotal = (expenses ?? []).reduce(
        (sum, d) => sum + amountToNgn(d.amount, d.currency, usdBuyRate),
        0,
    );

    // Unchecked net per month (for "fits budget" indicator on expense drafts)
    const yearMonths = useMemo(() => {
        const set = new Set<string>();
        for (const e of expenses ?? []) set.add(e.yearMonth);
        return [...set];
    }, [expenses]);

    const monthRoomQueries = useQueries({
        queries: yearMonths.map((ym) => ({
            queryKey: ["drafts", "unchecked-net", ym],
            queryFn: async () => {
                const [items, incomes, rate] = await Promise.all([
                    orpc.budget.getBudgetItems({ yearMonth: ym }),
                    orpc.income.getIncomeTarget({ yearMonth: ym }) as Promise<
                        IncomeTargetSummary[]
                    >,
                    orpc.rates.getRateForMonth({ yearMonth: ym }),
                ]);
                const rateBuy = rate?.usdBuyRate ?? usdBuyRate;
                return {
                    ym,
                    uncheckedNet: computeUncheckedNet(items, incomes, rateBuy),
                    usdBuyRate: rateBuy,
                };
            },
            enabled: yearMonths.length > 0,
            staleTime: 30_000,
        })),
    });

    const roomByMonth = useMemo(() => {
        const map = new Map<string, { uncheckedNet: number; usdBuyRate: number }>();
        for (const q of monthRoomQueries) {
            if (q.data) {
                map.set(q.data.ym, {
                    uncheckedNet: q.data.uncheckedNet,
                    usdBuyRate: q.data.usdBuyRate,
                });
            }
        }
        return map;
    }, [monthRoomQueries]);

    const canFitBudget = (item: DraftExpense): boolean => {
        const room = roomByMonth.get(item.yearMonth);
        if (!room) return false;
        // Only when there is positive room and the draft is smaller than that room
        if (room.uncheckedNet <= 0) return false;
        const amountNgn = amountToNgn(item.amount, item.currency, room.usdBuyRate);
        return room.uncheckedNet > amountNgn;
    };

    return (
        <div className="space-y-4 sm:space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-heading font-semibold">Drafts</h1>
                    <p className="text-sm text-muted-foreground">
                        Plan expenses and earnings here — activate when you want them in totals
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setCreateDialog("expense")}
                        className="gap-1.5"
                    >
                        <HugeiconsIcon icon={AddCircleIcon} strokeWidth={2} className="size-4" />
                        Draft expense
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => setCreateDialog("income")}
                        className="gap-1.5"
                    >
                        <HugeiconsIcon icon={MoneyAdd01Icon} strokeWidth={2} className="size-4" />
                        Draft income
                    </Button>
                </div>
            </div>

            {isLoading && (
                <DivideFrame>
                    <div className="h-32 animate-pulse bg-muted/30" />
                </DivideFrame>
            )}

            {!empty && !isLoading && (
                <DivideFrame className="divide-y divide-border">
                    <div className="px-4 py-2">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Balance
                        </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Income
                        </span>
                        <span className="font-mono text-sm tabular-nums text-right text-success">
                            {formatNGNFull(draftIncomeTotal)}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Expenses
                        </span>
                        <span className="font-mono text-sm tabular-nums text-right text-expense">
                            −{formatNGNFull(draftExpenseTotal)}
                        </span>
                    </div>
                </DivideFrame>
            )}

            {empty && (
                <DivideFrame>
                    <div className="flex flex-col items-center text-center px-6 py-10">
                        <p className="text-sm text-muted-foreground mb-1">No drafts yet</p>
                        <p className="text-xs text-muted-foreground mb-4 max-w-sm">
                            Create a draft expense or income for any month that is in planning.
                            Drafts stay out of totals until you activate them.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setCreateDialog("expense")}
                            >
                                Draft expense
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => setCreateDialog("income")}
                            >
                                Draft income
                            </Button>
                        </div>
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
                            canFit={canFitBudget(item)}
                            onEdit={() => setEditExpense(item)}
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
                                onEdit={() => setEditIncome(item)}
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

            <Dialog
                open={createDialog === "expense"}
                onOpenChange={(open) => !open && setCreateDialog(null)}
            >
                <DialogPanelContent>
                    <DialogPanelHeader
                        title="Draft expense"
                        description="Saved as a draft — not included in totals until activated."
                    />
                    <DialogPanelBody>
                        <DraftExpenseForm
                            categories={categories ?? []}
                            onDone={() => setCreateDialog(null)}
                        />
                    </DialogPanelBody>
                </DialogPanelContent>
            </Dialog>

            <Dialog
                open={createDialog === "income"}
                onOpenChange={(open) => !open && setCreateDialog(null)}
            >
                <DialogPanelContent>
                    <DialogPanelHeader
                        title="Draft income"
                        description="Saved as a draft — not included in totals until activated."
                    />
                    <DialogPanelBody>
                        <DraftIncomeForm onDone={() => setCreateDialog(null)} />
                    </DialogPanelBody>
                </DialogPanelContent>
            </Dialog>

            <Dialog
                open={!!editExpense}
                onOpenChange={(open) => !open && setEditExpense(null)}
            >
                <DialogPanelContent>
                    <DialogPanelHeader
                        title="Edit expense draft"
                        description="Changes stay in drafts until you activate."
                    />
                    <DialogPanelBody>
                        {editExpense && (
                            <EditDraftExpenseForm
                                item={editExpense}
                                categories={categories ?? []}
                                onDone={() => setEditExpense(null)}
                            />
                        )}
                    </DialogPanelBody>
                </DialogPanelContent>
            </Dialog>

            <Dialog
                open={!!editIncome}
                onOpenChange={(open) => !open && setEditIncome(null)}
            >
                <DialogPanelContent>
                    <DialogPanelHeader
                        title="Edit income draft"
                        description="Changes stay in drafts until you activate."
                    />
                    <DialogPanelBody>
                        {editIncome && (
                            <EditDraftIncomeForm
                                item={editIncome}
                                onDone={() => setEditIncome(null)}
                            />
                        )}
                    </DialogPanelBody>
                </DialogPanelContent>
            </Dialog>

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

function MonthStatusHint({ yearMonth }: { yearMonth: string }) {
    const { data: status, isLoading } = useMonthStatus(yearMonth);
    if (isLoading || !status) return null;

    if (status.status === "planning") {
        return (
            <p className="text-xs text-muted-foreground">
                {monthLabel(yearMonth)} is in planning — drafts can be saved.
            </p>
        );
    }

    if (status.status === "completed") {
        return (
            <p className="text-xs text-destructive">
                {monthLabel(yearMonth)} is completed and locked.{" "}
                <Link to="/budget" search={{ ym: yearMonth }} className="underline underline-offset-2">
                    Open budget
                </Link>
            </p>
        );
    }

    return (
        <p className="text-xs text-warning">
            Start a plan for {monthLabel(yearMonth)} first.{" "}
            <Link to="/budget" search={{ ym: yearMonth }} className="underline underline-offset-2">
                Open budget
            </Link>
        </p>
    );
}

function mutationErrorMessage(err: unknown): string {
    if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
        return (err as { message: string }).message;
    }
    return "Something went wrong. Try again.";
}

function EditDraftExpenseForm({
    item,
    categories,
    onDone,
}: {
    item: DraftExpense;
    categories: { id: string; name: string }[];
    onDone: () => void;
}) {
    const [name, setName] = useState(item.name);
    const [amount, setAmount] = useState(String(item.amount));
    const [currency, setCurrency] = useState<"NGN" | "USD">(item.currency as "NGN" | "USD");
    const [categoryId, setCategoryId] = useState(item.categoryId ?? "none");
    const [isRecurring, setIsRecurring] = useState(item.isRecurring ?? false);
    const [frequencyMonths, setFrequencyMonths] = useState(String(item.frequencyMonths ?? 1));
    const [endsAtYearMonth, setEndsAtYearMonth] = useState(item.endsAtYearMonth ?? "none");
    const [error, setError] = useState<string | null>(null);
    const updateItem = useUpdateBudgetItem();

    const endOptions = isRecurring
        ? computeRecurringEndOptions(item.yearMonth, Number(frequencyMonths))
        : [];

    const submit = async () => {
        if (!name.trim() || !amount) return;
        setError(null);
        try {
            await updateItem.mutateAsync({
                id: item.id,
                name: name.trim(),
                amount: Number(amount),
                currency,
                categoryId: categoryId === "none" ? null : categoryId,
                isRecurring,
                frequencyMonths: isRecurring ? Number(frequencyMonths) : undefined,
                endsAtYearMonth:
                    isRecurring && endsAtYearMonth !== "none" ? endsAtYearMonth : null,
            });
            onDone();
        } catch (err) {
            setError(mutationErrorMessage(err));
        }
    };

    return (
        <div className="min-w-0 space-y-3">
            <p className="text-xs text-muted-foreground">
                Month: <span className="font-medium text-foreground">{monthLabel(item.yearMonth)}</span>
            </p>
            <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Item name"
            />
            <div className="flex min-w-0 gap-2">
                <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount"
                    step="0.01"
                    className="min-w-0 flex-1"
                />
                <Select
                    value={currency}
                    onValueChange={(v) => setCurrency(v as "NGN" | "USD")}
                    items={[...CURRENCY_ITEMS]}
                >
                    <SelectTrigger className="w-[5.5rem] shrink-0">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {CURRENCY_ITEMS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                                {c.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Select
                value={categoryId}
                onValueChange={(v) => setCategoryId(v ?? "none")}
                items={categorySelectItems(categories)}
            >
                <SelectTrigger className="w-full max-w-full">
                    <SelectValue placeholder="No category" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                            {c.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <div className="flex items-center gap-2 py-1">
                <Checkbox
                    id="edit-draft-expense-recurring"
                    checked={isRecurring}
                    onCheckedChange={(v) => setIsRecurring(v === true)}
                />
                <label
                    htmlFor="edit-draft-expense-recurring"
                    className="text-sm cursor-pointer select-none"
                >
                    Recurring
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
                        <SelectTrigger className="w-full max-w-full">
                            <SelectValue placeholder="No end date" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No end date</SelectItem>
                            {endOptions.map((ym) => (
                                <SelectItem key={ym} value={ym}>
                                    {monthLabel(ym)}
                                </SelectItem>
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
                    <SelectTrigger className="w-full max-w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {FREQUENCY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={onDone}>
                    Cancel
                </Button>
                <Button
                    type="button"
                    onClick={submit}
                    disabled={updateItem.isPending || !name.trim() || !amount}
                >
                    {updateItem.isPending ? "Saving…" : "Save changes"}
                </Button>
            </div>
        </div>
    );
}

function EditDraftIncomeForm({
    item,
    onDone,
}: {
    item: DraftIncome;
    onDone: () => void;
}) {
    const [label, setLabel] = useState(item.label ?? "");
    const [amount, setAmount] = useState(String(item.amount));
    const [currency, setCurrency] = useState<"NGN" | "USD">(item.currency as "NGN" | "USD");
    const [isRecurring, setIsRecurring] = useState(item.isRecurring ?? false);
    const [frequencyMonths, setFrequencyMonths] = useState(String(item.frequencyMonths ?? 1));
    const [endsAtYearMonth, setEndsAtYearMonth] = useState(item.endsAtYearMonth ?? "none");
    const [error, setError] = useState<string | null>(null);
    const updateTarget = useUpdateIncomeTarget();

    const endOptions = isRecurring
        ? computeRecurringEndOptions(item.yearMonth, Number(frequencyMonths))
        : [];

    const submit = async () => {
        if (!label.trim() || !amount) return;
        setError(null);
        try {
            await updateTarget.mutateAsync({
                id: item.id,
                label: label.trim(),
                amount: Number(amount),
                currency,
                isRecurring,
                frequencyMonths: isRecurring ? Number(frequencyMonths) : undefined,
                endsAtYearMonth:
                    isRecurring && endsAtYearMonth !== "none" ? endsAtYearMonth : null,
            });
            onDone();
        } catch (err) {
            setError(mutationErrorMessage(err));
        }
    };

    return (
        <div className="min-w-0 space-y-3">
            <p className="text-xs text-muted-foreground">
                Month: <span className="font-medium text-foreground">{monthLabel(item.yearMonth)}</span>
            </p>
            <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Source name</label>
                <Input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. Salary, Freelance"
                    maxLength={64}
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Target amount</label>
                <div className="flex min-w-0 gap-2">
                    <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Amount"
                        step="0.01"
                        className="min-w-0 flex-1"
                    />
                    <Select
                        value={currency}
                        onValueChange={(v) => setCurrency(v as "NGN" | "USD")}
                        items={[...CURRENCY_ITEMS]}
                    >
                        <SelectTrigger className="w-[5.5rem] shrink-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {CURRENCY_ITEMS.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                    {c.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="flex items-center gap-2 py-1">
                <Checkbox
                    id="edit-draft-income-recurring"
                    checked={isRecurring}
                    onCheckedChange={(v) => setIsRecurring(v === true)}
                />
                <label
                    htmlFor="edit-draft-income-recurring"
                    className="text-sm cursor-pointer select-none"
                >
                    Recurring
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
                        <SelectTrigger className="w-full max-w-full">
                            <SelectValue placeholder="No end date" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No end date</SelectItem>
                            {endOptions.map((ym) => (
                                <SelectItem key={ym} value={ym}>
                                    {monthLabel(ym)}
                                </SelectItem>
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
                    <SelectTrigger className="w-full max-w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {FREQUENCY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={onDone}>
                    Cancel
                </Button>
                <Button
                    type="button"
                    onClick={submit}
                    disabled={updateTarget.isPending || !label.trim() || !amount}
                >
                    {updateTarget.isPending ? "Saving…" : "Save changes"}
                </Button>
            </div>
        </div>
    );
}

function DraftExpenseForm({
    categories,
    onDone,
}: {
    categories: { id: string; name: string }[];
    onDone: () => void;
}) {
    const [yearMonth, setYearMonth] = useState(currMonth());
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [currency, setCurrency] = useState<"NGN" | "USD">("NGN");
    const [categoryId, setCategoryId] = useState("none");
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequencyMonths, setFrequencyMonths] = useState("1");
    const [endsAtYearMonth, setEndsAtYearMonth] = useState("none");
    const [error, setError] = useState<string | null>(null);
    const addItem = useAddBudgetItem();

    const endOptions = isRecurring
        ? computeRecurringEndOptions(yearMonth, Number(frequencyMonths))
        : [];

    const submit = async () => {
        if (!name.trim() || !amount) return;
        setError(null);
        try {
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
                isDraft: true,
            });
            onDone();
        } catch (err) {
            setError(mutationErrorMessage(err));
        }
    };

    return (
        <div className="min-w-0 space-y-3">
            <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Month</label>
                <MonthPicker value={yearMonth} onChange={setYearMonth} className="w-full" />
                <MonthStatusHint yearMonth={yearMonth} />
            </div>
            <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Item name"
            />
            <div className="flex min-w-0 gap-2">
                <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount"
                    step="0.01"
                    className="min-w-0 flex-1"
                />
                <Select
                    value={currency}
                    onValueChange={(v) => setCurrency(v as "NGN" | "USD")}
                    items={[...CURRENCY_ITEMS]}
                >
                    <SelectTrigger className="w-[5.5rem] shrink-0">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {CURRENCY_ITEMS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                                {c.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Select
                value={categoryId}
                onValueChange={(v) => setCategoryId(v ?? "none")}
                items={categorySelectItems(categories)}
            >
                <SelectTrigger className="w-full max-w-full">
                    <SelectValue placeholder="No category" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                            {c.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <div className="flex items-center gap-2 py-1">
                <Checkbox
                    id="draft-expense-recurring"
                    checked={isRecurring}
                    onCheckedChange={(v) => setIsRecurring(v === true)}
                />
                <label
                    htmlFor="draft-expense-recurring"
                    className="text-sm cursor-pointer select-none"
                >
                    Recurring
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
                        <SelectTrigger className="w-full max-w-full">
                            <SelectValue placeholder="No end date" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No end date</SelectItem>
                            {endOptions.map((ym) => (
                                <SelectItem key={ym} value={ym}>
                                    {monthLabel(ym)}
                                </SelectItem>
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
                    <SelectTrigger className="w-full max-w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {FREQUENCY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={onDone}>
                    Cancel
                </Button>
                <Button
                    type="button"
                    onClick={submit}
                    disabled={addItem.isPending || !name.trim() || !amount}
                >
                    {addItem.isPending ? "Saving…" : "Save draft"}
                </Button>
            </div>
        </div>
    );
}

function DraftIncomeForm({ onDone }: { onDone: () => void }) {
    const [yearMonth, setYearMonth] = useState(currMonth());
    const [label, setLabel] = useState("");
    const [amount, setAmount] = useState("");
    const [currency, setCurrency] = useState<"NGN" | "USD">("NGN");
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequencyMonths, setFrequencyMonths] = useState("1");
    const [endsAtYearMonth, setEndsAtYearMonth] = useState("none");
    const [error, setError] = useState<string | null>(null);
    const setTarget = useSetIncomeTarget();

    const endOptions = isRecurring
        ? computeRecurringEndOptions(yearMonth, Number(frequencyMonths))
        : [];

    const submit = async () => {
        if (!label.trim() || !amount) return;
        setError(null);
        try {
            await setTarget.mutateAsync({
                yearMonth,
                label: label.trim(),
                amount: Number(amount),
                currency,
                isRecurring: isRecurring || undefined,
                frequencyMonths: isRecurring ? Number(frequencyMonths) : undefined,
                endsAtYearMonth:
                    isRecurring && endsAtYearMonth !== "none" ? endsAtYearMonth : null,
                isDraft: true,
            });
            onDone();
        } catch (err) {
            setError(mutationErrorMessage(err));
        }
    };

    return (
        <div className="min-w-0 space-y-3">
            <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Month</label>
                <MonthPicker value={yearMonth} onChange={setYearMonth} className="w-full" />
                <MonthStatusHint yearMonth={yearMonth} />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Source name</label>
                <Input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. Salary, Freelance"
                    maxLength={64}
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Target amount</label>
                <div className="flex min-w-0 gap-2">
                    <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Amount"
                        step="0.01"
                        className="min-w-0 flex-1"
                    />
                    <Select
                        value={currency}
                        onValueChange={(v) => setCurrency(v as "NGN" | "USD")}
                        items={[...CURRENCY_ITEMS]}
                    >
                        <SelectTrigger className="w-[5.5rem] shrink-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {CURRENCY_ITEMS.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                    {c.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="flex items-center gap-2 py-1">
                <Checkbox
                    id="draft-income-recurring"
                    checked={isRecurring}
                    onCheckedChange={(v) => setIsRecurring(v === true)}
                />
                <label
                    htmlFor="draft-income-recurring"
                    className="text-sm cursor-pointer select-none"
                >
                    Recurring
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
                        <SelectTrigger className="w-full max-w-full">
                            <SelectValue placeholder="No end date" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No end date</SelectItem>
                            {endOptions.map((ym) => (
                                <SelectItem key={ym} value={ym}>
                                    {monthLabel(ym)}
                                </SelectItem>
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
                    <SelectTrigger className="w-full max-w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {FREQUENCY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={onDone}>
                    Cancel
                </Button>
                <Button
                    type="button"
                    onClick={submit}
                    disabled={setTarget.isPending || !label.trim() || !amount}
                >
                    {setTarget.isPending ? "Saving…" : "Save draft"}
                </Button>
            </div>
        </div>
    );
}

function DraftExpenseRow({
    name,
    amount,
    currency,
    yearMonth,
    category,
    pending,
    canFit,
    onEdit,
    onActivate,
    onDelete,
}: {
    name: string;
    amount: number;
    currency: string;
    yearMonth: string;
    category: string;
    pending: boolean;
    /** Unchecked net for this month is greater than this draft amount */
    canFit: boolean;
    onEdit: () => void;
    onActivate: () => void;
    onDelete: () => void;
}) {
    return (
        <div className="bg-muted/40 px-4 py-3.5 opacity-80 transition-colors">
            <div className="flex items-start gap-2">
                <div className="pt-0.5 shrink-0">
                    <div
                        className="size-5 rounded-[3px] border-2 border-dashed border-border bg-background"
                        title="Draft — activate to track"
                    />
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                            <span className="min-w-0 truncate text-sm font-medium block">
                                {name}
                            </span>
                        </div>
                        <span className="shrink-0 font-mono text-sm font-semibold tabular-nums leading-5">
                            {formatCurrency(amount, currency)}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="font-medium text-muted-foreground">Expense</span>
                        <span className="text-muted-foreground/50">·</span>
                        <span className="font-medium text-muted-foreground">Draft</span>
                        <span className="text-muted-foreground/50">·</span>
                        <span className="truncate text-muted-foreground">
                            {monthLabel(yearMonth)}
                        </span>
                        {canFit && (
                            <>
                                <span className="text-muted-foreground/50">·</span>
                                <span
                                    className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-1.5 py-0.5 font-medium text-success"
                                    title="Unchecked room covers this draft — safe to activate"
                                >
                                    <HugeiconsIcon
                                        icon={Tick02Icon}
                                        strokeWidth={2}
                                        className="size-3"
                                    />
                                    Fits
                                </span>
                            </>
                        )}
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
                                onClick={onEdit}
                                className={actionBtn}
                                title="Edit"
                                aria-label={`Edit ${name}`}
                            >
                                <HugeiconsIcon
                                    icon={Edit02Icon}
                                    strokeWidth={2}
                                    className="size-4"
                                />
                            </Button>
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
    onEdit,
    onActivate,
    onDelete,
}: {
    name: string;
    amount: number;
    currency: string;
    yearMonth: string;
    pending: boolean;
    onEdit: () => void;
    onActivate: () => void;
    onDelete: () => void;
}) {
    return (
        <div className="bg-muted/40 px-4 py-3.5 opacity-80 transition-colors">
            <div className="flex items-start gap-2">
                <div className="pt-0.5 shrink-0">
                    <div
                        className="size-5 rounded-[3px] border-2 border-dashed border-border bg-background"
                        title="Draft — activate to track"
                    />
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-start gap-2">
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
                                onClick={onEdit}
                                className={actionBtn}
                                title="Edit"
                                aria-label={`Edit ${name}`}
                            >
                                <HugeiconsIcon
                                    icon={Edit02Icon}
                                    strokeWidth={2}
                                    className="size-4"
                                />
                            </Button>
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
