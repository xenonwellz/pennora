export const CURRENCIES = ["NGN", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const EXPENSE_TYPES = ["recurring", "one_off"] as const;
export type ExpenseType = (typeof EXPENSE_TYPES)[number];

export const BUDGET_MONTH_STATUSES = ["uninitialized", "planning", "completed"] as const;
export type BudgetMonthStatus = (typeof BUDGET_MONTH_STATUSES)[number];

export function isCurrency(v: string): v is Currency {
    return CURRENCIES.includes(v as Currency);
}

export function toNgn(amount: number, currency: Currency, rates: { usdBuyRate: number }): number {
    if (currency === "NGN") return amount;
    return amount * rates.usdBuyRate;
}

export {
    addMonths,
    compareYearMonth,
    monthsBetween,
    yearMonthRange,
    yearToRange,
    computeRecurringEndOptions,
    monthLabel,
    currMonth,
    currYear,
} from "./year-month";
