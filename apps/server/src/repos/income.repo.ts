import { eq, and, gte, lte } from "drizzle-orm";
import { db } from "../db";
import { incomeTargets, incomeEntries } from "../db/schema/domain";

function id() {
    return crypto.randomUUID();
}
function val() {
    return { id: id(), createdAt: new Date() };
}

export class IncomeRepo {
    findTarget(budgetId: string, yearMonth: string) {
        return db
            .select()
            .from(incomeTargets)
            .where(and(eq(incomeTargets.budgetId, budgetId), eq(incomeTargets.yearMonth, yearMonth)))
            .then((r) => r[0] ?? null);
    }

    findTargetById(budgetId: string, id: string) {
        return db
            .select()
            .from(incomeTargets)
            .where(and(eq(incomeTargets.budgetId, budgetId), eq(incomeTargets.id, id)))
            .then((r) => r[0] ?? null);
    }

    findRecurring(budgetId: string) {
        return db
            .select()
            .from(incomeTargets)
            .where(and(eq(incomeTargets.budgetId, budgetId), eq(incomeTargets.isRecurring, true)))
            .then((r) => r[0] ?? null);
    }

    async findRecurringTemplates(budgetId: string) {
        const all = await db
            .select()
            .from(incomeTargets)
            .where(and(eq(incomeTargets.budgetId, budgetId), eq(incomeTargets.isRecurring, true)));
        const byLabel = new Map<string, (typeof all)[0]>();
        for (const target of all) {
            const key = target.label ?? "Income";
            const existing = byLabel.get(key);
            if (!existing || target.yearMonth < existing.yearMonth) {
                byLabel.set(key, target);
            }
        }
        return [...byLabel.values()];
    }

    findTargetsInRange(budgetId: string, startYearMonth: string, endYearMonth: string) {
        return db
            .select()
            .from(incomeTargets)
            .where(
                and(
                    eq(incomeTargets.budgetId, budgetId),
                    gte(incomeTargets.yearMonth, startYearMonth),
                    lte(incomeTargets.yearMonth, endYearMonth),
                ),
            );
    }

    findEntriesInRange(budgetId: string, startYearMonth: string, endYearMonth: string) {
        return db
            .select()
            .from(incomeEntries)
            .where(
                and(
                    eq(incomeEntries.budgetId, budgetId),
                    gte(incomeEntries.yearMonth, startYearMonth),
                    lte(incomeEntries.yearMonth, endYearMonth),
                ),
            );
    }

    upsertTarget(budgetId: string, data: { yearMonth: string; amount: number; currency: string; label?: string; isRecurring?: boolean; frequencyMonths?: number; endsAtYearMonth?: string | null }) {
        return db
            .insert(incomeTargets)
            .values({ id: id(), budgetId, ...data })
            .onConflictDoUpdate({
                target: [incomeTargets.budgetId, incomeTargets.yearMonth],
                set: {
                    amount: data.amount,
                    currency: data.currency,
                    label: data.label,
                    isRecurring: data.isRecurring ?? false,
                    frequencyMonths: data.frequencyMonths ?? 1,
                    endsAtYearMonth: data.endsAtYearMonth ?? null,
                    updatedAt: new Date(),
                },
            })
            .returning()
            .then((r) => r[0]);
    }

    updateTarget(
        id: string,
        data: Partial<{
            amount: number;
            currency: string;
            label: string;
            isRecurring: boolean;
            frequencyMonths: number;
            endsAtYearMonth: string | null;
        }>,
    ) {
        return db
            .update(incomeTargets)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(incomeTargets.id, id))
            .returning()
            .then((r) => r[0]);
    }

    updateRecurringByLabel(
        budgetId: string,
        label: string,
        fromYearMonth: string,
        data: Partial<{
            amount: number;
            currency: string;
            label: string;
            frequencyMonths: number;
            endsAtYearMonth: string | null;
        }>,
    ) {
        return db
            .update(incomeTargets)
            .set({ ...data, updatedAt: new Date() })
            .where(
                and(
                    eq(incomeTargets.budgetId, budgetId),
                    eq(incomeTargets.label, label),
                    eq(incomeTargets.isRecurring, true),
                    gte(incomeTargets.yearMonth, fromYearMonth),
                ),
            );
    }

    findEntries(budgetId: string, yearMonth: string) {
        return db
            .select()
            .from(incomeEntries)
            .where(and(eq(incomeEntries.budgetId, budgetId), eq(incomeEntries.yearMonth, yearMonth)));
    }

    createEntry(data: { budgetId: string; incomeTargetId: string; yearMonth: string; amount: number; currency: string }) {
        return db.insert(incomeEntries).values({ ...val(), receivedAt: new Date(), ...data }).returning().then((r) => r[0]);
    }

    deleteEntry(id: string) {
        return db.delete(incomeEntries).where(eq(incomeEntries.id, id));
    }
}
