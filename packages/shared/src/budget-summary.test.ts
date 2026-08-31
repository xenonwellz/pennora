import { describe, expect, test } from "bun:test";
import {
    clampPaidAmount,
    computeBudgetMonthSummary,
    computeExpensePaidTotals,
    expensePaidAmount,
    expenseUnpaidAmount,
    normalizeExpenseSummaryItem,
} from "./budget-summary";

describe("clampPaidAmount", () => {
    test("adds within remaining balance", () => {
        expect(clampPaidAmount(500_000, 100_000, 50_000)).toBe(150_000);
    });

    test("cannot exceed item total", () => {
        expect(clampPaidAmount(500_000, 450_000, 100_000)).toBe(500_000);
    });

    test("cannot go below zero", () => {
        expect(clampPaidAmount(500_000, 50_000, -100_000)).toBe(0);
    });

    test("subtract reduces paid amount", () => {
        expect(clampPaidAmount(500_000, 200_000, -50_000)).toBe(150_000);
    });
});

describe("expensePaidAmount", () => {
    test("uses amountPaid when set", () => {
        expect(expensePaidAmount({ amount: 500_000, currency: "NGN", amountPaid: 100_000 })).toBe(
            100_000,
        );
    });

    test("falls back to paid boolean for legacy rows", () => {
        expect(expensePaidAmount({ amount: 500_000, currency: "NGN", paid: true })).toBe(500_000);
        expect(expensePaidAmount({ amount: 500_000, currency: "NGN", paid: false })).toBe(0);
    });

    test("paid=true with amountPaid=0 uses full amount (API default)", () => {
        expect(
            expensePaidAmount({ amount: 500_000, currency: "NGN", paid: true, amountPaid: 0 }),
        ).toBe(500_000);
    });

    test("partial amountPaid is used when not fully paid", () => {
        expect(
            expensePaidAmount({ amount: 500_000, currency: "NGN", paid: false, amountPaid: 50_000 }),
        ).toBe(50_000);
    });

    test("caps amountPaid at item total", () => {
        expect(
            expensePaidAmount({ amount: 500_000, currency: "NGN", amountPaid: 600_000 }),
        ).toBe(500_000);
    });
});

describe("computeExpensePaidTotals", () => {
    test("splits paid and unpaid using partial amounts", () => {
        const items = [
            { amount: 500_000, currency: "NGN", amountPaid: 100_000 },
            { amount: 300_000, currency: "NGN", amountPaid: 0 },
            { amount: 200_000, currency: "NGN", amountPaid: 200_000 },
        ];
        const totals = computeExpensePaidTotals(items, 1);
        expect(totals.totalExpenses).toBe(1_000_000);
        expect(totals.paidExpenses).toBe(300_000);
        expect(totals.unpaidExpenses).toBe(700_000);
    });

    test("excludes drafts", () => {
        const items = [
            { amount: 500_000, currency: "NGN", amountPaid: 500_000, isDraft: true },
            { amount: 100_000, currency: "NGN", amountPaid: 40_000 },
        ];
        const totals = computeExpensePaidTotals(items, 1);
        expect(totals.totalExpenses).toBe(100_000);
        expect(totals.paidExpenses).toBe(40_000);
        expect(totals.unpaidExpenses).toBe(60_000);
    });
});

describe("computeBudgetMonthSummary", () => {
    test("returns planned totals, actuals, and reserve", () => {
        const result = computeBudgetMonthSummary(
            [
                { amount: 500_000, currency: "NGN", amountPaid: 100_000 },
                { amount: 300_000, currency: "NGN", amountPaid: 0 },
            ],
            [
                {
                    amount: 1_000_000,
                    currency: "NGN",
                    totalReceived: 260_000,
                    entries: [{ amount: 260_000, currency: "NGN" }],
                },
            ],
            1,
        );

        expect(result.totalExpenses).toBe(800_000);
        expect(result.plannedExpenses).toBe(800_000);
        expect(result.paid).toBe(100_000);
        expect(result.recordedIncome).toBe(260_000);
        expect(result.plannedIncome).toBe(1_000_000);
        expect(result.reserve).toBe(200_000);
        expect(result.actualReserve).toBe(160_000);
        expect(result.remainingRoom).toBe(40_000);
    });

    test("partial payment increases paid without changing planned totals", () => {
        const before = computeBudgetMonthSummary(
            [{ amount: 500_000, currency: "NGN", paid: false, amountPaid: 0 }],
            [{ amount: 1_000_000, currency: "NGN", totalReceived: 0, entries: [] }],
            1,
        );
        const after = computeBudgetMonthSummary(
            [{ amount: 500_000, currency: "NGN", paid: false, amountPaid: 50_000 }],
            [{ amount: 1_000_000, currency: "NGN", totalReceived: 0, entries: [] }],
            1,
        );

        expect(after.paid - before.paid).toBe(50_000);
        expect(before.totalExpenses - after.totalExpenses).toBe(0);
        expect(before.plannedIncome).toBe(after.plannedIncome);
        expect(before.reserve).toBe(after.reserve);
        expect(after.remainingRoom - before.remainingRoom).toBe(50_000);
    });

    test("normalizes API rows with paid=true and amountPaid=0", () => {
        const result = computeBudgetMonthSummary(
            [{ amount: 500_000, currency: "NGN", paid: true, amountPaid: 0 }],
            [],
            1,
        );
        expect(result.paid).toBe(500_000);
        expect(result.totalExpenses).toBe(500_000);
    });

    test("excludes draft expense items from totals", () => {
        const result = computeBudgetMonthSummary(
            [
                { amount: 500_000, currency: "NGN", amountPaid: 500_000, isDraft: true },
                { amount: 100_000, currency: "NGN", amountPaid: 25_000 },
            ],
            [],
            1,
        );
        expect(result.totalExpenses).toBe(100_000);
        expect(result.paid).toBe(25_000);
        expect(result.plannedIncome).toBe(0);
    });
});

describe("normalizeExpenseSummaryItem", () => {
    test("coerces snake_case amount_paid", () => {
        const normalized = normalizeExpenseSummaryItem({
            amount: 500_000,
            currency: "NGN",
            amount_paid: 75_000,
        });
        expect(normalized.amountPaid).toBe(75_000);
    });
});

describe("expenseUnpaidAmount", () => {
    test("returns remaining balance", () => {
        expect(
            expenseUnpaidAmount({ amount: 500_000, currency: "NGN", amountPaid: 100_000 }),
        ).toBe(400_000);
    });
});
