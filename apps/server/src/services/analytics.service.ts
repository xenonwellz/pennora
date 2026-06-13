import { ORPCError } from "@orpc/server";
import { toNgn, type Currency, yearMonthRange, yearToRange, compareYearMonth } from "@expense/shared";
import { BaseService } from "./base.service";

type RateInfo = { usdBuyRate: number };

type PeriodParams = {
    year?: number;
    startYearMonth?: string;
    endYearMonth?: string;
    allTime?: boolean;
};

export class AnalyticsService extends BaseService {
    private async getRates(budgetId: string, yearMonth: string): Promise<RateInfo> {
        const rate = await this.rates.findByBudgetAndMonth(budgetId, yearMonth);
        if (rate) return { usdBuyRate: rate.usdBuyRate };
        const latest = await this.rates.findLatest(budgetId);
        return { usdBuyRate: latest?.usdBuyRate ?? 1 };
    }

    private async resolvePeriodRange(
        budgetId: string,
        params: PeriodParams,
    ): Promise<{ startYearMonth: string; endYearMonth: string }> {
        if (params.allTime) {
            const items = await this.budgetItems.findInRange(budgetId, "0000-01", "9999-12");
            const entries = await this.income.findEntriesInRange(budgetId, "0000-01", "9999-12");
            const targets = await this.income.findTargetsInRange(budgetId, "0000-01", "9999-12");
            const months = [
                ...items.map((i) => i.yearMonth),
                ...entries.map((e) => e.yearMonth),
                ...targets.map((t) => t.yearMonth),
            ].sort();
            if (months.length === 0) {
                const y = new Date().getFullYear();
                return yearToRange(y);
            }
            return { startYearMonth: months[0]!, endYearMonth: months[months.length - 1]! };
        }
        if (params.year) return yearToRange(params.year);
        if (params.startYearMonth && params.endYearMonth) {
            return { startYearMonth: params.startYearMonth, endYearMonth: params.endYearMonth };
        }
        throw new ORPCError("BAD_REQUEST", { message: "Provide year, date range, or allTime." });
    }

    async getMonthBreakdown(budgetId: string, yearMonth: string) {
        const rates = await this.getRates(budgetId, yearMonth);
        const items = await this.budgetItems.findByMonth(budgetId, yearMonth);
        const incomeTarget = await this.income.findTarget(budgetId, yearMonth);
        const incomeEntries = await this.income.findEntries(budgetId, yearMonth);

        const categoryMap = new Map<
            string,
            {
                categoryId: string | null;
                name: string;
                totalNgn: number;
                itemCount: number;
                items: Array<{
                    id: string;
                    name: string;
                    amount: number;
                    currency: string;
                    amountNgn: number;
                    paid: boolean;
                    yearMonth: string;
                }>;
            }
        >();

        for (const item of items) {
            const catId = item.categoryId ?? "uncategorized";
            const catName = item.category?.name ?? "Uncategorized";
            const amountNgn = toNgn(item.amount, item.currency as Currency, rates);

            const existing = categoryMap.get(catId) ?? {
                categoryId: item.categoryId,
                name: catName,
                totalNgn: 0,
                itemCount: 0,
                items: [],
            };

            existing.totalNgn += amountNgn;
            existing.itemCount += 1;
            existing.items.push({
                id: item.id,
                name: item.name,
                amount: item.amount,
                currency: item.currency,
                amountNgn,
                paid: item.paid,
                yearMonth: item.yearMonth,
            });
            categoryMap.set(catId, existing);
        }

        const expenses = [...categoryMap.values()].sort((a, b) => b.totalNgn - a.totalNgn);
        const totalExpensesNgn = expenses.reduce((s, c) => s + c.totalNgn, 0);

        const incomeGroups: Array<{
            label: string;
            totalNgn: number;
            targetNgn: number;
            receivedNgn: number;
        }> = [];

        if (incomeTarget) {
            const targetNgn = toNgn(incomeTarget.amount, incomeTarget.currency as Currency, rates);
            const receivedNgn = incomeEntries.reduce(
                (s, e) => s + toNgn(e.amount, e.currency as Currency, rates),
                0,
            );
            incomeGroups.push({
                label: incomeTarget.label ?? "Income",
                totalNgn: targetNgn,
                targetNgn,
                receivedNgn,
            });
        }

        const totalIncomeNgn = incomeGroups.reduce((s, g) => s + g.receivedNgn, 0);
        const totalIncomeTargetNgn = incomeGroups.reduce((s, g) => s + g.targetNgn, 0);

        return {
            expenses,
            income: incomeGroups,
            totalExpensesNgn,
            totalIncomeNgn,
            totalIncomeTargetNgn,
        };
    }

    async getPeriodSummary(budgetId: string, params: PeriodParams) {
        const { startYearMonth, endYearMonth } = await this.resolvePeriodRange(budgetId, params);
        const months = yearMonthRange(startYearMonth, endYearMonth);

        const categoryMap = new Map<string, { name: string; value: number; itemCount: number }>();
        let totalIncomeNgn = 0;
        let totalIncomeTargetNgn = 0;
        let totalExpensesNgn = 0;
        let paidExpensesNgn = 0;
        let unpaidExpensesNgn = 0;
        let paidCount = 0;
        let unpaidCount = 0;
        const monthlyTrend: Array<{ yearMonth: string; income: number; expenses: number }> = [];
        const allItems: Array<{
            id: string;
            name: string;
            categoryName: string;
            amountNgn: number;
            paid: boolean;
            yearMonth: string;
        }> = [];

        for (const ym of months) {
            const breakdown = await this.getMonthBreakdown(budgetId, ym);
            totalIncomeNgn += breakdown.totalIncomeNgn;
            totalIncomeTargetNgn += breakdown.totalIncomeTargetNgn;
            totalExpensesNgn += breakdown.totalExpensesNgn;
            monthlyTrend.push({
                yearMonth: ym,
                income: breakdown.totalIncomeNgn,
                expenses: breakdown.totalExpensesNgn,
            });

            for (const cat of breakdown.expenses) {
                const key = cat.categoryId ?? "uncategorized";
                const existing = categoryMap.get(key) ?? {
                    name: cat.name,
                    value: 0,
                    itemCount: 0,
                };
                existing.value += cat.totalNgn;
                existing.itemCount += cat.itemCount;
                categoryMap.set(key, existing);

                for (const item of cat.items) {
                    allItems.push({
                        id: item.id,
                        name: item.name,
                        categoryName: cat.name,
                        amountNgn: item.amountNgn,
                        paid: item.paid,
                        yearMonth: item.yearMonth,
                    });
                    if (item.paid) {
                        paidExpensesNgn += item.amountNgn;
                        paidCount += 1;
                    } else {
                        unpaidExpensesNgn += item.amountNgn;
                        unpaidCount += 1;
                    }
                }
            }
        }

        const categoryChart = [...categoryMap.entries()]
            .map(([categoryId, c]) => ({
                categoryId: categoryId === "uncategorized" ? null : categoryId,
                name: c.name,
                value: c.value,
                itemCount: c.itemCount,
            }))
            .sort((a, b) => b.value - a.value);

        const topItems = allItems.sort((a, b) => b.amountNgn - a.amountNgn).slice(0, 5);

        return {
            startYearMonth,
            endYearMonth,
            incomeNgn: totalIncomeNgn,
            incomeTargetNgn: totalIncomeTargetNgn,
            expensesNgn: totalExpensesNgn,
            remainingNgn: totalIncomeNgn - totalExpensesNgn,
            paidExpensesNgn,
            unpaidExpensesNgn,
            paidCount,
            unpaidCount,
            categoryChart,
            monthlyTrend,
            topItems,
            monthCount: months.length,
        };
    }

    async getPeriodCategoryBreakdown(
        budgetId: string,
        params: PeriodParams & { categoryId?: string | null },
    ) {
        const summary = await this.getPeriodSummary(budgetId, params);
        const items = await this.budgetItems.findInRange(
            budgetId,
            summary.startYearMonth,
            summary.endYearMonth,
        );

        const catKey = params.categoryId ?? "uncategorized";
        const filtered = items.filter((item) => {
            const key = item.categoryId ?? "uncategorized";
            return key === catKey;
        });

        const rows: Array<{
            id: string;
            name: string;
            amountNgn: number;
            paid: boolean;
            yearMonth: string;
        }> = [];

        let totalNgn = 0;
        for (const item of filtered) {
            const rates = await this.getRates(budgetId, item.yearMonth);
            const amountNgn = toNgn(item.amount, item.currency as Currency, rates);
            totalNgn += amountNgn;
            rows.push({
                id: item.id,
                name: item.name,
                amountNgn,
                paid: item.paid,
                yearMonth: item.yearMonth,
            });
        }

        const categoryName =
            filtered[0]?.category?.name ??
            (catKey === "uncategorized" ? "Uncategorized" : "Category");

        return {
            categoryId: params.categoryId ?? null,
            categoryName,
            totalNgn,
            items: rows.sort((a, b) => compareYearMonth(b.yearMonth, a.yearMonth)),
            startYearMonth: summary.startYearMonth,
            endYearMonth: summary.endYearMonth,
        };
    }

    async getMonthAnalysis(budgetId: string, yearMonth: string) {
        const month = await this.budgetMonths.find(budgetId, yearMonth);
        if (!month || month.status !== "completed") {
            throw new ORPCError("BAD_REQUEST", { message: "Analysis only available for completed months." });
        }

        const breakdown = await this.getMonthBreakdown(budgetId, yearMonth);
        const items = await this.budgetItems.findByMonth(budgetId, yearMonth);
        const rates = await this.getRates(budgetId, yearMonth);

        const paidItems = items.filter((i) => i.paid);
        const unpaidItems = items.filter((i) => !i.paid);

        const paidExpensesNgn = paidItems.reduce(
            (s, i) => s + toNgn(i.amount, i.currency as Currency, rates),
            0,
        );
        const unpaidExpensesNgn = unpaidItems.reduce(
            (s, i) => s + toNgn(i.amount, i.currency as Currency, rates),
            0,
        );
        const plannedExpensesNgn = breakdown.totalExpensesNgn;
        const incomeReceivedNgn = breakdown.totalIncomeNgn;

        const topCategories = breakdown.expenses.slice(0, 5).map((c) => ({
            name: c.name,
            totalNgn: c.totalNgn,
            itemCount: c.itemCount,
        }));

        const allItems = breakdown.expenses.flatMap((c) =>
            c.items.map((i) => ({ ...i, categoryName: c.name })),
        );
        const topItems = allItems
            .sort((a, b) => b.amountNgn - a.amountNgn)
            .slice(0, 5)
            .map((i) => ({
                id: i.id,
                name: i.name,
                categoryName: i.categoryName,
                amountNgn: i.amountNgn,
                paid: i.paid,
            }));

        const defaultedItems = unpaidItems.map((i) => ({
            id: i.id,
            name: i.name,
            amountNgn: toNgn(i.amount, i.currency as Currency, rates),
            categoryName: i.category?.name ?? "Uncategorized",
        }));

        const defaultedByCategoryMap = new Map<string, { name: string; totalNgn: number; count: number }>();
        for (const item of defaultedItems) {
            const existing = defaultedByCategoryMap.get(item.categoryName) ?? {
                name: item.categoryName,
                totalNgn: 0,
                count: 0,
            };
            existing.totalNgn += item.amountNgn;
            existing.count += 1;
            defaultedByCategoryMap.set(item.categoryName, existing);
        }
        const defaultedByCategory = [...defaultedByCategoryMap.values()].sort(
            (a, b) => b.totalNgn - a.totalNgn,
        );

        return {
            incomeReceivedNgn,
            plannedExpensesNgn,
            paidExpensesNgn,
            unpaidExpensesNgn,
            unpaidCount: unpaidItems.length,
            leftoverAfterBills: incomeReceivedNgn - paidExpensesNgn,
            leftoverAfterPlan: incomeReceivedNgn - plannedExpensesNgn,
            topCategories,
            topItems,
            defaultedItems,
            defaultedByCategory,
        };
    }

    async getDashboardSummary(budgetId: string, yearMonth: string) {
        const month = await this.budgetMonths.find(budgetId, yearMonth);
        const breakdown = await this.getMonthBreakdown(budgetId, yearMonth);
        const items = await this.budgetItems.findByMonth(budgetId, yearMonth);
        const rates = await this.getRates(budgetId, yearMonth);

        const status = (month?.status ?? "uninitialized") as "uninitialized" | "planning" | "completed";

        const paidExpensesNgn = items
            .filter((i) => i.paid)
            .reduce((s, i) => s + toNgn(i.amount, i.currency as Currency, rates), 0);
        const unpaidExpensesNgn = items
            .filter((i) => !i.paid)
            .reduce((s, i) => s + toNgn(i.amount, i.currency as Currency, rates), 0);

        const paidCount = items.filter((i) => i.paid).length;
        const unpaidCount = items.filter((i) => !i.paid).length;
        const defaultedCount = status === "completed" ? unpaidCount : 0;

        const categoryChart = breakdown.expenses.map((c) => ({
            categoryId: c.categoryId,
            name: c.name,
            value: c.totalNgn,
            itemCount: c.itemCount,
        }));

        const topItems = breakdown.expenses
            .flatMap((c) => c.items.map((i) => ({ ...i, categoryName: c.name })))
            .sort((a, b) => b.amountNgn - a.amountNgn)
            .slice(0, 5);

        return {
            status,
            incomeNgn: breakdown.totalIncomeNgn,
            incomeTargetNgn: breakdown.totalIncomeTargetNgn,
            expensesNgn: breakdown.totalExpensesNgn,
            remainingNgn: breakdown.totalIncomeNgn - breakdown.totalExpensesNgn,
            paidExpensesNgn,
            unpaidExpensesNgn,
            paidCount,
            unpaidCount,
            defaultedCount,
            categoryChart,
            topItems,
        };
    }
}
