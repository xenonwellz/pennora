import { ORPCError } from "@orpc/server";
import { monthsBetween, compareYearMonth } from "@expense/shared";
import { BaseService } from "./base.service";

export class IncomeService extends BaseService {
    async getMonthSummary(budgetId: string, yearMonth: string) {
        const target = await this.income.findTarget(budgetId, yearMonth);
        const entries = await this.income.findEntries(budgetId, yearMonth);

        const totalReceived = entries.reduce((acc, e) => acc + e.amount, 0);

        return target
            ? { ...target, entries, totalReceived }
            : null;
    }

    setTarget(
        budgetId: string,
        data: {
            yearMonth: string;
            amount: number;
            currency: string;
            label?: string;
            isRecurring?: boolean;
            frequencyMonths?: number;
            endsAtYearMonth?: string | null;
        },
    ) {
        return this.income.upsertTarget(budgetId, data);
    }

    async getTargetById(budgetId: string, targetId: string) {
        return this.income.findTargetById(budgetId, targetId);
    }

    async updateTarget(
        budgetId: string,
        targetId: string,
        data: {
            amount?: number;
            currency?: string;
            label?: string;
            isRecurring?: boolean;
            frequencyMonths?: number;
            endsAtYearMonth?: string | null;
            updateBase?: boolean;
        },
    ) {
        const current = await this.income.findTargetById(budgetId, targetId);
        if (!current) throw new ORPCError("NOT_FOUND", { message: "Income target not found" });

        const patch = {
            amount: data.amount,
            currency: data.currency,
            label: data.label,
            isRecurring: data.isRecurring,
            frequencyMonths: data.frequencyMonths,
            endsAtYearMonth: data.endsAtYearMonth,
        };
        const cleanPatch = Object.fromEntries(
            Object.entries(patch).filter(([, v]) => v !== undefined),
        );

        if (data.updateBase && current.isRecurring) {
            const templates = await this.income.findRecurringTemplates(budgetId);
            const template = templates.find(
                (t) => (t.label ?? "Income") === (current.label ?? "Income"),
            );
            const fromMonth = template?.yearMonth ?? current.yearMonth;
            await this.income.updateRecurringByLabel(
                budgetId,
                current.label ?? "Income",
                fromMonth,
                cleanPatch,
            );
            return this.income.findTarget(budgetId, current.yearMonth);
        }

        return this.income.updateTarget(targetId, cleanPatch);
    }

    async generateFromRecurring(budgetId: string, yearMonth: string) {
        const existing = await this.income.findTarget(budgetId, yearMonth);
        if (existing) return { created: 0 };

        const templates = await this.income.findRecurringTemplates(budgetId);
        const recurringTarget = templates[0];
        if (!recurringTarget) return { created: 0 };

        if (
            recurringTarget.endsAtYearMonth &&
            compareYearMonth(yearMonth, recurringTarget.endsAtYearMonth) > 0
        ) {
            return { created: 0 };
        }

        const monthsSinceStart = monthsBetween(recurringTarget.yearMonth, yearMonth);
        if (monthsSinceStart < 0 || monthsSinceStart % recurringTarget.frequencyMonths !== 0) {
            return { created: 0 };
        }

        await this.income.upsertTarget(budgetId, {
            yearMonth,
            amount: recurringTarget.amount,
            currency: recurringTarget.currency,
            label: recurringTarget.label ?? undefined,
            isRecurring: true,
            frequencyMonths: recurringTarget.frequencyMonths,
            endsAtYearMonth: recurringTarget.endsAtYearMonth,
        });

        return { created: 1 };
    }

    addEntry(budgetId: string, data: { incomeTargetId: string; yearMonth: string; amount: number; currency: string }) {
        return this.income.createEntry({ budgetId, ...data });
    }

    deleteEntry(entryId: string) {
        return this.income.deleteEntry(entryId);
    }
}
