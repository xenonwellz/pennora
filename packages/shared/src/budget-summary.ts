import { toNgn, type Currency } from "./index";

export type ExpenseSummaryItem = {
    amount: number;
    currency: string;
    amountPaid?: number;
    paid?: boolean;
    isDraft?: boolean;
};

export type IncomeSummaryTarget = {
    amount: number;
    currency: string;
    totalReceived?: number;
    entries?: { amount: number; currency: string }[];
};

/** Coerce API/DB shapes into a consistent expense summary item. */
export function normalizeExpenseSummaryItem(
    item: ExpenseSummaryItem & { amount_paid?: number },
): ExpenseSummaryItem {
    const rawPaid = item.amountPaid ?? item.amount_paid ?? 0;
    const amountPaid = item.paid ? item.amount : rawPaid;
    const capped = Math.min(Math.max(0, amountPaid), item.amount);
    return {
        ...item,
        amountPaid: capped,
        paid: item.paid === true || capped >= item.amount,
    };
}

export function expensePaidAmount(item: ExpenseSummaryItem): number {
    const normalized = normalizeExpenseSummaryItem(item);
    if (normalized.isDraft) return 0;
    if (normalized.paid) return normalized.amount;
    return normalized.amountPaid ?? 0;
}

export function expenseUnpaidAmount(item: ExpenseSummaryItem): number {
    if (item.isDraft) return 0;
    return Math.max(0, item.amount - expensePaidAmount(item));
}

export function clampPaidAmount(amount: number, amountPaid: number, delta: number): number {
    const next = amountPaid + delta;
    if (next < 0) return 0;
    if (next > amount) return amount;
    return next;
}

export function computeExpensePaidTotals(
    items: ExpenseSummaryItem[],
    usdBuyRate: number,
): { totalExpenses: number; paidExpenses: number; unpaidExpenses: number } {
    const active = items.filter((i) => !i.isDraft);
    let totalExpenses = 0;
    let paidExpenses = 0;

    for (const item of active) {
        const normalized = normalizeExpenseSummaryItem(item);
        const totalNgn = toNgn(normalized.amount, normalized.currency as Currency, { usdBuyRate });
        const paidNgn = toNgn(expensePaidAmount(normalized), normalized.currency as Currency, {
            usdBuyRate,
        });
        totalExpenses += totalNgn;
        paidExpenses += paidNgn;
    }

    return {
        totalExpenses,
        paidExpenses,
        unpaidExpenses: totalExpenses - paidExpenses,
    };
}

export function computeIncomeReceived(
    incomes: IncomeSummaryTarget[],
    usdBuyRate: number,
): { incomeAmount: number; incomeReceived: number; incomeOpen: number } {
    const incomeAmount = incomes.reduce(
        (sum, t) => sum + toNgn(t.amount, t.currency as Currency, { usdBuyRate }),
        0,
    );
    const incomeReceived = incomes.reduce((sum, t) => {
        const fromEntries = (t.entries ?? []).reduce(
            (s, e) => s + toNgn(e.amount, e.currency as Currency, { usdBuyRate }),
            0,
        );
        return (
            sum +
            (t.entries?.length
                ? fromEntries
                : toNgn(t.totalReceived ?? 0, t.currency as Currency, { usdBuyRate }))
        );
    }, 0);
    const incomeOpen = Math.max(0, incomeAmount - incomeReceived);
    return { incomeAmount, incomeReceived, incomeOpen };
}

export type BudgetMonthSummary = {
    /** Planned expense total for the month (active items, non-draft). */
    totalExpenses: number;
    /** Sum of amount paid so far, including partials. */
    paid: number;
    /** Income actually received / logged. */
    recordedIncome: number;
    /** Planned income total for the month. */
    plannedIncome: number;
    /** Planned expense total (same as totalExpenses). */
    plannedExpenses: number;
    /** Planned income minus planned expenses — target leftover. */
    reserve: number;
    /** Room for more unpaid spend: open income − unpaid expenses (draft-fit helper). */
    remainingRoom: number;
};

export function computeBudgetMonthSummary(
    items: ExpenseSummaryItem[],
    incomes: IncomeSummaryTarget[],
    usdBuyRate: number,
): BudgetMonthSummary {
    const normalizedItems = items.map((item) => normalizeExpenseSummaryItem(item));
    const expenseTotals = computeExpensePaidTotals(normalizedItems, usdBuyRate);
    const incomeTotals = computeIncomeReceived(incomes, usdBuyRate);

    const plannedIncome = incomeTotals.incomeAmount;
    const plannedExpenses = expenseTotals.totalExpenses;
    const reserve = plannedIncome - plannedExpenses;
    const remainingRoom = incomeTotals.incomeOpen - expenseTotals.unpaidExpenses;

    return {
        totalExpenses: plannedExpenses,
        paid: expenseTotals.paidExpenses,
        recordedIncome: incomeTotals.incomeReceived,
        plannedIncome,
        plannedExpenses,
        reserve,
        remainingRoom,
    };
}

/** @deprecated Use computeBudgetMonthSummary */
export function computeCheckedUncheckedNet(
    items: ExpenseSummaryItem[],
    incomes: IncomeSummaryTarget[],
    usdBuyRate: number,
) {
    const summary = computeBudgetMonthSummary(items, incomes, usdBuyRate);
    return {
        totalExpenses: summary.totalExpenses,
        paidExpenses: summary.paid,
        unpaidExpenses: summary.totalExpenses - summary.paid,
        incomeAmount: summary.plannedIncome,
        incomeReceived: summary.recordedIncome,
        incomeOpen: summary.plannedIncome - summary.recordedIncome,
        checkedNet: summary.recordedIncome - summary.paid,
        uncheckedNet: summary.remainingRoom,
    };
}
