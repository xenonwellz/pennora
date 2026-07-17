import { z } from "zod";
import { ORPCError } from "@orpc/server";
import { authorized } from "../middleware";
import { IncomeService, MonthService } from "../../services";

const income = new IncomeService();
const months = new MonthService();
const budgetGuard = (b: string | null | undefined) => {
    if (!b) throw new ORPCError("BAD_REQUEST", { message: "No active budget. Create or select a budget first." });
    return b;
};

/** All income targets for a month (multiple sources supported). */
export const getIncomeTarget = authorized
    .input(z.object({ yearMonth: z.string().regex(/^\d{4}-\d{2}$/) }))
    .handler(({ context, input }) =>
        income.getMonthSummaries(budgetGuard(context.user.activeBudgetId), input.yearMonth),
    );

export const getIncomeTargets = getIncomeTarget;

/** Create a new income source for the month (does not replace existing). */
export const setIncomeTarget = authorized
    .input(z.object({
        yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
        amount: z.number().positive(),
        currency: z.enum(["NGN", "USD"]),
        label: z.string().min(1).max(64),
        isRecurring: z.boolean().optional(),
        frequencyMonths: z.number().int().min(1).max(12).optional(),
        endsAtYearMonth: z.string().regex(/^\d{4}-\d{2}$/).nullable().optional(),
        isDraft: z.boolean().optional(),
    }))
    .handler(async ({ context, input }) => {
        const budgetId = budgetGuard(context.user.activeBudgetId);
        await months.requirePlanning(budgetId, input.yearMonth);
        return income.createTarget(budgetId, input);
    });

export const listIncomeDrafts = authorized.handler(({ context }) =>
    income.listDrafts(budgetGuard(context.user.activeBudgetId)),
);

export const setIncomeDraft = authorized
    .input(z.object({ id: z.string(), isDraft: z.boolean() }))
    .handler(async ({ context, input }) => {
        const budgetId = budgetGuard(context.user.activeBudgetId);
        const current = await income.getTargetById(budgetId, input.id);
        if (!current) throw new ORPCError("NOT_FOUND", { message: "Income target not found" });
        await months.requirePlanning(budgetId, current.yearMonth);
        return income.setDraft(budgetId, input.id, input.isDraft);
    });

export const updateIncomeTarget = authorized
    .input(z.object({
        id: z.string(),
        amount: z.number().positive().optional(),
        currency: z.enum(["NGN", "USD"]).optional(),
        label: z.string().min(1).max(64).optional(),
        isRecurring: z.boolean().optional(),
        frequencyMonths: z.number().int().min(1).max(12).optional(),
        endsAtYearMonth: z.string().regex(/^\d{4}-\d{2}$/).nullable().optional(),
        updateBase: z.boolean().optional(),
    }))
    .handler(async ({ context, input }) => {
        const budgetId = budgetGuard(context.user.activeBudgetId);
        const { id, ...data } = input;
        const current = await income.getTargetById(budgetId, id);
        if (!current) throw new ORPCError("NOT_FOUND", { message: "Income target not found" });
        await months.requirePlanning(budgetId, current.yearMonth);
        return income.updateTarget(budgetId, id, data);
    });

export const deleteIncomeTarget = authorized
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
        const budgetId = budgetGuard(context.user.activeBudgetId);
        const current = await income.getTargetById(budgetId, input.id);
        if (!current) throw new ORPCError("NOT_FOUND", { message: "Income target not found" });
        await months.requirePlanning(budgetId, current.yearMonth);
        return income.deleteTarget(budgetId, input.id);
    });

export const addIncomeEntry = authorized
    .input(z.object({
        incomeTargetId: z.string(),
        yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
        amount: z.number().positive(),
        currency: z.enum(["NGN", "USD"]),
    }))
    .handler(async ({ context, input }) => {
        const budgetId = budgetGuard(context.user.activeBudgetId);
        await months.requirePlanning(budgetId, input.yearMonth);
        return income.addEntry(budgetId, input);
    });

export const deleteIncomeEntry = authorized
    .input(z.object({ id: z.string() }))
    .handler(({ input }) => income.deleteEntry(input.id));

export const generateRecurringIncome = authorized
    .input(z.object({ yearMonth: z.string().regex(/^\d{4}-\d{2}$/) }))
    .handler(({ context, input }) =>
        income.generateFromRecurring(budgetGuard(context.user.activeBudgetId), input.yearMonth),
    );
