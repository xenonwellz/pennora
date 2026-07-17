import { env, isEmailEnabled } from "../config";

type SendEmailHtmlInput = {
    to: string;
    subject: string;
    html: string;
    text?: string;
    tags?: string[];
};

type SendEmailTemplateInput = {
    to: string;
    subject: string;
    /** SendByte dashboard template UUID or name */
    templateId: string;
    /** Variables interpolated by SendByte into the template */
    variables: Record<string, string | number | boolean>;
    tags?: string[];
};

export type SendEmailInput = SendEmailHtmlInput | SendEmailTemplateInput;

function isTemplateSend(input: SendEmailInput): input is SendEmailTemplateInput {
    return "templateId" in input && Boolean(input.templateId);
}

/**
 * Transactional email via SendByte (https://docs.sendbyte.africa/).
 *
 * - HTML path: pass rendered `html` / `text` (e.g. from Handlebars).
 * - Template path: pass `templateId` + `variables` for SendByte-hosted templates.
 */
export async function sendEmail(input: SendEmailInput) {
    if (!isEmailEnabled()) {
        throw new Error("Email is not configured");
    }

    const payload: Record<string, unknown> = {
        from: env.EMAIL_FROM,
        to: [input.to],
        subject: input.subject,
    };

    if (input.tags?.length) {
        payload.tags = input.tags;
    }

    if (isTemplateSend(input)) {
        payload.template_id = input.templateId;
        payload.variables = input.variables;
    } else {
        payload.html = input.html;
        payload.text =
            input.text ??
            input.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }

    const response = await fetch("https://api.sendbyte.africa/v1/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.SENDBYTE_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Failed to send email: ${body}`);
    }
}

/**
 * Send using a local Handlebars render, or a SendByte dashboard template when id is set.
 */
export async function sendTemplatedEmail(opts: {
    to: string;
    rendered: { subject: string; html: string; text: string; variables: Record<string, string | number> };
    /** Optional SendByte template id/name — when set, variables are passed instead of raw HTML */
    sendbyteTemplateId?: string;
    tags?: string[];
}) {
    if (opts.sendbyteTemplateId) {
        await sendEmail({
            to: opts.to,
            subject: opts.rendered.subject,
            templateId: opts.sendbyteTemplateId,
            variables: opts.rendered.variables,
            tags: opts.tags,
        });
        return;
    }

    await sendEmail({
        to: opts.to,
        subject: opts.rendered.subject,
        html: opts.rendered.html,
        text: opts.rendered.text,
        tags: opts.tags,
    });
}
