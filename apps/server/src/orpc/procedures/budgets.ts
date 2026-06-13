import { z } from "zod";
import { authorized } from "../middleware";
import { WorkspaceService } from "../../services";

const workspace = new WorkspaceService();

export const listBudgets = authorized.handler(({ context }) =>
    workspace.list(context.user.id),
);

export const createBudget = authorized
    .input(z.object({ name: z.string().min(1).max(64) }))
    .handler(({ context, input }) =>
        workspace.create(context.user.id, input.name),
    );

export const setActiveBudget = authorized
    .input(z.object({ budgetId: z.string() }))
    .handler(({ context, input }) =>
        workspace.switchActive(context.user.id, input.budgetId),
    );

export const getActiveBudget = authorized.handler(({ context }) =>
    workspace.getActive(context.user.id, context.user.activeBudgetId),
);
