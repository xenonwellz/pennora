import Handlebars from "handlebars";
import {
    budgetInviteBody,
    budgetInviteText,
    layoutPartial,
    passwordResetBody,
    passwordResetText,
} from "./sources";

const BRAND_NAME = "Pennora";

/** Only allow http(s) URLs through unescaped (for matching href + link text). */
function safeHttpUrl(value: unknown): Handlebars.SafeString {
    const s = String(value ?? "");
    if (!/^https?:\/\/[^\s<>"']+$/i.test(s)) {
        return new Handlebars.SafeString("");
    }
    // Escape only characters that break attributes; keep = & ? for real URLs
    const attr = s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    return new Handlebars.SafeString(attr);
}

Handlebars.registerHelper("urlAttr", (value: unknown) => safeHttpUrl(value));

const layout = Handlebars.compile(layoutPartial);
const bodyReset = Handlebars.compile(passwordResetBody);
const textReset = Handlebars.compile(passwordResetText);
const bodyInvite = Handlebars.compile(budgetInviteBody);
const textInvite = Handlebars.compile(budgetInviteText);

export type RenderedEmail = {
    subject: string;
    html: string;
    text: string;
    /** Flat variables for SendByte `template_id` + `variables` API */
    variables: Record<string, string | number>;
};

function baseVars() {
    return {
        brandName: BRAND_NAME,
        year: new Date().getFullYear(),
    };
}

export function renderPasswordResetEmail(url: string): RenderedEmail {
    const vars = {
        ...baseVars(),
        url,
        title: "Reset your password",
        preheader: "Use this link to choose a new password for your Pennora account.",
        ctaLabel: "Password reset link",
        footerNote: "If you did not ask to reset your password, no further action is needed.",
        bodyHtml: bodyReset({ brandName: BRAND_NAME }),
    };

    return {
        subject: `Reset your ${BRAND_NAME} password`,
        html: layout(vars),
        text: textReset(vars),
        variables: {
            brand_name: BRAND_NAME,
            reset_url: url,
            year: vars.year,
        },
    };
}

export function renderBudgetInviteEmail(opts: {
    budgetName: string;
    inviteUrl: string;
    expiresInDays: number;
}): RenderedEmail {
    const vars = {
        ...baseVars(),
        url: opts.inviteUrl,
        budgetName: opts.budgetName,
        expiresInDays: opts.expiresInDays,
        title: "You are invited to collaborate",
        preheader: `Join "${opts.budgetName}" on Pennora and start collaborating.`,
        ctaLabel: "Invitation link",
        footerNote: "If you were not expecting this invite, you can ignore this email.",
        bodyHtml: bodyInvite({
            brandName: BRAND_NAME,
            budgetName: opts.budgetName,
            expiresInDays: opts.expiresInDays,
        }),
    };

    return {
        subject: `You are invited to ${opts.budgetName} on ${BRAND_NAME}`,
        html: layout(vars),
        text: textInvite(vars),
        variables: {
            brand_name: BRAND_NAME,
            budget_name: opts.budgetName,
            invite_url: opts.inviteUrl,
            expires_in_days: opts.expiresInDays,
            year: vars.year,
        },
    };
}
