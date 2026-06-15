import { and, eq, gt, type SQL } from "drizzle-orm";
import { db } from "../db";
import { budgetMembers } from "../db/schema/domain";

function id() {
    return crypto.randomUUID();
}

export class BudgetMembersRepo {
    findByBudget(budgetId: string) {
        return db.select().from(budgetMembers).where(eq(budgetMembers.budgetId, budgetId));
    }

    findByToken(token: string) {
        return db.query.budgetMembers.findFirst({
            where: (m: any, { eq: op }: any) => op(m.token, token),
            with: { budget: true },
        });
    }

    findPendingByEmail(email: string) {
        return db
            .select()
            .from(budgetMembers)
            .where(and(eq(budgetMembers.email, email.toLowerCase()), eq(budgetMembers.status, "pending")));
    }

    findAcceptedBudgetIdsForUser(userId: string) {
        return db
            .select({ budgetId: budgetMembers.budgetId })
            .from(budgetMembers)
            .where(and(eq(budgetMembers.userId, userId), eq(budgetMembers.status, "accepted")));
    }

    hasAccess(userId: string, budgetId: string) {
        return db.query.budgetMembers.findFirst({
            where: (m: any, { eq: op, and: opAnd }: any) =>
                opAnd(op(m.budgetId, budgetId), op(m.userId, userId), op(m.status, "accepted")),
        });
    }

    findById(budgetId: string, memberId: string) {
        return db.query.budgetMembers.findFirst({
            where: (m: any, { eq: op, and: opAnd }: any) => opAnd(op(m.id, memberId), op(m.budgetId, budgetId)),
        });
    }

    findByBudgetAndEmail(budgetId: string, email: string) {
        return db.query.budgetMembers.findFirst({
            where: (m: any, { eq: op, and: opAnd }: any) =>
                opAnd(op(m.budgetId, budgetId), op(m.email, email.toLowerCase())),
        });
    }

    create(data: {
        budgetId: string;
        email: string;
        invitedBy: string;
        token: string;
        expiresAt: Date;
    }) {
        return db
            .insert(budgetMembers)
            .values({
                id: id(),
                budgetId: data.budgetId,
                email: data.email.toLowerCase(),
                invitedBy: data.invitedBy,
                token: data.token,
                expiresAt: data.expiresAt,
                role: "member",
                status: "pending",
            })
            .returning()
            .then((rows: typeof budgetMembers.$inferSelect[]) => rows[0]);
    }

    accept(id: string, userId: string) {
        return db
            .update(budgetMembers)
            .set({ userId, status: "accepted", updatedAt: new Date() })
            .where(eq(budgetMembers.id, id))
            .returning()
            .then((rows: typeof budgetMembers.$inferSelect[]) => rows[0]);
    }

    acceptPendingForEmail(email: string, userId: string) {
        return db
            .update(budgetMembers)
            .set({ userId, status: "accepted", updatedAt: new Date() })
            .where(
                and(
                    eq(budgetMembers.email, email.toLowerCase()),
                    eq(budgetMembers.status, "pending"),
                    gt(budgetMembers.expiresAt, new Date()),
                ),
            )
            .returning();
    }

    delete(id: string) {
        return db.delete(budgetMembers).where(eq(budgetMembers.id, id));
    }
}
