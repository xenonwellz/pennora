import { z } from "zod";
import { ORPCError } from "@orpc/server";
import { authorized } from "../middleware";
import { CurrencyService } from "../../services";

const currency = new CurrencyService();
const budgetGuard = (b: string | null | undefined) => {
    if (!b) throw new ORPCError("BAD_REQUEST", { message: "No active budget. Create or select a budget first." });
    return b;
};

export const getLatestRate = authorized.handler(({ context }) =>
    currency.getLatest(budgetGuard(context.user.activeBudgetId)),
);

export const getRateForMonth = authorized
    .input(z.object({ yearMonth: z.string().regex(/^\d{4}-\d{2}$/) }))
    .handler(({ context, input }) =>
        currency.getRate(budgetGuard(context.user.activeBudgetId), input.yearMonth),
    );

export const upsertRate = authorized
    .input(z.object({
        yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
        usdBuyRate: z.number().positive(),
        usdSellRate: z.number().positive(),
    }))
    .handler(({ context, input }) =>
        currency.upsertRate(budgetGuard(context.user.activeBudgetId), input),
    );
