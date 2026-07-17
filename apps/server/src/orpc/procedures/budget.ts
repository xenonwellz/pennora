import { z } from "zod";
import { ORPCError } from "@orpc/server";
import { authorized } from "../middleware";
import { BudgetService, MonthService } from "../../services";

const budget = new BudgetService();
const months = new MonthService();
const budgetGuard = (b: string | null | undefined) => {
    if (!b) throw new ORPCError("BAD_REQUEST", { message: "No active budget. Create or select a budget first." });
    return b;
};

export const getBudgetItems = authorized
    .input(z.object({ yearMonth: z.string().regex(/^\d{4}-\d{2}$/) }))
    .handler(({ context, input }) =>
        budget.getMonthItems(budgetGuard(context.user.activeBudgetId), input.yearMonth),
    );

export const generateBudgetItems = authorized
    .input(z.object({ yearMonth: z.string().regex(/^\d{4}-\d{2}$/) }))
    .handler(({ context, input }) =>
        budget.generateItems(budgetGuard(context.user.activeBudgetId), input.yearMonth),
    );

export const addOneOffItem = authorized
    .input(z.object({
        yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
        name: z.string().min(1).max(128),
        amount: z.number().positive(),
        currency: z.enum(["NGN", "USD"]),
        categoryId: z.string().optional(),
        tagIds: z.array(z.string()).optional(),
        isRecurring: z.boolean().optional(),
        frequencyMonths: z.number().int().min(1).max(12).optional(),
        endsAtYearMonth: z.string().regex(/^\d{4}-\d{2}$/).nullable().optional(),
        isDraft: z.boolean().optional(),
    }))
    .handler(async ({ context, input }) => {
        const budgetId = budgetGuard(context.user.activeBudgetId);
        await months.requirePlanning(budgetId, input.yearMonth);
        return budget.addOneOff(budgetId, input);
    });

export const listExpenseDrafts = authorized.handler(({ context }) =>
    budget.listDrafts(budgetGuard(context.user.activeBudgetId)),
);

export const updateBudgetItem = authorized
    .input(z.object({
        id: z.string(),
        name: z.string().min(1).max(128).optional(),
        amount: z.number().positive().optional(),
        currency: z.enum(["NGN", "USD"]).optional(),
        categoryId: z.string().nullable().optional(),
        isRecurring: z.boolean().optional(),
        frequencyMonths: z.number().int().min(1).max(12).optional(),
        endsAtYearMonth: z.string().regex(/^\d{4}-\d{2}$/).nullable().optional(),
        updateBase: z.boolean().optional(),
    }))
    .handler(async ({ context, input }) => {
        const budgetId = budgetGuard(context.user.activeBudgetId);
        const item = await budget.getItem(budgetId, input.id);
        if (!item) throw new ORPCError("NOT_FOUND", { message: "Budget item not found" });
        await months.requirePlanning(budgetId, item.yearMonth);
        const { id, ...data } = input;
        return budget.updateItem(budgetId, id, data);
    });

export const togglePaid = authorized
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
        const budgetId = budgetGuard(context.user.activeBudgetId);
        const item = await budget.getItem(budgetId, input.id);
        if (!item) throw new ORPCError("NOT_FOUND", { message: "Budget item not found" });
        await months.requirePlanning(budgetId, item.yearMonth);
        return budget.togglePaid(budgetId, input.id);
    });

export const setItemDraft = authorized
    .input(z.object({ id: z.string(), isDraft: z.boolean() }))
    .handler(async ({ context, input }) => {
        const budgetId = budgetGuard(context.user.activeBudgetId);
        const item = await budget.getItem(budgetId, input.id);
        if (!item) throw new ORPCError("NOT_FOUND", { message: "Budget item not found" });
        await months.requirePlanning(budgetId, item.yearMonth);
        return budget.setDraft(budgetId, input.id, input.isDraft);
    });

export const deleteBudgetItem = authorized
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
        const budgetId = budgetGuard(context.user.activeBudgetId);
        const item = await budget.getItem(budgetId, input.id);
        if (!item) throw new ORPCError("NOT_FOUND", { message: "Budget item not found" });
        await months.requirePlanning(budgetId, item.yearMonth);
        return budget.deleteItem(budgetId, input.id);
    });
