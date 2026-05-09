import { formatHumanPeriodLabel, type PeriodCadence } from './periodLabels.ts';
import { hasAnyRecommendation } from './chapterRecommendations.ts';

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
  return { appName, logoUrl: logoUrl || null, primaryColor };
}

/**
 * CAN-SPAM requires a valid physical postal address on every commercial
 * email. We surface it via `KWILT_COMPANY_POSTAL_ADDRESS` (single line, or
 * `|`-separated for multi-line rendering) and show it in the footer of
 * every email that already has a footer. Transactional templates without a
 * footer (e.g. Pro grant, Pro code) skip this since they're exempt from
 * CAN-SPAM's commercial-content rules — but if you add a `footerText` to
 * them, they'll pick up the postal address automatically.
 */
function getCompanyPostalAddress(): string[] {
  const raw = (Deno.env.get('KWILT_COMPANY_POSTAL_ADDRESS') ?? '').trim();
  if (!raw) return [];
  return raw
    .split('|')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

// ---------------------------------------------------------------------------
// Universal-link CTA helpers (Phase 3 of email-system-ga-plan.md)
// ---------------------------------------------------------------------------
//
// All template CTAs go through `makeOpenUrl` which produces a
// `https://go.kwilt.app/open/<path>?utm_*` URL. That URL universal-links into
// the installed app on iOS/Android (via the kwilt-site `/open/[[...slug]]`
// route + AASA/assetlinks) and falls back to a helpful install page on
// desktop or when the app isn't installed.
//
// We never embed legacy custom-scheme URLs (kwilt-colon-slash-slash) or root
// marketing URLs (www-dot-kwilt-dot-app) in emails — both are dead-ends on at
// least one common surface. The `__tests__/emailTemplates.test.ts` CI guard
// enforces this.

function getOpenBaseUrl(): string {
  const fromEnv = (Deno.env.get('KWILT_EMAIL_OPEN_BASE_URL') ?? '').trim();
  return fromEnv || 'https://go.kwilt.app/open';
}

function makeOpenUrl(
  path: string,
  params: Record<string, string> = {},
  campaign?: string,
): string {
  const base = getOpenBaseUrl().replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');
  const url = new URL(`${base}/${cleanPath}`);
  url.searchParams.set('utm_source', 'email');
  url.searchParams.set('utm_medium', 'email');
  if (campaign) url.searchParams.set('utm_campaign', campaign);
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    url.searchParams.set(k, v);
  }
  return url.toString();
}

// ---------------------------------------------------------------------------
// Shared layout primitives (Phase 5 of email-system-ga-plan.md)
// ---------------------------------------------------------------------------
//
// Every user-facing template body should compose from three primitives:
//   - renderCta(href, label)       → the single pine button
//   - renderFallbackLink(href)     → the "if the button doesn't work" link
//   - renderFooter(body)           → the small muted sign-off
//
// No template should hand-roll `<a style="display:inline-block;background:...">`
// button HTML anymore. When you need a visual variation, add it here so every
// template stays in rhythm.

/** The single pine CTA button used across every non-admin template. */
function renderCta(href: string, label: string): string {
  const { primaryColor } = getBrandConfig();
  return `
      <div style="margin:0 0 10px;">
        <a href="${escapeHtml(href)}" style="display:inline-block;background:${escapeHtml(primaryColor)};color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;font-size:15px;line-height:20px;">
          ${escapeHtml(label)}
        </a>
      </div>`;
}

/**
 * A secondary, text-only CTA to sit beneath a primary `renderCta` button.
 * Used when a template wants to offer a soft alternative action without
 * competing with the primary call to action (e.g. the chapter digest's
 * Phase 7.3 "What did we miss? Add a line" link). Kept small + muted so
 * it reads as *after* the primary button, not *next to it*.
 */
function renderSecondaryLink(href: string, label: string): string {
  const { primaryColor } = getBrandConfig();
  return `
      <p style="margin:0 0 8px;font-size:13px;line-height:20px;color:#6b7280;">
        <a href="${escapeHtml(href)}" style="color:${escapeHtml(primaryColor)};text-decoration:underline;">
          ${escapeHtml(label)}
        </a>
      </p>`;
}

/** Standard "if the button doesn't work" paragraph to append below every CTA. */
function renderFallbackLink(href: string): string {
  const { primaryColor } = getBrandConfig();
  const escaped = escapeHtml(href);
  return `
      <p style="margin:12px 0 0;font-size:13px;line-height:18px;color:#6b7280;">
        If the button doesn\u2019t work, copy and paste this link into your browser:<br/>
        <a href="${escaped}" style="color:${escapeHtml(primaryColor)};word-break:break-all;">${escaped}</a>
      </p>`;
}

/**
 * Small muted sign-off. No top border — whitespace is the separator.
 *
 * When an `unsubscribeUrl` is provided, appends a visible one-click
 * unsubscribe link on its own line so the footer stays CAN-SPAM / Gmail
 * 2024 compliant without relying on the inbox-native unsubscribe button
 * alone. The link label is intentionally generic ("Unsubscribe") — the
 * confirmation page on kwilt-site spells out the exact category.
 *
 * When `KWILT_COMPANY_POSTAL_ADDRESS` is set (single line or `|`-separated
 * multi-line), we append it as a separate muted line below the rationale /
 * unsubscribe link. This is the CAN-SPAM physical address disclosure.
 */
function renderFooter(body: string, unsubscribeUrl?: string): string {
  const trimmed = body.trim();
  const href = (unsubscribeUrl ?? '').trim();
  if (!trimmed && !href) return '';
  const { primaryColor } = getBrandConfig();
  const addressLines = getCompanyPostalAddress();
  const rationale = trimmed
    ? `<div>${escapeHtml(trimmed)}</div>`
    : '';
  const unsub = href
    ? `<div style="margin-top:8px;"><a href="${escapeHtml(href)}" style="color:${escapeHtml(
        primaryColor,
      )};text-decoration:underline;">Unsubscribe</a></div>`
    : '';
  const address = addressLines.length
    ? `<div style="margin-top:8px;color:#9ca3af;">${addressLines
        .map((line) => escapeHtml(line))
        .join('<br/>')}</div>`
    : '';
  return `
      <div style="margin:28px 0 0;font-size:12px;line-height:18px;color:#6b7280;">
        ${rationale}
        ${unsub}
        ${address}
      </div>`;
}

function renderLayout(params: {
  title: string;
  preheader?: string;
  bodyHtml: string;
  /** Passed through renderFooter internally — no top border, just whitespace. */
  footerText?: string;
  /**
   * Phase 7.1: the kwilt-site visible unsubscribe URL (a signed token URL
   * on the `kwilt.app/unsubscribe` route, built in
   * `_shared/emailUnsubscribe.ts::buildVisibleUnsubscribeUrl`). When
   * present, `renderFooter` adds an "Unsubscribe" link below the rationale
   * text. Transactional templates should leave this unset.
   */
  unsubscribeUrl?: string;
}): string {
  const { appName, logoUrl } = getBrandConfig();
  const title = params.title.trim();
  const preheader = (params.preheader ?? '').trim();
  const footerText = (params.footerText ?? '').trim();
  const unsubscribeUrl = (params.unsubscribeUrl ?? '').trim();

  const logoBlock = (() => {
    // Square mark + wordmark text. Outlook desktop ignores CSS-only sizing on
    // <img>, so explicit width/height HTML attrs are required here — see
    // email-system-ga-plan.md Phase 4.2.
    const img = logoUrl
      ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(appName)}" width="24" height="24" style="display:inline-block;width:24px;height:24px;vertical-align:middle;border:0;outline:none;text-decoration:none;margin-right:10px;" />`
      : '';
    const text = `<span style="display:inline-block;vertical-align:middle;font-size:16px;font-weight:900;color:#111827;letter-spacing:0.01em;">${escapeHtml(appName)}</span>`;
    return `<div style="margin:0 0 20px;line-height:24px;">${img}${text}</div>`;
  })();

  // Phase 5: single surface (no gray canvas + white card). The body background
  // is pure white; the 500px content column sits directly on it. Whitespace,
  // not borders, separates sections. Dark-mode color-scheme hints let Apple
  // Mail auto-invert cleanly.
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
    ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;">${escapeHtml(preheader)}</div>` : ''}
    <div style="max-width:500px;margin:0 auto;padding:32px 24px;">
      ${logoBlock}
      <h1 style="margin:0 0 14px;font-size:24px;line-height:30px;letter-spacing:-0.01em;color:#111827;font-weight:900;">${escapeHtml(title)}</h1>
      <div style="margin:0;font-size:16px;line-height:24px;color:#1f2937;">
        ${params.bodyHtml}
      </div>
      ${footerText || unsubscribeUrl ? renderFooter(footerText, unsubscribeUrl || undefined) : ''}
    </div>
  </body>
</html>`;
}

// ---------------------------------------------------------------------------
// Pro grant / Pro code / Goal invite
// ---------------------------------------------------------------------------

export function buildProGrantEmail(params: { expiresAtIso: string }): EmailContent {
  const subject = 'Your Kwilt Pro access is active';
  const expiresDate = formatDateShort(params.expiresAtIso);
  const ctaUrl = makeOpenUrl('settings/subscription', {}, 'pro_granted');

  const text = [
    'Your Kwilt Pro access is active — every Pro feature is unlocked.',
    `Your subscription expires on ${expiresDate}.`,
    'Manage your subscription:',
    ctaUrl,
  ].join('\n\n');

  const html = renderLayout({
    title: 'Your Pro access is active',
    preheader: `Every Pro feature is unlocked through ${expiresDate}.`,
    bodyHtml: `
      <p style="margin:0 0 14px;">Your <strong>Kwilt Pro</strong> access is active \u2014 every Pro feature is unlocked.</p>
      <p style="margin:0 0 24px;">Your subscription expires on <strong>${escapeHtml(expiresDate)}</strong>.</p>
      ${renderCta(ctaUrl, 'Manage subscription')}
      ${renderFallbackLink(ctaUrl)}
    `,
  });

  return { subject, text, html };
}

export function buildProCodeEmail(params: { code: string; note?: string | null }): EmailContent {
  const code = params.code.trim();
  const note = (params.note ?? '').trim();
  const subject = 'Your Kwilt Pro access code';

  const text =
    `Here is your Kwilt Pro access code:\n\n${code}\n\n` +
    `Open Kwilt \u2192 Settings \u2192 Redeem Pro code.` +
    (note ? `\n\nNote: ${note}` : '');

  const html = renderLayout({
    title: 'Your Pro access code',
    preheader: 'Copy the code and redeem it from Settings.',
    bodyHtml: `
      <p style="margin:0 0 14px;">Here is your Kwilt Pro access code:</p>
      <div style="margin:0 0 18px;padding:14px 16px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb;">
        <div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace;font-size:18px;letter-spacing:0.06em;font-weight:800;color:#111827;">${escapeHtml(code)}</div>
      </div>
      <p style="margin:0 0 18px;">Open <strong>Kwilt</strong> \u2192 <strong>Settings</strong> \u2192 <strong>Redeem Pro code</strong>.</p>
      ${note ? `<p style="margin:0;color:#6b7280;"><strong>Note:</strong> ${escapeHtml(note)}</p>` : ''}
    `,
  });

  return { subject, text, html };
}

export function buildGoalInviteEmail(params: { goalTitle: string; inviteLink: string }): EmailContent {
  const title = params.goalTitle.trim() || 'Shared goal';
  const inviteLink = params.inviteLink.trim();
  const subject = 'Join my shared goal in Kwilt';

  const text = [
    `${subject}: "${title}"`,
    'Open invite:',
    inviteLink,
    'By default you share signals only (check-ins + cheers). Activity titles stay private unless you choose to share them.',
  ].join('\n\n');

  const html = renderLayout({
    title: 'Join my shared goal in Kwilt',
    preheader: `Invite to "${title}" \u2014 join with one tap.`,
    bodyHtml: `
      <p style="margin:0 0 14px;"><strong>\u201C${escapeHtml(title)}\u201D</strong></p>
      <p style="margin:0 0 24px;color:#6b7280;">By default you share signals only (check-ins + cheers). Activity titles stay private unless you choose to share them.</p>
      ${renderCta(inviteLink, 'Open invite')}
      ${renderFallbackLink(inviteLink)}
    `,
    footerText: 'This invite link may expire or reach a usage limit.',
  });

  return { subject, text, html };
}

function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function buildSharedGoalDigestEmail(params: {
  goalId: string;
  checkins: number;
  cheers: number;
  replies: number;
}): EmailContent {
  const goalId = params.goalId.trim();
  const checkins = Math.max(0, Math.floor(params.checkins));
  const cheers = Math.max(0, Math.floor(params.cheers));
  const replies = Math.max(0, Math.floor(params.replies));
  const subject = 'Your shared goal got attention this week';
  const ctaUrl = makeOpenUrl(`goal/${goalId}`, {}, 'share_digest');
  const activityLine = `Your shared goal had ${countLabel(checkins, 'check-in')}, ${countLabel(cheers, 'cheer')}, and ${countLabel(replies, 'reply', 'replies')} this week.`;
  const nextLine = 'Open Kwilt to see what moved and add your own note.';

  const text = [
    subject,
    activityLine,
    nextLine,
    ctaUrl,
  ].join('\n\n');

  const html = renderLayout({
    title: subject,
    preheader: 'See what moved and add your own note.',
    bodyHtml: `
      <p style="margin:0 0 14px;">${escapeHtml(activityLine)}</p>
      <p style="margin:0 0 24px;color:#6b7280;">${escapeHtml(nextLine)}</p>
      ${renderCta(ctaUrl, 'Open shared goal')}
      ${renderFallbackLink(ctaUrl)}
    `,
    footerText: 'You’re receiving this because you share a goal in Kwilt.',
  });

  return { subject, text, html };
}

// ---------------------------------------------------------------------------
// Welcome drip emails (days 0, 1, 3, 7)
// ---------------------------------------------------------------------------

export function buildWelcomeDay0Email(opts: { unsubscribeUrl?: string } = {}): EmailContent {
  const subject = 'Welcome to Kwilt \u2014 start with one Arc';
  const ctaUrl = makeOpenUrl('today', {}, 'welcome_day_0');

  const text = [
    'Welcome to Kwilt.',
    'You’ve taken the first step toward making room for what matters.',
    'Kwilt helps you name what matters and give it real time. Start by defining one Arc \u2014 a meaningful direction for your life right now.',
    ctaUrl,
  ].join('\n\n');

  const html = renderLayout({
    title: 'Welcome to Kwilt',
    preheader: 'Start with one meaningful direction.',
    bodyHtml: `
      <p style="margin:0 0 14px;">You\u2019ve taken the first step toward making room for what matters.</p>
      <p style="margin:0 0 24px;">Kwilt helps you name what matters and give it real time. Start by defining one <strong>Arc</strong> \u2014 a meaningful direction for your life right now.</p>
      ${renderCta(ctaUrl, 'Open Kwilt')}
      ${renderFallbackLink(ctaUrl)}
    `,
    footerText: 'You\u2019re receiving this because you signed up for Kwilt.',
    unsubscribeUrl: opts.unsubscribeUrl,
  });

  return { subject, text, html };
}

export function buildWelcomeDay1Email(opts: { unsubscribeUrl?: string } = {}): EmailContent {
  const subject = 'Your first small step';
  const ctaUrl = makeOpenUrl('today', {}, 'welcome_day_1');

  const text = [
    'Ready to make one thing move?',
    'Complete your first Activity in Kwilt today \u2014 even something small counts. That is enough to start.',
    ctaUrl,
  ].join('\n\n');

  const html = renderLayout({
    title: subject,
    preheader: 'Small counts. Start there.',
    bodyHtml: `
      <p style="margin:0 0 14px;">Ready to make one thing move?</p>
      <p style="margin:0 0 24px;">Complete your first <strong>Activity</strong> in Kwilt today \u2014 even something small counts. That is enough to start.</p>
      ${renderCta(ctaUrl, 'Open Kwilt')}
      ${renderFallbackLink(ctaUrl)}
    `,
    footerText: 'You\u2019re receiving this because you signed up for Kwilt.',
    unsubscribeUrl: opts.unsubscribeUrl,
  });

  return { subject, text, html };
}

export function buildWelcomeDay3Email(
  params: { streakLength: number; unsubscribeUrl?: string },
): EmailContent {
  const streak = params.streakLength;
  const streakLine =
    streak >= 2 ? `You\u2019ve shown up for ${streak} days \u2014 nice work.` : 'You can start with one small action today.';
  const subject = 'How\u2019s your first Arc going?';
  const planUrl = makeOpenUrl('plan', {}, 'welcome_day_3');

  const text = [
    subject,
    streakLine,
    'Open Plan to see your week at a glance and choose what deserves calendar time.',
    planUrl,
  ].join('\n\n');

  const html = renderLayout({
    title: subject,
    preheader: 'A quick check on your first Arc.',
    bodyHtml: `
      <p style="margin:0 0 14px;">${escapeHtml(streakLine)}</p>
      <p style="margin:0 0 24px;">Open <strong>Plan</strong> to see your week at a glance and choose what deserves calendar time.</p>
      ${renderCta(planUrl, 'Open Plan')}
      ${renderFallbackLink(planUrl)}
    `,
    footerText: 'You\u2019re receiving this because you signed up for Kwilt.',
    unsubscribeUrl: params.unsubscribeUrl,
  });

  return { subject, text, html };
}

export function buildWelcomeDay7Email(
  params: { streakLength: number; activitiesCompleted: number; unsubscribeUrl?: string },
): EmailContent {
  const ctaUrl = makeOpenUrl('today', {}, 'welcome_day_7');
  const streak = params.streakLength;
  const completed = params.activitiesCompleted;
  const subject = 'Your first week in review';

  // Phase 5.3: the old stats card collapses into an inline sentence. Type
  // hierarchy (strong) carries the weight, not a framed box.
  const streakFragmentHtml =
    streak >= 2 ? `a <strong>${streak}-day</strong> show-up streak` : 'your first day showing up';
  const activitiesFragmentHtml =
    completed === 1 ? 'completed <strong>1 activity</strong>' : `completed <strong>${completed} activities</strong>`;
  const inlineStatsHtml = `You built ${streakFragmentHtml} and ${activitiesFragmentHtml}.`;

  const streakFragmentText = streak >= 2 ? `a ${streak}-day show-up streak` : 'your first day showing up';
  const activitiesFragmentText = completed === 1 ? 'completed 1 activity' : `completed ${completed} activities`;
  const inlineStatsText = `You built ${streakFragmentText} and ${activitiesFragmentText}.`;

  const preheader =
    streak >= 2
      ? `${streak}-day streak \u00B7 ${completed} activit${completed === 1 ? 'y' : 'ies'} completed`
      : `${completed} activit${completed === 1 ? 'y' : 'ies'} completed in week one`;

  const text = [
    'Your first week in Kwilt.',
    inlineStatsText,
    'You made progress this week. Pick one thing worth protecting next.',
    ctaUrl,
  ].join('\n\n');

  const html = renderLayout({
    title: subject,
    preheader,
    bodyHtml: `
      <p style="margin:0 0 14px;">${inlineStatsHtml}</p>
      <p style="margin:0 0 24px;">You made progress this week. Pick one thing worth protecting next.</p>
      ${renderCta(ctaUrl, 'Open Kwilt')}
      ${renderFallbackLink(ctaUrl)}
    `,
    footerText: 'You\u2019re receiving this because you signed up for Kwilt.',
    unsubscribeUrl: params.unsubscribeUrl,
  });

  return { subject, text, html };
}

// ---------------------------------------------------------------------------
// Chapter digest email
// ---------------------------------------------------------------------------

/**
 * Extract a human-readable narrative snippet from a chapter `output_json`.
 *
 * Preference order (docs/chapters-plan.md Phase 3.1 + 3.4):
 *   1. `output_json.sections[?(key === 'signal')].caption` — a short, pre-
 *      composed lede the generator writes specifically for list cards +
 *      digest emails. Length is validator-capped at 80–320 chars; we emit
 *      it verbatim and skip the article-body truncation heuristic.
 *   2. `output_json.sections[?(key === 'story')].body` — the article body
 *      (legacy source for pre-Phase-3 chapters and a safety net for any
 *      future `signal`-less outputs).
 *   3. `output_json.narrative` (legacy flat string) or the first section
 *      with a string `body`.
 *
 * For the article-body fall-through, we slice at the first paragraph break
 * (double newline) when one appears within `maxChars`, otherwise at the
 * last word boundary before `maxChars` with a single ellipsis. Returns ''
 * if no narrative could be located.
 */
export function extractChapterSnippet(outputJson: unknown, maxChars = 280): string {
  const caption = pickChapterCaption(outputJson);
  if (caption) {
    const trimmed = caption.trim();
    if (trimmed.length <= maxChars) return trimmed;
    // Caption exceeds maxChars (rare — validator caps at 320, email calls
    // with 280). Truncate at a word boundary so the email still renders
    // cleanly.
    const slice = trimmed.slice(0, maxChars - 1);
    const lastSpace = slice.lastIndexOf(' ');
    const safe = lastSpace > maxChars * 0.6 ? slice.slice(0, lastSpace) : slice;
    return `${safe.trimEnd()}\u2026`;
  }

  const narrative = pickChapterNarrative(outputJson);
  if (!narrative) return '';
  const cleaned = narrative.replace(/\r\n/g, '\n').trim();
  if (!cleaned) return '';

  // Prefer the first paragraph if it fits within the budget.
  const paragraphBreak = cleaned.indexOf('\n\n');
  const firstParagraph = paragraphBreak >= 0 ? cleaned.slice(0, paragraphBreak).trim() : cleaned;
  if (firstParagraph.length <= maxChars) return firstParagraph;

  // Otherwise truncate at a word boundary.
  const slice = firstParagraph.slice(0, maxChars - 1);
  const lastSpace = slice.lastIndexOf(' ');
  const safe = lastSpace > maxChars * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${safe.trimEnd()}\u2026`;
}

function pickChapterCaption(outputJson: unknown): string {
  if (!outputJson || typeof outputJson !== 'object') return '';
  const obj = outputJson as Record<string, unknown>;
  const sections = obj.sections;
  if (!Array.isArray(sections)) return '';
  const signal = sections.find(
    (s): s is { key: 'signal'; caption?: unknown } =>
      s != null && typeof s === 'object' && (s as { key?: unknown }).key === 'signal',
  );
  if (signal && typeof signal.caption === 'string' && signal.caption.trim().length > 0) {
    return signal.caption;
  }
  return '';
}

function pickChapterNarrative(outputJson: unknown): string {
  if (!outputJson || typeof outputJson !== 'object') return '';
  const obj = outputJson as Record<string, unknown>;

  // Legacy / fallback: a flat `narrative` string.
  if (typeof obj.narrative === 'string' && obj.narrative.trim().length > 0) {
    return obj.narrative;
  }

  const sections = obj.sections;
  if (!Array.isArray(sections)) return '';
  const story = sections.find(
    (s): s is { key: 'story'; body: unknown } =>
      s != null && typeof s === 'object' && (s as { key?: unknown }).key === 'story',
  );
  if (story && typeof story.body === 'string') return story.body;

  // Last resort: any section with a string `body`.
  for (const s of sections) {
    if (s && typeof s === 'object' && typeof (s as { body?: unknown }).body === 'string') {
      return (s as { body: string }).body;
    }
  }
  return '';
}

export function buildChapterDigestEmail(params: {
  chapterTitle: string;
  /** Full chapter `output_json` produced by `chapters-generate`. The template
   *  extracts a snippet via `extractChapterSnippet` — preferring
   *  `sections.signal.caption` (Phase 3.1), falling back to `sections.story.body`. */
  outputJson: unknown;
  chapterId: string;
  cadence: PeriodCadence;
  periodStartIso: string;
  periodEndIso: string;
  timezone?: string | null;
  unsubscribeUrl?: string;
}): EmailContent {
  const { primaryColor } = getBrandConfig();
  const { chapterTitle, outputJson, chapterId, cadence } = params;

  const periodLabel = formatHumanPeriodLabel({
    cadence,
    startIso: params.periodStartIso,
    endIso: params.periodEndIso,
    timezone: params.timezone,
  });

  // "the week of Apr 13" → "Your week of Apr 13 chapter is ready" reads
  // awkwardly. Promote the label to a noun phrase via a per-cadence connector.
  const subjectPhrase = cadenceSubjectPhrase(cadence, periodLabel);
  const subject = `Your chapter for ${subjectPhrase} is ready`;

  // Preheader is a complementary hook, not a duplicate of the subject.
  const preheader = `A short read about ${subjectPhrase}.`;

  const snippet = extractChapterSnippet(outputJson);
  const ctaUrl = makeOpenUrl(`chapters/${chapterId}`, {}, 'chapter_digest');
  // Phase 7.3 of docs/chapters-plan.md: secondary "What did we miss?"
  // CTA deep-links into the add-a-line affordance on the Chapter
  // detail screen (the `addLine=1` param is parsed by linkingConfig to
  // auto-expand + focus the user-note input). Using a distinct campaign
  // so we can separate read-through funnels from contribution funnels
  // in analytics.
  const addLineUrl = makeOpenUrl(
    `chapters/${chapterId}`,
    { addLine: '1' },
    'chapter_digest_add_line',
  );
  const addLineLabel = 'What did we miss? Add a line.';

  // Phase 5.3: Next Steps hint in the digest email. Appears as a single
  // curiosity-gap line between the snippet and the CTA iff the Chapter
  // has at least one recommendation. Zero content spoilage — the user
  // still has to tap through to see what it is. Keeps the email terse and
  // creates a reason to open beyond consumption.
  const nextStepsHintText = hasAnyRecommendation(outputJson)
    ? 'Kwilt noticed something worth naming — open to see.'
    : '';

  const textParts = [
    `${subject}: ${chapterTitle}`,
    snippet || null,
    nextStepsHintText || null,
    `Read the full chapter:`,
    ctaUrl,
    `${addLineLabel} ${addLineUrl}`,
  ].filter((p): p is string => Boolean(p && p.trim().length));
  const text = textParts.join('\n\n');

  // Phase 5.3: narrative snippet moves from a gray-filled box to a
  // border-left blockquote. One boundary, not four — keeps the letter feel.
  const snippetBlock = snippet
    ? `<div style="margin:0 0 24px;padding:0 0 0 16px;border-left:3px solid ${escapeHtml(primaryColor)};font-size:16px;line-height:24px;color:#374151;">
        ${escapeHtml(snippet)}
      </div>`
    : '';

  const nextStepsHintBlock = nextStepsHintText
    ? `<p style="margin:0 0 24px;font-size:14px;line-height:22px;color:${escapeHtml(primaryColor)};font-weight:600;">${escapeHtml(nextStepsHintText)}</p>`
    : '';

  const html = renderLayout({
    title: chapterTitle,
    preheader,
    bodyHtml: `
      <p style="margin:0 0 10px;font-size:12px;line-height:16px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">${escapeHtml(periodLabel)}</p>
      ${snippetBlock}
      ${nextStepsHintBlock}
      ${renderCta(ctaUrl, 'Read full chapter')}
      ${renderSecondaryLink(addLineUrl, addLineLabel)}
      ${renderFallbackLink(ctaUrl)}
    `,
    footerText: 'You\u2019re receiving this because you enabled chapter email delivery.',
    unsubscribeUrl: params.unsubscribeUrl,
  });

  return { subject, text, html };
}

function cadenceSubjectPhrase(cadence: PeriodCadence, label: string): string {
  // weekly  → "the week of Apr 13"  → already a noun phrase
  // monthly → "April 2026"           → already a noun phrase
  // yearly  → "2026"                 → already reads naturally
  // custom  → "Apr 13 – Apr 20"      → already reads naturally
  // The label is constructed in periodLabels.ts to flow inside a subject; we
  // keep this indirection so future label tweaks (e.g. "this week") can adapt
  // the surrounding copy in one place.
  void cadence;
  return label;
}

// ---------------------------------------------------------------------------
// Streak win-back emails (lapsed users)
// ---------------------------------------------------------------------------

export function buildStreakWinback1Email(
  params: { streakLength: number; unsubscribeUrl?: string },
): EmailContent {
  const ctaUrl = makeOpenUrl('today', {}, 'winback_1');
  const streak = params.streakLength;
  const subject = 'You can start small again today';
  const streakLineHtml =
    streak >= 3
      ? `You had a <strong>${streak}-day rhythm</strong> going. It can restart smaller.`
      : 'You were building something meaningful.';
  const streakLineText =
    streak >= 3
      ? `You had a ${streak}-day rhythm going. It can restart smaller.`
      : 'You were building something meaningful.';

  const text = [
    subject,
    streakLineText,
    "It's been a few days. Life happens \u2014 what matters is the next honest choice.",
    'Pick one small step and make it easy to do today.',
    ctaUrl,
  ].join('\n\n');

  const html = renderLayout({
    title: subject,
    preheader: 'Pick one small step and make it easy to do today.',
    bodyHtml: `
      <p style="margin:0 0 14px;">${streakLineHtml}</p>
      <p style="margin:0 0 14px;">It\u2019s been a few days. Life happens \u2014 what matters is the next honest choice.</p>
      <p style="margin:0 0 24px;color:#6b7280;">Pick one small step and make it easy to do today.</p>
      ${renderCta(ctaUrl, 'Open Kwilt')}
      ${renderFallbackLink(ctaUrl)}
    `,
    footerText: 'You\u2019re receiving this because you use Kwilt.',
    unsubscribeUrl: params.unsubscribeUrl,
  });

  return { subject, text, html };
}

export function buildStreakWinback2Email(
  params: { streakLength: number; unsubscribeUrl?: string },
): EmailContent {
  const ctaUrl = makeOpenUrl('today', {}, 'winback_2');
  const streak = params.streakLength;
  const subject =
    streak >= 3
      ? 'This can still come back into the week'
      : 'Ready for a fresh start?';
  const streakLineHtml =
    streak >= 3
      ? `A week ago you had a <strong>${streak}-day rhythm</strong> going.`
      : 'A week ago you were building something meaningful.';
  const streakLineText =
    streak >= 3
      ? `A week ago you had a ${streak}-day rhythm going.`
      : 'A week ago you were building something meaningful.';

  const text = [
    subject,
    streakLineText,
    "It's been a week. Your Arc is still here, and the goal can still get a small next step.",
    "You don't need to pick up where you left off. Pick one small step and make it easy to do today.",
    ctaUrl,
  ].join('\n\n');

  const html = renderLayout({
    title: subject,
    preheader: 'Your Arc is still here. Ready for one small step?',
    bodyHtml: `
      <p style="margin:0 0 14px;">${streakLineHtml}</p>
      <p style="margin:0 0 14px;">It\u2019s been a week. Your Arc is still here, and the goal can still get a small next step.</p>
      <p style="margin:0 0 24px;color:#6b7280;">You don\u2019t need to pick up where you left off. Pick one small step and make it easy to do today.</p>
      ${renderCta(ctaUrl, 'Open Kwilt')}
      ${renderFallbackLink(ctaUrl)}
    `,
    footerText: 'This is the last email we\u2019ll send about this. We\u2019ll be here when you\u2019re ready.',
    unsubscribeUrl: params.unsubscribeUrl,
  });

  return { subject, text, html };
}

// ---------------------------------------------------------------------------
// Trial expiry email
// ---------------------------------------------------------------------------

export function buildTrialExpiryEmail(
  params: { daysRemaining: number; unsubscribeUrl?: string },
): EmailContent {
  const ctaUrl = makeOpenUrl('settings/subscription', {}, 'trial_expiry');
  const days = params.daysRemaining;
  const subject =
    days <= 0
      ? 'Your Kwilt Pro trial has ended'
      : `Your Kwilt Pro trial ends in ${days} day${days === 1 ? '' : 's'}`;
  const urgencyHtml =
    days <= 0
      ? 'Your trial has ended. Subscribe to keep your Pro features.'
      : days <= 1
        ? 'Your trial ends <strong>tomorrow</strong>.'
        : `You have <strong>${days} days</strong> left on your trial.`;
  const urgencyText =
    days <= 0
      ? 'Your trial has ended. Subscribe to keep your Pro features.'
      : days <= 1
        ? 'Your trial ends tomorrow.'
        : `You have ${days} days left on your trial.`;

  const preheader =
    days <= 0
      ? 'Subscribe to keep your Pro features.'
      : `${days} day${days === 1 ? '' : 's'} left on your trial.`;

  const text = [
    subject,
    urgencyText,
    'During your trial you had Focus Mode, Saved Views, Unsplash banners, and 1,000 AI credits per month. Subscribe to keep all of them.',
    ctaUrl,
  ].join('\n\n');

  const html = renderLayout({
    title: subject,
    preheader,
    bodyHtml: `
      <p style="margin:0 0 14px;">${urgencyHtml}</p>
      <p style="margin:0 0 24px;">During your trial you had <strong>Focus Mode</strong>, <strong>Saved Views</strong>, <strong>Unsplash banners</strong>, and <strong>1,000 AI credits</strong> per month. Subscribe to keep all of them.</p>
      ${renderCta(ctaUrl, 'Subscribe to Pro')}
      ${renderFallbackLink(ctaUrl)}
    `,
    footerText: 'You\u2019re receiving this because you started a Kwilt Pro trial.',
    unsubscribeUrl: params.unsubscribeUrl,
  });

  return { subject, text, html };
}

// ---------------------------------------------------------------------------
// Admin: secret-expiry alert. Intentionally keeps its tabular data — this is
// the one template in the set that has genuinely grid-shaped info.
// ---------------------------------------------------------------------------

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
