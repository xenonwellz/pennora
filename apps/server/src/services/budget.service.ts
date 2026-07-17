import { ORPCError } from "@orpc/server";
import { monthsBetween, compareYearMonth } from "@expense/shared";
import { BaseService } from "./base.service";

export class BudgetService extends BaseService {
    async generateItems(budgetId: string, yearMonth: string) {
        const recurringItems = await this.budgetItems.findRecurringTemplates(budgetId);
        const existing = await this.budgetItems.findByMonth(budgetId, yearMonth);
        const existingNames = new Set(existing.map((e) => e.name));

        const toCreate = recurringItems.filter((item) => {
            if (existingNames.has(item.name)) return false;
            if (item.endsAtYearMonth && compareYearMonth(yearMonth, item.endsAtYearMonth) > 0) {
                return false;
            }
            const monthsSinceStart = monthsBetween(item.yearMonth, yearMonth);
            return monthsSinceStart >= 0 && monthsSinceStart % item.frequencyMonths === 0;
        });

        if (toCreate.length === 0) return { created: 0 };

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
                endsAtYearMonth: t.endsAtYearMonth,
            })),
        );

        return { created: toCreate.length };
    }

    async addOneOff(
        budgetId: string,
        data: {
            yearMonth: string;
            name: string;
            amount: number;
            currency: string;
            categoryId?: string;
            tagIds?: string[];
            isRecurring?: boolean;
            frequencyMonths?: number;
            endsAtYearMonth?: string | null;
            isDraft?: boolean;
        },
    ) {
        const item = await this.budgetItems.create({
            budgetId,
            yearMonth: data.yearMonth,
            name: data.name,
            amount: data.amount,
            currency: data.currency,
            categoryId: data.categoryId ?? null,
            isRecurring: data.isRecurring ?? false,
            frequencyMonths: data.frequencyMonths ?? 1,
            endsAtYearMonth: data.endsAtYearMonth ?? null,
            isDraft: data.isDraft ?? false,
        });

        if (!item) throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create budget item" });

        if (data.tagIds && data.tagIds.length > 0) {
            await this.budgetItemTags.addTags(item.id, data.tagIds);
        }

        return item;
    }

    async updateItem(
        budgetId: string,
        itemId: string,
        data: {
            name?: string;
            amount?: number;
            currency?: string;
            categoryId?: string | null;
            isRecurring?: boolean;
            frequencyMonths?: number;
            endsAtYearMonth?: string | null;
            updateBase?: boolean;
        },
    ) {
        const item = await this.budgetItems.findById(budgetId, itemId);
        if (!item) throw new ORPCError("NOT_FOUND", { message: "Budget item not found" });

        const patch = {
            name: data.name,
            amount: data.amount,
            currency: data.currency,
            categoryId: data.categoryId,
            isRecurring: data.isRecurring,
            frequencyMonths: data.frequencyMonths,
            endsAtYearMonth: data.endsAtYearMonth,
        };
        const cleanPatch = Object.fromEntries(
            Object.entries(patch).filter(([, v]) => v !== undefined),
        );

        if (data.updateBase && item.isRecurring) {
            const template = (await this.budgetItems.findRecurringTemplates(budgetId)).find(
                (t) => t.name === item.name,
            );
            const fromMonth = template?.yearMonth ?? item.yearMonth;
            await this.budgetItems.updateRecurringByName(budgetId, item.name, fromMonth, cleanPatch);
            return this.budgetItems.findById(budgetId, itemId);
        }

        return this.budgetItems.update(itemId, cleanPatch);
    }

    async togglePaid(budgetId: string, itemId: string) {
        const item = await this.budgetItems.findById(budgetId, itemId);
        if (!item) throw new ORPCError("NOT_FOUND", { message: "Budget item not found" });
        if (item.isDraft) {
            throw new ORPCError("BAD_REQUEST", {
                message: "Activate the draft expense before marking it paid.",
            });
        }

        return this.budgetItems.togglePaid(itemId, !item.paid);
    }

    async setDraft(budgetId: string, itemId: string, isDraft: boolean) {
        const item = await this.budgetItems.findById(budgetId, itemId);
        if (!item) throw new ORPCError("NOT_FOUND", { message: "Budget item not found" });
        return this.budgetItems.setDraft(itemId, isDraft);
    }

    getMonthItems(budgetId: string, yearMonth: string) {
        return this.budgetItems.findByMonth(budgetId, yearMonth);
    }

    listDrafts(budgetId: string) {
        return this.budgetItems.findDrafts(budgetId);
    }

    getItem(budgetId: string, itemId: string) {
        return this.budgetItems.findById(budgetId, itemId);
    }

    deleteItem(budgetId: string, itemId: string) {
        return this.budgetItems.delete(itemId);
    }
}
