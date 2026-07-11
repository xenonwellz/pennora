import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";

import { env, isEmailEnabled, isGoogleEnabled, getAllowedOrigins } from "./config";

const corsOrigins = getAllowedOrigins();
// betterAuth trustedOrigins expects string[], not "*"
const trustedOrigins: string[] = Array.isArray(corsOrigins) ? corsOrigins : [];
import { db } from "./db";
import { user } from "./db/schema/auth";
import { sendEmail } from "./services/email.service";
import { InvitationService } from "./services/invitation.service";

const invitationService = new InvitationService();

const googleConfig = isGoogleEnabled()
    ? {
        google: {
            clientId: env.GOOGLE_CLIENT_ID!,
            clientSecret: env.GOOGLE_CLIENT_SECRET!,
        },
    }
    : {};

export const auth = betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, {
        provider: "sqlite",
    }),
    emailAndPassword: {
        enabled: true,
        ...(isEmailEnabled()
            ? {
                sendResetPassword: async ({ user: resetUser, url }) => {
                    await sendEmail({
                        to: resetUser.email,
                        subject: "Reset your Peak Finance password",
                        html: `
                              <p>We received a request to reset your Peak Finance password.</p>
                              <p><a href="${url}">Reset password</a></p>
                              <p>If you didn't request this, you can ignore this email.</p>
                          `,
                    });
                },
            }
            : {}),
    },
    socialProviders: googleConfig,
    trustedOrigins: trustedOrigins,
    user: {
        additionalFields: {
            activeBudgetId: {
                type: "string",
                required: false,
            },
        },
    },
    databaseHooks: {
        user: {
            create: {
                after: async (createdUser) => {
                    await invitationService.acceptPendingForEmail(createdUser.email, createdUser.id);
                },
            },
        },
        session: {
            create: {
                after: async (session) => {
                    const sessionUser = await db.query.user.findFirst({
                        where: eq(user.id, session.userId),
                    });
                    if (sessionUser) {
                        await invitationService.acceptPendingForEmail(
                            sessionUser.email,
                            sessionUser.id,
                        );
                    }
                },
            },
        },
    },
});
