/**
 * Solid, table-based HTML email templates for Pennora.
 * Inline styles for broad client support (Gmail, Apple Mail, Outlook web).
 */

const BRAND = {
    name: "Pennora",
    bg: "#FCF9E8",
    card: "#FFFFFF",
    ink: "#201B21",
    muted: "#6B6560",
    border: "#E8E4D4",
    buttonBg: "#201B21",
    buttonText: "#FCF9E8",
    footer: "#9A948C",
} as const;

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

type EmailLayoutOptions = {
    preheader?: string;
    title: string;
    bodyHtml: string;
    cta?: { label: string; url: string };
    footerNote?: string;
};

export function renderEmailLayout({
    preheader,
    title,
    bodyHtml,
    cta,
    footerNote,
}: EmailLayoutOptions): string {
    const safeTitle = escapeHtml(title);
    const pre = preheader ? escapeHtml(preheader) : "";

    const ctaBlock = cta
        ? `
      <tr>
        <td style="padding: 8px 0 28px;">
          <a href="${escapeHtml(cta.url)}"
             style="display:inline-block;background:${BRAND.buttonBg};color:${BRAND.buttonText};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;line-height:1;text-decoration:none;padding:14px 28px;border-radius:10px;">
            ${escapeHtml(cta.label)}
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.muted};">
          Or copy this link into your browser:<br />
          <a href="${escapeHtml(cta.url)}" style="color:${BRAND.ink};word-break:break-all;">${escapeHtml(cta.url)}</a>
        </td>
      </tr>`
        : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};">
  ${pre ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${pre}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 12px;border-bottom:1px solid ${BRAND.border};background:${BRAND.bg};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width:36px;height:36px;border-radius:10px;background:${BRAND.ink};color:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:18px;font-weight:700;text-align:center;line-height:36px;">
                    P
                  </td>
                  <td style="padding-left:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;">
                    ${BRAND.name}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 0 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;line-height:1.25;color:${BRAND.ink};">
                    ${safeTitle}
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.muted};">
                    ${bodyHtml}
                  </td>
                </tr>
                ${ctaBlock}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;border-top:1px solid ${BRAND.border};background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.footer};">
              ${footerNote ? escapeHtml(footerNote) : `You’re receiving this because of activity on your ${BRAND.name} account.`}
              <br />
              © ${new Date().getFullYear()} ${BRAND.name}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function passwordResetEmail(url: string): { subject: string; html: string; text: string } {
    const subject = "Reset your Pennora password";
    const html = renderEmailLayout({
        preheader: "Use this link to choose a new password for your Pennora account.",
        title: "Reset your password",
        bodyHtml: `
          <p style="margin:0 0 12px;">We received a request to reset the password for your Pennora account.</p>
          <p style="margin:0 0 12px;">Click the button below to choose a new password. This link expires soon for your security.</p>
          <p style="margin:0;">If you didn’t request this, you can safely ignore this email — your password won’t change.</p>
        `,
        cta: { label: "Reset password", url },
        footerNote: "If you didn’t ask to reset your password, no further action is needed.",
    });
    const text = [
        "Reset your Pennora password",
        "",
        "We received a request to reset the password for your Pennora account.",
        `Open this link to choose a new password: ${url}`,
        "",
        "If you didn’t request this, you can ignore this email.",
    ].join("\n");
    return { subject, html, text };
}

export function budgetInviteEmail(opts: {
    budgetName: string;
    inviteUrl: string;
    expiresInDays: number;
}): { subject: string; html: string; text: string } {
    const name = escapeHtml(opts.budgetName);
    const subject = `You’re invited to ${opts.budgetName} on Pennora`;
    const html = renderEmailLayout({
        preheader: `Join “${opts.budgetName}” on Pennora and start collaborating.`,
        title: "You’re invited to collaborate",
        bodyHtml: `
          <p style="margin:0 0 12px;">You’ve been invited to work on <strong style="color:${BRAND.ink};">${name}</strong> in Pennora.</p>
          <p style="margin:0 0 12px;">Accept the invitation to view and manage this shared budget with your team or household.</p>
          <p style="margin:0;">This link expires in <strong style="color:${BRAND.ink};">${opts.expiresInDays} days</strong>.</p>
        `,
        cta: { label: "Accept invitation", url: opts.inviteUrl },
        footerNote: "If you weren’t expecting this invite, you can ignore this email.",
    });
    const text = [
        `You’re invited to ${opts.budgetName} on Pennora`,
        "",
        `You’ve been invited to collaborate on “${opts.budgetName}”.`,
        `Accept: ${opts.inviteUrl}`,
        `This link expires in ${opts.expiresInDays} days.`,
    ].join("\n");
    return { subject, html, text };
}
