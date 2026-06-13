import { ORPCError } from "@orpc/server";
import type { BudgetMonthStatus } from "@expense/shared";
import { BaseService } from "./base.service";

function addMonths(yearMonth: string, months: number): string {
    const [y, m] = yearMonth.split("-").map(Number);
    const date = new Date(y!, m! - 1, 1);
    date.setMonth(date.getMonth() + months);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export class MonthService extends BaseService {
    async getMonthStatus(budgetId: string, yearMonth: string) {
        const month = await this.budgetMonths.find(budgetId, yearMonth);
        const rate = await this.rates.findByBudgetAndMonth(budgetId, yearMonth);

        return {
            status: (month?.status ?? "uninitialized") as BudgetMonthStatus,
            startedAt: month?.startedAt ?? null,
            completedAt: month?.completedAt ?? null,
            hasRates: !!rate,
        };
    }

    async requirePlanning(budgetId: string, yearMonth: string) {
        const month = await this.budgetMonths.find(budgetId, yearMonth);
        if (!month || month.status !== "planning") {
            const status = month?.status ?? "uninitialized";
            throw new ORPCError("BAD_REQUEST", {
                message:
                    status === "completed"
                        ? "Month is completed and locked."
                        : "Start a plan for this month first.",
            });
        }
    }

    async startPlan(budgetId: string, yearMonth: string, carryOverItemIds?: string[]) {
        const existing = await this.budgetMonths.find(budgetId, yearMonth);
        if (existing?.status === "planning") {
            throw new ORPCError("BAD_REQUEST", { message: "Month is already in planning." });
        }
        if (existing?.status === "completed") {
            throw new ORPCError("BAD_REQUEST", { message: "Month is already completed." });
        }

        const hasRate = await this.rates.findByBudgetAndMonth(budgetId, yearMonth);
        if (!hasRate) {
            const latest = await this.rates.findLatest(budgetId);
            if (latest) {
                await this.rates.upsert(budgetId, {
                    yearMonth,
                    usdBuyRate: latest.usdBuyRate,
                    usdSellRate: latest.usdSellRate,
                });
            }
        }

        const expensesCreated = await this.seedRecurringExpenses(budgetId, yearMonth);
        const incomeCreated = await this.seedRecurringIncome(budgetId, yearMonth);
        const carriedOver =
            carryOverItemIds && carryOverItemIds.length > 0
                ? await this.carryOverOneOffItems(budgetId, yearMonth, carryOverItemIds)
                : 0;

        await this.budgetMonths.upsert(budgetId, yearMonth, {
            status: "planning",
            startedAt: new Date(),
            completedAt: null,
        });

        return { expensesCreated, incomeCreated, carriedOver };
    }

    private async carryOverOneOffItems(
        budgetId: string,
        yearMonth: string,
        itemIds: string[],
    ) {
        const prevYearMonth = addMonths(yearMonth, -1);
        const prevItems = await this.budgetItems.findByMonth(budgetId, prevYearMonth);
        const existing = await this.budgetItems.findByMonth(budgetId, yearMonth);
        const existingNames = new Set(existing.map((e) => e.name));

        const toCopy = prevItems.filter(
            (item) => !item.isRecurring && itemIds.includes(item.id) && !existingNames.has(item.name),
        );

        if (toCopy.length === 0) return 0;

        await this.budgetItems.createMany(
            toCopy.map((item) => ({
                budgetId,
                yearMonth,
                name: item.name,
                amount: item.amount,
                currency: item.currency,
                categoryId: item.categoryId,
                isRecurring: false,
            })),
        );

        return toCopy.length;
    }

    async completeMonth(budgetId: string, yearMonth: string) {
        const existing = await this.budgetMonths.find(budgetId, yearMonth);
        if (!existing || existing.status !== "planning") {
            throw new ORPCError("BAD_REQUEST", { message: "Month must be in planning status to complete." });
        }

        const result = await this.budgetMonths.complete(budgetId, yearMonth);
        return result;
    }

    private async seedRecurringExpenses(budgetId: string, yearMonth: string) {
        const recurringItems = await this.budgetItems.findRecurring(budgetId);
        const existing = await this.budgetItems.findByMonth(budgetId, yearMonth);
        const existingNames = new Set(existing.map((e) => e.name));

        const toCreate = recurringItems.filter((item) => {
            if (existingNames.has(item.name)) return false;
            const monthsSinceStart = this.monthsBetween(item.yearMonth, yearMonth);
            return monthsSinceStart >= 0 && monthsSinceStart % item.frequencyMonths === 0;
        });

        if (toCreate.length === 0) return 0;

        await this.budgetItems.createMany(
            toCreate.map((t) => ({
                budgetId,
                yearMonth,
                name: t.name,
                amount: t.amount,
                currency: t.currency,
                categoryId: t.categoryId,
                isRecurring: true,
                frequencyMonths: t.frequencyMonths,
            })),
        );

        return toCreate.length;
    }

    private async seedRecurringIncome(budgetId: string, yearMonth: string) {
        const existing = await this.income.findTarget(budgetId, yearMonth);
        if (existing) return 0;

        const recurringTarget = await this.income.findRecurring(budgetId);
        if (!recurringTarget) return 0;

        const monthsSinceStart = this.monthsBetween(recurringTarget.yearMonth, yearMonth);
        if (monthsSinceStart < 0 || monthsSinceStart % recurringTarget.frequencyMonths !== 0) {
            return 0;
        }

        await this.income.upsertTarget(budgetId, {
            yearMonth,
            amount: recurringTarget.amount,
            currency: recurringTarget.currency,
            label: recurringTarget.label ?? undefined,
            isRecurring: true,
            frequencyMonths: recurringTarget.frequencyMonths,
        });

        return 1;
    }

    private monthsBetween(ym1: string, ym2: string): number {
        const [y1, m1] = ym1.split("-").map(Number);
        const [y2, m2] = ym2.split("-").map(Number);
        return (y2! - y1!) * 12 + (m2! - m1!);
    }
}

export { addMonths };
