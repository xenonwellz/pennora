import { eq, type SQL } from "drizzle-orm";
import { db } from "../db";
import { categories } from "../db/schema/domain";

function id() {
    return crypto.randomUUID();
}

export class CategoriesRepo {
    findByBudget(budgetId: string) {
        return db.select().from(categories).where(eq(categories.budgetId, budgetId));
    }

    create(data: { budgetId: string; name: string }) {
        return db.insert(categories).values({ id: id(), ...data }).returning().then((r: typeof categories.$inferSelect[]) => r[0]);
    }

    update(id: string, data: { name: string }) {
        return db.update(categories).set(data).where(eq(categories.id, id)).returning().then((r: typeof categories.$inferSelect[]) => r[0]);
    }

    delete(id: string) {
        return db.delete(categories).where(eq(categories.id, id));
    }
}
