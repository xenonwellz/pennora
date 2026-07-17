import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";

import { env, isEmailEnabled, isGoogleEnabled } from "./config";
import { db } from "./db";
import { user } from "./db/schema/auth";
import { sendEmail } from "./services/email.service";
import { passwordResetEmail } from "./services/email-templates";
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
        provider: "pg",
    }),
    emailAndPassword: {
        enabled: true,
        ...(isEmailEnabled()
            ? {
                sendResetPassword: async ({ user: resetUser, url }) => {
                    const mail = passwordResetEmail(url);
                    await sendEmail({
                        to: resetUser.email,
                        subject: mail.subject,
                        html: mail.html,
                        text: mail.text,
                    });
                },
            }
            : {}),
    },
    socialProviders: googleConfig,
    trustedOrigins: env.CORS_ORIGINS,
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
