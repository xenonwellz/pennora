import { z } from "zod";
import { ORPCError } from "@orpc/server";
import { authorized } from "../middleware";
import { MonthService } from "../../services";

const months = new MonthService();
const budgetGuard = (b: string | null | undefined) => {
    if (!b) throw new ORPCError("BAD_REQUEST", { message: "No active budget. Create or select a budget first." });
    return b;
};

export const getMonthStatus = authorized
    .input(z.object({ yearMonth: z.string().regex(/^\d{4}-\d{2}$/) }))
    .handler(({ context, input }) =>
        months.getMonthStatus(budgetGuard(context.user.activeBudgetId), input.yearMonth),
    );

export const startPlan = authorized
    .input(
        z.object({
            yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
            carryOverItemIds: z.array(z.string()).optional(),
        }),
    )
    .handler(({ context, input }) =>
        months.startPlan(
            budgetGuard(context.user.activeBudgetId),
            input.yearMonth,
            input.carryOverItemIds,
        ),
    );

export const completeMonth = authorized
    .input(z.object({ yearMonth: z.string().regex(/^\d{4}-\d{2}$/) }))
    .handler(({ context, input }) =>
        months.completeMonth(budgetGuard(context.user.activeBudgetId), input.yearMonth),
    );
