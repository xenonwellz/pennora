import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { budgetMonths } from "../db/schema/domain";

function id() {
    return crypto.randomUUID();
}

export class BudgetMonthsRepo {
    find(budgetId: string, yearMonth: string) {
        return db
            .select()
            .from(budgetMonths)
            .where(and(eq(budgetMonths.budgetId, budgetId), eq(budgetMonths.yearMonth, yearMonth)))
            .then((r) => r[0] ?? null);
    }

    upsert(
        budgetId: string,
        yearMonth: string,
        data: { status: string; startedAt?: Date | null; completedAt?: Date | null },
    ) {
        return db
            .insert(budgetMonths)
            .values({
                id: id(),
                budgetId,
                yearMonth,
                status: data.status,
                startedAt: data.startedAt ?? null,
                completedAt: data.completedAt ?? null,
            })
            .onConflictDoUpdate({
                target: [budgetMonths.budgetId, budgetMonths.yearMonth],
                set: {
                    status: data.status,
                    startedAt: data.startedAt ?? null,
                    completedAt: data.completedAt ?? null,
                    updatedAt: new Date(),
                },
            })
            .returning()
            .then((r) => r[0]);
    }

    complete(budgetId: string, yearMonth: string) {
        return db
            .update(budgetMonths)
            .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
            .where(and(eq(budgetMonths.budgetId, budgetId), eq(budgetMonths.yearMonth, yearMonth)))
            .returning()
            .then((r) => r[0]);
    }
}
