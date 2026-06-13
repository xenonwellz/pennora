import { eq, desc, and } from "drizzle-orm";
import { db } from "../db";
import { monthlyRates } from "../db/schema/domain";

function id() {
    return crypto.randomUUID();
}

export class RatesRepo {
    findByBudgetAndMonth(budgetId: string, yearMonth: string) {
        return db
            .select()
            .from(monthlyRates)
            .where(and(eq(monthlyRates.budgetId, budgetId), eq(monthlyRates.yearMonth, yearMonth)))
            .then((r) => r[0] ?? null);
    }

    findLatest(budgetId: string) {
        return db
            .select()
            .from(monthlyRates)
            .where(eq(monthlyRates.budgetId, budgetId))
            .orderBy(desc(monthlyRates.yearMonth))
            .limit(1)
            .then((r) => r[0] ?? null);
    }

    upsert(budgetId: string, data: { yearMonth: string; usdBuyRate: number; usdSellRate: number }) {
        return db
            .insert(monthlyRates)
            .values({ id: id(), budgetId, ...data })
            .onConflictDoUpdate({ target: [monthlyRates.budgetId, monthlyRates.yearMonth], set: { usdBuyRate: data.usdBuyRate, usdSellRate: data.usdSellRate } })
            .returning()
            .then((r) => r[0]);
    }
}
