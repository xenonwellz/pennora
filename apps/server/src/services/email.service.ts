import { env, isEmailEnabled } from "../config";

type SendEmailInput = {
    to: string;
    subject: string;
    html: string;
    text?: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
    if (!isEmailEnabled()) {
        throw new Error("Email is not configured");
    }

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: env.EMAIL_FROM,
            to: [to],
            subject,
            html,
            text: text ?? html.replace(/<[^>]+>/g, ""),
        }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Failed to send email: ${body}`);
    }
}
