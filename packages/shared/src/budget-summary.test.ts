import { describe, expect, test } from "bun:test";
import {
    clampPaidAmount,
    computeCheckedUncheckedNet,
    computeExpensePaidTotals,
    expensePaidAmount,
    expenseUnpaidAmount,
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

describe("computeCheckedUncheckedNet", () => {
    test("updates checked and unchecked nets with partial payments", () => {
        const result = computeCheckedUncheckedNet(
            [{ amount: 500_000, currency: "NGN", amountPaid: 100_000 }],
            [
                {
                    amount: 260_000,
                    currency: "NGN",
                    totalReceived: 260_000,
                    entries: [{ amount: 260_000, currency: "NGN" }],
                },
            ],
            1,
        );

        expect(result.paidExpenses).toBe(100_000);
        expect(result.unpaidExpenses).toBe(400_000);
        expect(result.incomeReceived).toBe(260_000);
        expect(result.incomeOpen).toBe(0);
        expect(result.checkedNet).toBe(160_000);
        expect(result.uncheckedNet).toBe(-400_000);
    });
});

describe("expenseUnpaidAmount", () => {
    test("returns remaining balance", () => {
        expect(
            expenseUnpaidAmount({ amount: 500_000, currency: "NGN", amountPaid: 100_000 }),
        ).toBe(400_000);
    });
});
