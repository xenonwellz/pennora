import { env, isEmailEnabled } from "../config";

type SendEmailInput = {
    to: string;
    subject: string;
    html: string;
    text?: string;
};

/**
 * Transactional email via SendByte (https://docs.sendbyte.africa/).
 * Requires SENDBYTE_API_KEY + EMAIL_FROM. Sandbox keys (sk_test_*) need no domain.
 */
export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
    if (!isEmailEnabled()) {
        throw new Error("Email is not configured");
    }

    const response = await fetch("https://api.sendbyte.africa/v1/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.SENDBYTE_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: env.EMAIL_FROM,
            to: [to],
            subject,
            html,
            text: text ?? html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
        }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Failed to send email: ${body}`);
    }
}
