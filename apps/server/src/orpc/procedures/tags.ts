import { z } from "zod";
import { ORPCError } from "@orpc/server";
import { authorized } from "../middleware";
import { TagsRepo } from "../../repos/tags.repo";

const tags = new TagsRepo();
const budgetGuard = (b: string | null | undefined) => {
    if (!b) throw new ORPCError("BAD_REQUEST", { message: "No active budget. Create or select a budget first." });
    return b;
};

export const listTags = authorized.handler(({ context }) =>
    tags.findByBudget(budgetGuard(context.user.activeBudgetId)),
);

export const createTag = authorized
    .input(z.object({ name: z.string().min(1).max(64) }))
    .handler(({ context, input }) =>
        tags.create({ budgetId: budgetGuard(context.user.activeBudgetId), name: input.name }),
    );

export const updateTag = authorized
    .input(z.object({ id: z.string(), name: z.string().min(1).max(64) }))
    .handler(({ input }) => tags.update(input.id, { name: input.name }));

export const deleteTag = authorized
    .input(z.object({ id: z.string() }))
    .handler(({ input }) => tags.delete(input.id));
