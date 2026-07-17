import { eq, and, gte, lte } from "drizzle-orm";
import { db } from "../db";
import { budgetItems, budgetItemTags } from "../db/schema/domain";

function id() {
    return crypto.randomUUID();
}

export class BudgetItemsRepo {
    findByMonth(budgetId: string, yearMonth: string) {
        return db.query.budgetItems.findMany({
            where: (b, { eq, and }) => and(eq(b.budgetId, budgetId), eq(b.yearMonth, yearMonth)),
            with: { category: true, tags: { with: { tag: true } } },
        });
    }

    findRecurring(budgetId: string) {
        return db
            .select()
            .from(budgetItems)
            .where(and(eq(budgetItems.budgetId, budgetId), eq(budgetItems.isRecurring, true)));
    }

    async findRecurringTemplates(budgetId: string) {
        const all = await this.findRecurring(budgetId);
        const byName = new Map<string, (typeof all)[0]>();
        for (const item of all) {
            const existing = byName.get(item.name);
            if (!existing || item.yearMonth < existing.yearMonth) {
                byName.set(item.name, item);
            }
        }
        return [...byName.values()];
    }

    findInRange(budgetId: string, startYearMonth: string, endYearMonth: string) {
        return db.query.budgetItems.findMany({
            where: (b, { eq, and, gte, lte }) =>
                and(
                    eq(b.budgetId, budgetId),
                    gte(b.yearMonth, startYearMonth),
                    lte(b.yearMonth, endYearMonth),
                ),
            with: { category: true, tags: { with: { tag: true } } },
        });
    }

    createMany(items: Array<{
        budgetId: string;
        yearMonth: string;
        name: string;
        amount: number;
        currency: string;
        categoryId?: string | null;
        isRecurring?: boolean;
        frequencyMonths?: number;
        endsAtYearMonth?: string | null;
    }>) {
        return db.insert(budgetItems).values(
            items.map((item) => ({ id: id(), ...item })),
        );
    }

    create(data: {
        budgetId: string;
        yearMonth: string;
        name: string;
        amount: number;
        currency: string;
        categoryId?: string | null;
        isRecurring?: boolean;
        frequencyMonths?: number;
        endsAtYearMonth?: string | null;
        isDraft?: boolean;
    }) {
        return db.insert(budgetItems).values({ id: id(), ...data }).returning().then((r) => r[0]);
    }

    findDrafts(budgetId: string) {
        return db.query.budgetItems.findMany({
            where: (b, { eq, and }) => and(eq(b.budgetId, budgetId), eq(b.isDraft, true)),
            with: { category: true },
        });
    }

    update(
        id: string,
        data: Partial<{
            name: string;
            amount: number;
            currency: string;
            categoryId: string | null;
            isRecurring: boolean;
            frequencyMonths: number;
            endsAtYearMonth: string | null;
            isDraft: boolean;
            paid: boolean;
            paidAt: Date | null;
        }>,
    ) {
        return db
            .update(budgetItems)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(budgetItems.id, id))
            .returning()
            .then((r) => r[0]);
    }

    updateRecurringByName(
        budgetId: string,
        name: string,
        fromYearMonth: string,
        data: Partial<{
            name: string;
            amount: number;
            currency: string;
            categoryId: string | null;
            frequencyMonths: number;
            endsAtYearMonth: string | null;
        }>,
    ) {
        return db
            .update(budgetItems)
            .set({ ...data, updatedAt: new Date() })
            .where(
                and(
                    eq(budgetItems.budgetId, budgetId),
                    eq(budgetItems.name, name),
                    eq(budgetItems.isRecurring, true),
                    gte(budgetItems.yearMonth, fromYearMonth),
                ),
            );
    }

    findById(budgetId: string, id: string) {
        return db
            .select()
            .from(budgetItems)
            .where(and(eq(budgetItems.id, id), eq(budgetItems.budgetId, budgetId)))
            .then((r) => r[0] ?? null);
    }

    togglePaid(id: string, paid: boolean) {
        return db
            .update(budgetItems)
            .set({
                paid,
                paidAt: paid ? new Date() : null,
                // Activating paid clears draft
                ...(paid ? { isDraft: false } : {}),
            })
            .where(eq(budgetItems.id, id))
            .returning()
            .then((r) => r[0]);
    }

    setDraft(id: string, isDraft: boolean) {
        return db
            .update(budgetItems)
            .set({
                isDraft,
                // Drafts are never paid
                ...(isDraft ? { paid: false, paidAt: null } : {}),
                updatedAt: new Date(),
            })
            .where(eq(budgetItems.id, id))
            .returning()
            .then((r) => r[0]);
    }

    delete(id: string) {
        return db.delete(budgetItems).where(eq(budgetItems.id, id));
    }
}

export class BudgetItemTagsRepo {
    addTags(budgetItemId: string, tagIds: string[]) {
        if (tagIds.length === 0) return;
        return db.insert(budgetItemTags).values(tagIds.map((tagId) => ({ budgetItemId, tagId })));
    }
}
