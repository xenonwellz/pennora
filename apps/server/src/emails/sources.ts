/**
 * Handlebars sources (bundled into dist — do not load from disk at runtime).
 * Use {{var}} for escaped output; {{{url}}} only when needed in href (we keep matching text).
 *
 * SendByte abuse filter: every <a href="X"> must show X as link text (link_text_mismatch).
 */

export const layoutPartial = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>{{title}}</title>
</head>
<body style="margin:0;padding:0;background:#FCF9E8;">
  {{#if preheader}}
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">{{preheader}}</div>
  {{/if}}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FCF9E8;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#FFFFFF;border:1px solid #E8E4D4;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 12px;border-bottom:1px solid #E8E4D4;background:#FCF9E8;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width:36px;height:36px;border-radius:10px;background:#201B21;color:#FCF9E8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:18px;font-weight:700;text-align:center;line-height:36px;">P</td>
                  <td style="padding-left:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#201B21;">{{brandName}}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 0 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;line-height:1.25;color:#201B21;">{{title}}</td>
                </tr>
                <tr>
                  <td style="padding:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#6B6560;">
                    {{{bodyHtml}}}
                  </td>
                </tr>
                {{#if url}}
                <tr>
                  <td style="padding:16px 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;color:#201B21;">{{ctaLabel}}</td>
                </tr>
                <tr>
                  <td style="padding:0 0 12px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FCF9E8;border:1px solid #E8E4D4;border-radius:10px;">
                      <tr>
                        <td style="padding:14px 16px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:12px;line-height:1.5;word-break:break-all;">
                          <a href="{{urlAttr url}}" style="color:#201B21;text-decoration:underline;">{{urlAttr url}}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                {{/if}}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;border-top:1px solid #E8E4D4;background:#FCF9E8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#9A948C;">
              {{footerNote}}<br />© {{year}} {{brandName}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

/** Inner body fragment for password reset (HTML, unescaped via {{{bodyHtml}}}) */
export const passwordResetBody = `
<p style="margin:0 0 12px;">We received a request to reset the password for your {{brandName}} account.</p>
<p style="margin:0 0 12px;">Open the link below to choose a new password. This link expires soon for your security.</p>
<p style="margin:0;">If you did not request this, you can safely ignore this email — your password will not change.</p>
`;

export const passwordResetText = `Reset your {{brandName}} password

We received a request to reset the password for your {{brandName}} account.
Open this link to choose a new password:
{{url}}

If you did not request this, you can ignore this email.
`;

export const budgetInviteBody = `
<p style="margin:0 0 12px;">You have been invited to work on <strong style="color:#201B21;">{{budgetName}}</strong> in {{brandName}}.</p>
<p style="margin:0 0 12px;">Open the link below to accept and collaborate on this shared budget.</p>
<p style="margin:0;">This link expires in <strong style="color:#201B21;">{{expiresInDays}} days</strong>.</p>
`;

export const budgetInviteText = `You are invited to {{budgetName}} on {{brandName}}

You have been invited to collaborate on "{{budgetName}}".
Open this link to accept:
{{url}}

This link expires in {{expiresInDays}} days.
`;
