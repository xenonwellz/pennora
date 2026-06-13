import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";

import { env, isEmailEnabled } from "../config";
import { db } from "../db";
import { user } from "../db/schema/auth";
import { BudgetMembersRepo } from "../repos/budget-members.repo";
import { BudgetsRepo } from "../repos/budgets.repo";
import { sendEmail } from "./email.service";

const INVITE_EXPIRY_DAYS = 7;

export class InvitationService {
    private readonly members = new BudgetMembersRepo();
    private readonly budgets = new BudgetsRepo();

    private assertOwner(userId: string, budgetId: string) {
        return this.budgets.findUserBudget(userId, budgetId).then((budget) => {
            if (!budget) {
                throw new ORPCError("FORBIDDEN", { message: "Only the budget owner can manage members" });
            }
            return budget;
        });
    }

    async listMembers(userId: string, budgetId: string) {
        await this.assertOwner(userId, budgetId);
        return this.members.findByBudget(budgetId);
    }

    async invite(userId: string, budgetId: string, email: string) {
        const budget = await this.assertOwner(userId, budgetId);
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail.includes("@")) {
            throw new ORPCError("BAD_REQUEST", { message: "Enter a valid email address" });
        }

        const owner = await db.query.user.findFirst({ where: eq(user.id, budget.userId) });
        if (owner?.email.toLowerCase() === normalizedEmail) {
            throw new ORPCError("BAD_REQUEST", { message: "You already own this budget" });
        }

        const existing = await this.members.findByBudgetAndEmail(budgetId, normalizedEmail);
        if (existing?.status === "accepted") {
            throw new ORPCError("BAD_REQUEST", { message: "This user is already a member" });
        }
        if (existing?.status === "pending") {
            throw new ORPCError("BAD_REQUEST", { message: "An invitation is already pending for this email" });
        }

        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
        const member = await this.members.create({
            budgetId,
            email: normalizedEmail,
            invitedBy: userId,
            token,
            expiresAt,
        });

        if (!member) {
            throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create invitation" });
        }

        const inviteUrl = `${env.APP_URL}/invite/${token}`;
        let emailSent = false;

        if (isEmailEnabled()) {
            await sendEmail({
                to: normalizedEmail,
                subject: `You're invited to collaborate on ${budget.name}`,
                html: `
                    <p>You've been invited to collaborate on <strong>${budget.name}</strong> in Peak Finance.</p>
                    <p><a href="${inviteUrl}">Accept invitation</a></p>
                    <p>This link expires in ${INVITE_EXPIRY_DAYS} days.</p>
                `,
            });
            emailSent = true;
        }

        return { member, inviteUrl, emailSent };
    }

    async getInvitation(token: string) {
        const invitation = await this.members.findByToken(token);
        if (!invitation) {
            throw new ORPCError("NOT_FOUND", { message: "Invitation not found" });
        }
        if (invitation.status === "accepted") {
            throw new ORPCError("BAD_REQUEST", { message: "This invitation has already been accepted" });
        }
        if (invitation.expiresAt < new Date()) {
            throw new ORPCError("BAD_REQUEST", { message: "This invitation has expired" });
        }

        return {
            email: invitation.email,
            budgetId: invitation.budgetId,
            budgetName: invitation.budget?.name ?? "Budget",
            expiresAt: invitation.expiresAt,
        };
    }

    async accept(userId: string, userEmail: string, token: string) {
        const invitation = await this.members.findByToken(token);
        if (!invitation) {
            throw new ORPCError("NOT_FOUND", { message: "Invitation not found" });
        }
        if (invitation.status === "accepted") {
            return { budgetId: invitation.budgetId, alreadyAccepted: true };
        }
        if (invitation.expiresAt < new Date()) {
            throw new ORPCError("BAD_REQUEST", { message: "This invitation has expired" });
        }
        if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
            throw new ORPCError("FORBIDDEN", {
                message: "Sign in with the email address that received this invitation",
            });
        }

        const accepted = await this.members.accept(invitation.id, userId);
        if (!accepted) {
            throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to accept invitation" });
        }

        const currentUser = await db.query.user.findFirst({ where: eq(user.id, userId) });
        if (currentUser && !currentUser.activeBudgetId) {
            await db
                .update(user)
                .set({ activeBudgetId: invitation.budgetId })
                .where(eq(user.id, userId));
        }

        return { budgetId: invitation.budgetId, alreadyAccepted: false };
    }

    acceptPendingForEmail(email: string, userId: string) {
        return this.members.acceptPendingForEmail(email, userId);
    }

    async removeMember(userId: string, budgetId: string, memberId: string) {
        await this.assertOwner(userId, budgetId);
        const member = await this.members.findById(budgetId, memberId);
        if (!member) {
            throw new ORPCError("NOT_FOUND", { message: "Member not found" });
        }
        await this.members.delete(memberId);
        return { success: true };
    }
}
