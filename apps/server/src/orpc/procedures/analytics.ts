import { z } from "zod";
import { ORPCError } from "@orpc/server";
import { authorized } from "../middleware";
import { AnalyticsService } from "../../services";

const analytics = new AnalyticsService();
const budgetGuard = (b: string | null | undefined) => {
    if (!b) throw new ORPCError("BAD_REQUEST", { message: "No active budget. Create or select a budget first." });
    return b;
};

const periodInputBase = z.object({
    year: z.number().int().min(2000).max(2100).optional(),
    startYearMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    endYearMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    allTime: z.boolean().optional(),
});

const periodInput = periodInputBase.refine(
    (v) =>
        v.allTime === true ||
        v.year !== undefined ||
        (v.startYearMonth !== undefined && v.endYearMonth !== undefined),
    { message: "Provide year, startYearMonth+endYearMonth, or allTime." },
);

export const getMonthBreakdown = authorized
    .input(z.object({ yearMonth: z.string().regex(/^\d{4}-\d{2}$/) }))
    .handler(({ context, input }) =>
        analytics.getMonthBreakdown(budgetGuard(context.user.activeBudgetId), input.yearMonth),
    );

export const getMonthAnalysis = authorized
    .input(z.object({ yearMonth: z.string().regex(/^\d{4}-\d{2}$/) }))
    .handler(({ context, input }) =>
        analytics.getMonthAnalysis(budgetGuard(context.user.activeBudgetId), input.yearMonth),
    );

export const getDashboardSummary = authorized
    .input(z.object({ yearMonth: z.string().regex(/^\d{4}-\d{2}$/) }))
    .handler(({ context, input }) =>
        analytics.getDashboardSummary(budgetGuard(context.user.activeBudgetId), input.yearMonth),
    );

export const getPeriodSummary = authorized
    .input(periodInput)
    .handler(({ context, input }) =>
        analytics.getPeriodSummary(budgetGuard(context.user.activeBudgetId), input),
    );

export const getPeriodCategoryBreakdown = authorized
    .input(
        periodInputBase
            .extend({ categoryId: z.string().nullable().optional() })
            .refine(
                (v) =>
                    v.allTime === true ||
                    v.year !== undefined ||
                    (v.startYearMonth !== undefined && v.endYearMonth !== undefined),
                { message: "Provide year, startYearMonth+endYearMonth, or allTime." },
            ),
    )
    .handler(({ context, input }) =>
        analytics.getPeriodCategoryBreakdown(budgetGuard(context.user.activeBudgetId), input),
    );
