import { z } from "zod";
import { ORPCError } from "@orpc/server";

import { authorized } from "../middleware";
import { base } from "../context";
import { InvitationService } from "../../services/invitation.service";

const invitations = new InvitationService();

const budgetGuard = (budgetId: string | null | undefined): string => {
    if (!budgetId) {
        throw new ORPCError("BAD_REQUEST", { message: "No active budget. Create or select a budget first." });
    }
    return budgetId;
};

export const listBudgetMembers = authorized.handler(({ context }) =>
    invitations.listMembers(context.user.id, budgetGuard(context.user.activeBudgetId)),
);

export const inviteToBudget = authorized
    .input(z.object({ email: z.string().email() }))
    .handler(({ context, input }) =>
        invitations.invite(context.user.id, budgetGuard(context.user.activeBudgetId), input.email),
    );

export const acceptInvitation = authorized
    .input(z.object({ token: z.string().min(1) }))
    .handler(({ context, input }) =>
        invitations.accept(context.user.id, context.user.email, input.token),
    );

export const removeBudgetMember = authorized
    .input(z.object({ memberId: z.string() }))
    .handler(({ context, input }) =>
        invitations.removeMember(
            context.user.id,
            budgetGuard(context.user.activeBudgetId),
            input.memberId,
        ),
    );

export const getInvitation = base
    .input(z.object({ token: z.string().min(1) }))
    .handler(({ input }) => invitations.getInvitation(input.token));
