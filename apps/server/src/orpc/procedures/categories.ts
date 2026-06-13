import { z } from "zod";
import { ORPCError } from "@orpc/server";
import { authorized } from "../middleware";
import { CategoriesRepo } from "../../repos/categories.repo";

const categories = new CategoriesRepo();

const budgetGuard = (budgetId: string | null | undefined): string => {
    if (!budgetId) throw new ORPCError("BAD_REQUEST", { message: "No active budget. Create or select a budget first." });
    return budgetId;
};

export const listCategories = authorized.handler(({ context }) =>
    categories.findByBudget(budgetGuard(context.user.activeBudgetId)),
);

export const createCategory = authorized
    .input(z.object({ name: z.string().min(1).max(64) }))
    .handler(({ context, input }) =>
        categories.create({ budgetId: budgetGuard(context.user.activeBudgetId), name: input.name }),
    );

export const updateCategory = authorized
    .input(z.object({ id: z.string(), name: z.string().min(1).max(64) }))
    .handler(({ input }) =>
        categories.update(input.id, { name: input.name }),
    );

export const deleteCategory = authorized
    .input(z.object({ id: z.string() }))
    .handler(({ input }) =>
        categories.delete(input.id),
    );
