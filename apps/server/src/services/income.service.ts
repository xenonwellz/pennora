import { ORPCError } from "@orpc/server";
import { monthsBetween, compareYearMonth } from "@expense/shared";
import { BaseService } from "./base.service";

export class IncomeService extends BaseService {
    async getMonthSummaries(budgetId: string, yearMonth: string) {
        const targets = await this.income.findTargets(budgetId, yearMonth);
        const entries = await this.income.findEntries(budgetId, yearMonth);

        // Active (non-draft) earnings for the month view
        return targets
            .filter((target) => !target.isDraft)
            .map((target) => {
                const targetEntries = entries.filter((e) => e.incomeTargetId === target.id);
                const totalReceived = targetEntries.reduce((acc, e) => acc + e.amount, 0);
                return { ...target, entries: targetEntries, totalReceived };
            });
    }

    listDrafts(budgetId: string) {
        return this.income.findDrafts(budgetId);
    }

    async setDraft(budgetId: string, targetId: string, isDraft: boolean) {
        const current = await this.income.findTargetById(budgetId, targetId);
        if (!current) throw new ORPCError("NOT_FOUND", { message: "Income target not found" });
        return this.income.setDraft(targetId, isDraft);
    }

    createTarget(
        budgetId: string,
        data: {
            yearMonth: string;
            amount: number;
            currency: string;
            label?: string;
            isRecurring?: boolean;
            frequencyMonths?: number;
            endsAtYearMonth?: string | null;
            isDraft?: boolean;
        },
    ) {
        return this.income.createTarget(budgetId, data);
    }

    /** @deprecated alias — always creates a new target (multi-income) */
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
        return this.createTarget(budgetId, data);
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
            return this.income.findTargetById(budgetId, targetId);
        }

        return this.income.updateTarget(targetId, cleanPatch);
    }

    async deleteTarget(budgetId: string, targetId: string) {
        const current = await this.income.findTargetById(budgetId, targetId);
        if (!current) throw new ORPCError("NOT_FOUND", { message: "Income target not found" });
        await this.income.deleteEntriesForTarget(targetId);
        await this.income.deleteTarget(targetId);
        return { ok: true as const };
    }

    async generateFromRecurring(budgetId: string, yearMonth: string) {
        const templates = await this.income.findRecurringTemplates(budgetId);
        if (templates.length === 0) return { created: 0 };

        const existing = await this.income.findTargets(budgetId, yearMonth);
        const existingLabels = new Set(existing.map((t) => t.label ?? "Income"));

        let created = 0;
        for (const template of templates) {
            const label = template.label ?? "Income";
            if (existingLabels.has(label)) continue;

            if (
                template.endsAtYearMonth &&
                compareYearMonth(yearMonth, template.endsAtYearMonth) > 0
            ) {
                continue;
            }

            const monthsSinceStart = monthsBetween(template.yearMonth, yearMonth);
            if (monthsSinceStart < 0 || monthsSinceStart % template.frequencyMonths !== 0) {
                continue;
            }

            await this.income.createTarget(budgetId, {
                yearMonth,
                amount: template.amount,
                currency: template.currency,
                label: template.label ?? undefined,
                isRecurring: true,
                frequencyMonths: template.frequencyMonths,
                endsAtYearMonth: template.endsAtYearMonth,
            });
            existingLabels.add(label);
            created += 1;
        }

        return { created };
    }

    addEntry(
        budgetId: string,
        data: { incomeTargetId: string; yearMonth: string; amount: number; currency: string },
    ) {
        return this.income.createEntry({ budgetId, ...data });
    }

    deleteEntry(entryId: string) {
        return this.income.deleteEntry(entryId);
    }
}
