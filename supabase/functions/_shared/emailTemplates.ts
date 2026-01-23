type EmailContent = {
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(raw: string): string {
  return raw
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDateShort(iso: string): string {
  try {
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) return iso;
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(ms));
  } catch {
    return iso;
  }
}

function getBrandConfig() {
  const appName = (Deno.env.get('KWILT_EMAIL_APP_NAME') ?? 'Kwilt').trim() || 'Kwilt';
  const logoUrl = (Deno.env.get('KWILT_EMAIL_LOGO_URL') ?? '').trim();
  const primaryColor = (Deno.env.get('KWILT_EMAIL_PRIMARY_COLOR') ?? '#1F5226').trim() || '#1F5226';
  const ctaUrl = (Deno.env.get('KWILT_EMAIL_CTA_URL') ?? 'https://www.kwilt.app').trim() || 'https://www.kwilt.app';
  return { appName, logoUrl: logoUrl || null, primaryColor, ctaUrl };
}

function renderLayout(params: {
  title: string;
  preheader?: string;
  bodyHtml: string;
  footerText?: string;
}): string {
  const { appName, logoUrl, primaryColor } = getBrandConfig();
  const title = params.title.trim();
  const preheader = (params.preheader ?? '').trim();
  const footerText = (params.footerText ?? '').trim();

  const logoBlock = (() => {
    // Ensure the logo renders next to the brand text (per request).
    const img = logoUrl
      ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(appName)}" height="24" style="display:inline-block;height:24px;width:auto;vertical-align:middle;border:0;outline:none;text-decoration:none;margin-right:10px;" />`
      : '';
    const text = `<span style="display:inline-block;vertical-align:middle;font-size:16px;font-weight:900;color:#111827;letter-spacing:0.01em;">${escapeHtml(appName)}</span>`;
    return `<div style="margin:0 0 14px;line-height:24px;">${img}${text}</div>`;
  })();

  // Note: keep HTML conservative for broad email client compatibility.
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
    ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;">${escapeHtml(preheader)}</div>` : ''}
    <div style="max-width:560px;margin:0 auto;padding:28px 16px;">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <div style="padding:20px 20px 0;">
          ${logoBlock}
        </div>
        <div style="padding:0 20px 20px;">
          <h1 style="margin:0 0 12px;font-size:22px;line-height:28px;letter-spacing:-0.01em;">${escapeHtml(title)}</h1>
          <div style="margin:0 0 18px;font-size:15px;line-height:22px;color:#374151;">
            ${params.bodyHtml}
          </div>
          ${
            footerText
              ? `<div style="margin:18px 0 0;padding-top:14px;border-top:1px solid #f3f4f6;font-size:12px;line-height:18px;color:#6b7280;">
                   ${escapeHtml(footerText)}
                 </div>`
              : ''
          }
        </div>
      </div>
    </div>
  </body>
</html>`;
}

export function buildProGrantEmail(params: { expiresAtIso: string }): EmailContent {
  const { primaryColor, ctaUrl } = getBrandConfig();
  const subject = 'Your Kwilt Pro access has been granted';
  const expiresDate = formatDateShort(params.expiresAtIso);

  const text =
    `Your Kwilt Pro access has been granted!\n\n` +
    `You now have access to all Pro features.\n` +
    `Your Pro subscription expires: ${expiresDate}\n\n` +
    `Thank you for using Kwilt!`;

  const html = renderLayout({
    title: 'Pro access granted',
    preheader: `Your Kwilt Pro access has been granted (expires ${expiresDate}).`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Your <strong>Kwilt Pro</strong> access is active.</p>
      <div style="margin:0 0 14px;padding:12px 14px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb;">
        <div style="font-size:13px;color:#6b7280;margin:0 0 6px;">Expires</div>
        <div style="font-size:16px;font-weight:900;color:#111827;">${escapeHtml(expiresDate)}</div>
      </div>
      <p style="margin:0 0 14px;">You now have access to all Pro features.</p>
      <div style="margin:0;">
        <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:${escapeHtml(primaryColor)};color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:12px;font-weight:900;">
          Enjoy Pro
        </a>
      </div>
    `,
    // Intentionally no footer text; this is a no-reply sender.
    footerText: '',
  });

  return { subject, text, html };
}

export function buildProCodeEmail(params: { code: string; note?: string | null }): EmailContent {
  const { primaryColor } = getBrandConfig();
  const code = params.code.trim();
  const note = (params.note ?? '').trim();
  const subject = 'Your Kwilt Pro access code';

  const text =
    `Here’s your Kwilt Pro access code:\n\n${code}\n\n` +
    `Open Kwilt → Settings → Redeem Pro code.\n` +
    (note ? `\nNote: ${note}\n` : '');

  const html = renderLayout({
    title: 'Your Pro access code',
    preheader: 'Here is your Kwilt Pro access code.',
    bodyHtml: `
      <p style="margin:0 0 12px;">Here’s your Kwilt Pro access code:</p>
      <div style="margin:0 0 16px;padding:14px 16px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb;">
        <div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace;font-size:18px;letter-spacing:0.06em;font-weight:800;color:#111827;">
          ${escapeHtml(code)}
        </div>
      </div>
      <div style="margin:0 0 14px;padding:12px 14px;border-radius:12px;background:#ffffff;border:1px solid #e5e7eb;">
        <div style="font-size:13px;color:#6b7280;margin:0 0 6px;">Redeem in-app</div>
        <div style="font-size:14px;color:#111827;">
          Open <strong>Kwilt</strong> → <strong>Settings</strong> → <strong>Redeem Pro code</strong>
        </div>
      </div>
      <div style="margin:0 0 12px;">
        <span style="display:inline-block;background:${escapeHtml(primaryColor)};color:#ffffff;padding:10px 14px;border-radius:12px;font-weight:900;">
          Redeem code
        </span>
      </div>
      ${note ? `<p style="margin:0;color:#6b7280;"><strong>Note:</strong> ${escapeHtml(note)}</p>` : ''}
    `,
    footerText: '',
  });

  return { subject, text, html };
}

export function buildGoalInviteEmail(params: { goalTitle: string; inviteLink: string }): EmailContent {
  const { primaryColor } = getBrandConfig();
  const title = params.goalTitle.trim() || 'Shared goal';
  const inviteLink = params.inviteLink.trim();
  const subject = `Join my shared goal in Kwilt`;

  const text =
    `${subject}: "${title}"\n\n` +
    `Open invite: ${inviteLink}\n\n` +
    `By default you share signals only (check-ins + cheers). Activity titles stay private unless you choose to share them.`;

  const html = renderLayout({
    title: 'Join my shared goal in Kwilt',
    preheader: `Invite to "${title}"`,
    bodyHtml: `
      <p style="margin:0 0 12px;"><strong>“${escapeHtml(title)}”</strong></p>
      <p style="margin:0 0 16px;color:#6b7280;">
        By default you share signals only (check-ins + cheers). Activity titles stay private unless you choose to share them.
      </p>
      <a href="${escapeHtml(inviteLink)}" style="display:inline-block;background:${escapeHtml(primaryColor)};color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:12px;font-weight:800;">
        Open invite
      </a>
      <p style="margin:16px 0 0;font-size:13px;line-height:18px;color:#6b7280;">
        If the button doesn’t work, copy and paste this link into your browser:<br/>
        <a href="${escapeHtml(inviteLink)}" style="color:${escapeHtml(primaryColor)};">${escapeHtml(inviteLink)}</a>
      </p>
    `,
    footerText: 'This invite link may expire or reach a usage limit.',
  });

  return { subject, text, html };
}

export function buildSecretExpiryAlertEmail(params: {
  environment: string;
  items: Array<{
    displayName: string;
    secretKey: string;
    provider: string | null;
    expiresAtIso: string;
    daysUntilExpiry: number;
    ownerEmail: string | null;
    rotationUrl: string | null;
    notes: string | null;
    severity: 'warning' | 'expired';
  }>;
}): EmailContent {
  const { primaryColor } = getBrandConfig();
  const env = params.environment.trim() || 'prod';
  const items = params.items;

  const subject =
    items.some((i) => i.severity === 'expired')
      ? `[Kwilt] Secrets expired (${env})`
      : `[Kwilt] Secrets expiring soon (${env})`;

  const lines = items
    .slice()
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
    .map((i) => {
      const when =
        i.severity === 'expired'
          ? `EXPIRED (${formatDateShort(i.expiresAtIso)})`
          : `in ${i.daysUntilExpiry} day${i.daysUntilExpiry === 1 ? '' : 's'} (${formatDateShort(i.expiresAtIso)})`;
      const provider = i.provider ? ` [${i.provider}]` : '';
      return `- ${i.displayName}${provider}\n  key: ${i.secretKey}\n  expires: ${when}${
        i.ownerEmail ? `\n  owner: ${i.ownerEmail}` : ''
      }${i.rotationUrl ? `\n  rotate: ${i.rotationUrl}` : ''}${i.notes ? `\n  notes: ${i.notes}` : ''}`;
    });

  const text =
    `Secret expiry alert (${env})\n\n` +
    (lines.length ? lines.join('\n\n') : 'No items.') +
    `\n\nThis is an automated reminder. Update the expiry record after rotating.`;

  const rowsHtml = items
    .slice()
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
    .map((i) => {
      const badgeBg = i.severity === 'expired' ? '#991b1b' : '#92400e';
      const badgeText = i.severity === 'expired' ? 'EXPIRED' : 'EXPIRING';
      const when =
        i.severity === 'expired'
          ? `${escapeHtml(formatDateShort(i.expiresAtIso))}`
          : `${escapeHtml(String(i.daysUntilExpiry))} day${i.daysUntilExpiry === 1 ? '' : 's'} (${escapeHtml(
              formatDateShort(i.expiresAtIso),
            )})`;
      const rotate = i.rotationUrl
        ? `<a href="${escapeHtml(i.rotationUrl)}" style="color:${escapeHtml(primaryColor)};">Rotate</a>`
        : '';
      const owner = i.ownerEmail ? escapeHtml(i.ownerEmail) : '';
      const provider = i.provider ? escapeHtml(i.provider) : '';
      const notes = i.notes ? escapeHtml(i.notes) : '';
      return `
        <tr>
          <td style="padding:10px 10px;border-top:1px solid #f3f4f6;vertical-align:top;">
            <div style="font-weight:900;color:#111827;margin:0 0 4px;">${escapeHtml(i.displayName)}</div>
            <div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace;font-size:12px;color:#6b7280;">
              ${escapeHtml(i.secretKey)}
            </div>
          </td>
          <td style="padding:10px 10px;border-top:1px solid #f3f4f6;vertical-align:top;color:#111827;">${provider}</td>
          <td style="padding:10px 10px;border-top:1px solid #f3f4f6;vertical-align:top;color:#111827;">${when}</td>
          <td style="padding:10px 10px;border-top:1px solid #f3f4f6;vertical-align:top;color:#111827;">${owner}</td>
          <td style="padding:10px 10px;border-top:1px solid #f3f4f6;vertical-align:top;">${rotate}</td>
        </tr>
        ${notes ? `<tr><td colspan="5" style="padding:0 10px 10px;color:#6b7280;">${notes}</td></tr>` : ''}
      `;
    })
    .join('');

  const html = renderLayout({
    title: `Secret expiry alert (${env})`,
    preheader: subject,
    bodyHtml: `
      <p style="margin:0 0 12px;">
        One or more <strong>provider-side secrets</strong> are expired or expiring soon for <strong>${escapeHtml(env)}</strong>.
      </p>
      <div style="margin:0 0 14px;">
        <span style="display:inline-block;background:${escapeHtml(primaryColor)};color:#ffffff;padding:8px 12px;border-radius:999px;font-weight:900;font-size:12px;">
          Environment: ${escapeHtml(env)}
        </span>
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#ffffff;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="text-align:left;padding:10px 10px;font-size:12px;color:#6b7280;">Secret</th>
            <th style="text-align:left;padding:10px 10px;font-size:12px;color:#6b7280;">Provider</th>
            <th style="text-align:left;padding:10px 10px;font-size:12px;color:#6b7280;">Expires</th>
            <th style="text-align:left;padding:10px 10px;font-size:12px;color:#6b7280;">Owner</th>
            <th style="text-align:left;padding:10px 10px;font-size:12px;color:#6b7280;">Rotate</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <p style="margin:14px 0 0;color:#6b7280;font-size:13px;line-height:18px;">
        After rotating, update the expiry date in Supabase (table: <strong>kwilt_secret_expirations</strong>).
      </p>
    `,
    footerText: 'Automated reminder. This email does not contain secret values.',
  });

  return { subject, text, html };
}


