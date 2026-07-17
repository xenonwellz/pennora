/**
 * Composed transactional HTML for Pennora.
 * No template engine — plain functions, table layout, inline CSS.
 *
 * SendByte blocks link_text_mismatch when <a> label ≠ href, so CTAs use a
 * plain-text URL (mail clients auto-link it). Click tracking is disabled at send.
 */

const BRAND = "Pennora";

const colors = {
    bg: "#FCF9E8",
    card: "#FFFFFF",
    ink: "#201B21",
    muted: "#6B6560",
    border: "#E8E4D4",
    footer: "#9A948C",
} as const;

function esc(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/** Escape URL for HTML text without breaking = ? & for auto-linking */
function escUrl(url: string): string {
    return url.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export type ComposedEmail = {
    subject: string;
    html: string;
    text: string;
};

function layout(opts: {
    title: string;
    preheader: string;
    paragraphs: string[];
    linkLabel: string;
    url: string;
    footer: string;
}): string {
    const paras = opts.paragraphs
        .map(
            (p) =>
                `<p style="margin:0 0 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${colors.muted};">${p}</p>`,
        )
        .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${colors.bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.bg};">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:${colors.card};border:1px solid ${colors.border};border-radius:16px;">
          <!-- header -->
          <tr>
            <td style="padding:24px 28px;border-bottom:1px solid ${colors.border};">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:36px;height:36px;border-radius:10px;background:${colors.ink};color:${colors.bg};font-family:system-ui,sans-serif;font-size:16px;font-weight:700;text-align:center;line-height:36px;">P</td>
                  <td style="padding-left:12px;font-family:system-ui,sans-serif;font-size:16px;font-weight:700;color:${colors.ink};">${BRAND}</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- body -->
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 16px;font-family:system-ui,sans-serif;font-size:22px;font-weight:700;line-height:1.3;color:${colors.ink};">${esc(opts.title)}</h1>
              ${paras}
              <p style="margin:20px 0 8px;font-family:system-ui,sans-serif;font-size:13px;font-weight:600;color:${colors.ink};">${esc(opts.linkLabel)}</p>
              <div style="padding:14px 16px;background:${colors.bg};border:1px solid ${colors.border};border-radius:10px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;line-height:1.5;word-break:break-all;color:${colors.ink};">
                ${escUrl(opts.url)}
              </div>
            </td>
          </tr>
          <!-- footer -->
          <tr>
            <td style="padding:18px 28px;border-top:1px solid ${colors.border};font-family:system-ui,sans-serif;font-size:12px;line-height:1.5;color:${colors.footer};">
              ${esc(opts.footer)}<br />
              &copy; ${new Date().getFullYear()} ${BRAND}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function passwordResetEmail(url: string): ComposedEmail {
    const subject = `Reset your ${BRAND} password`;
    const html = layout({
        title: "Reset your password",
        preheader: "Choose a new password for your Pennora account.",
        paragraphs: [
            `We received a request to reset the password for your ${BRAND} account.`,
            "Copy the link below into your browser to choose a new password. This link expires soon for your security.",
            "If you did not request this, you can ignore this email — your password will not change.",
        ],
        linkLabel: "Reset link",
        url,
        footer: "If you did not ask to reset your password, no further action is needed.",
    });
    const text = [
        subject,
        "",
        `We received a request to reset the password for your ${BRAND} account.`,
        "Open this link to choose a new password:",
        url,
        "",
        "If you did not request this, you can ignore this email.",
    ].join("\n");
    return { subject, html, text };
}

export function budgetInviteEmail(opts: {
    budgetName: string;
    inviteUrl: string;
    expiresInDays: number;
}): ComposedEmail {
    const subject = `You're invited to ${opts.budgetName} on ${BRAND}`;
    const html = layout({
        title: "You're invited to collaborate",
        preheader: `Join “${opts.budgetName}” on Pennora.`,
        paragraphs: [
            `You've been invited to work on <strong style="color:${colors.ink};">${esc(opts.budgetName)}</strong> in ${BRAND}.`,
            "Copy the link below into your browser to accept and start collaborating.",
            `This link expires in <strong style="color:${colors.ink};">${opts.expiresInDays} days</strong>.`,
        ],
        linkLabel: "Invitation link",
        url: opts.inviteUrl,
        footer: "If you were not expecting this invite, you can ignore this email.",
    });
    const text = [
        subject,
        "",
        `You've been invited to collaborate on “${opts.budgetName}”.`,
        "Open this link to accept:",
        opts.inviteUrl,
        "",
        `This link expires in ${opts.expiresInDays} days.`,
    ].join("\n");
    return { subject, html, text };
}
