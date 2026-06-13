import { eq } from "drizzle-orm";
import { db } from "../db";
import { tags } from "../db/schema/domain";

function val() {
    return {
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

export class TagsRepo {
    findByBudget(budgetId: string) {
        return db.select().from(tags).where(eq(tags.budgetId, budgetId));
    }

    create(data: { budgetId: string; name: string }) {
        return db.insert(tags).values({ ...val(), ...data }).returning().then((r) => r[0]);
    }

    update(id: string, data: { name: string }) {
        return db.update(tags).set({ ...data, updatedAt: new Date() }).where(eq(tags.id, id)).returning().then((r) => r[0]);
    }

    delete(id: string) {
        return db.delete(tags).where(eq(tags.id, id));
    }
}
