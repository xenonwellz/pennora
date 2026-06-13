import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { budgets, budgetMembers } from "../db/schema/domain";

function id() {
    return crypto.randomUUID();
}

export class BudgetsRepo {
    async findByUserWithRole(userId: string) {
        const owned = await db.select().from(budgets).where(eq(budgets.userId, userId));

        const memberRows = await db
            .select({ budget: budgets })
            .from(budgetMembers)
            .innerJoin(budgets, eq(budgetMembers.budgetId, budgets.id))
            .where(and(eq(budgetMembers.userId, userId), eq(budgetMembers.status, "accepted")));

        const merged = new Map<string, (typeof owned)[number] & { isOwner: boolean }>();
        for (const budget of owned) merged.set(budget.id, { ...budget, isOwner: true });
        for (const row of memberRows) {
            if (!merged.has(row.budget.id)) {
                merged.set(row.budget.id, { ...row.budget, isOwner: false });
            }
        }

        return Array.from(merged.values());
    }

    async findByUser(userId: string) {
        const rows = await this.findByUserWithRole(userId);
        return rows.map(({ isOwner: _isOwner, ...budget }) => budget);
    }

    findById(id: string) {
        return db.query.budgets.findFirst({ where: (b, { eq }) => eq(b.id, id) });
    }

    async findUserBudget(userId: string, budgetId: string) {
        const owned = await db.query.budgets.findFirst({
            where: (b, { eq, and }) => and(eq(b.id, budgetId), eq(b.userId, userId)),
        });
        if (owned) return owned;

        const member = await db.query.budgetMembers.findFirst({
            where: (m, { eq, and }) =>
                and(eq(m.budgetId, budgetId), eq(m.userId, userId), eq(m.status, "accepted")),
        });
        if (!member) return undefined;

        return this.findById(budgetId);
    }

    async isOwner(userId: string, budgetId: string) {
        const budget = await db.query.budgets.findFirst({
            where: (b, { eq, and }) => and(eq(b.id, budgetId), eq(b.userId, userId)),
        });
        return Boolean(budget);
    }

    create(data: { userId: string; name: string; slug: string }) {
        return db.insert(budgets).values({ id: id(), ...data }).returning().then((r) => r[0]);
    }

    delete(id: string) {
        return db.delete(budgets).where(eq(budgets.id, id));
    }
}
