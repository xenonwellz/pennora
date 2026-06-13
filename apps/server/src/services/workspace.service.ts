import { eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

import { BaseService } from "./base.service";
import { db } from "../db";
import { user } from "../db/schema/auth";

export class WorkspaceService extends BaseService {
    async create(userId: string, name: string) {
        const slug = name
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
            .slice(0, 32);

        return this.budgets.create({ userId, name, slug });
    }

    async switchActive(userId: string, budgetId: string) {
        const budget = await this.budgets.findUserBudget(userId, budgetId);
        if (!budget) throw new ORPCError("NOT_FOUND", { message: "Budget not found" });

        await db.update(user).set({ activeBudgetId: budgetId }).where(eq(user.id, userId));
        return budget;
    }

    list(userId: string) {
        return this.budgets.findByUserWithRole(userId);
    }

    async getActive(userId: string, activeBudgetId: string | null | undefined) {
        if (!activeBudgetId) return null;
        const budget = await this.budgets.findById(activeBudgetId);
        if (!budget) return null;

        const hasAccess = await this.budgets.findUserBudget(userId, activeBudgetId);
        if (!hasAccess) return null;

        const isOwner = await this.budgets.isOwner(userId, activeBudgetId);
        return { ...budget, isOwner };
    }
}
