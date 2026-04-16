// Shared email send helper for all edge functions that talk to Resend.
//
// Phase 7.2 + 7.3 of docs/email-system-ga-plan.md — centralizes:
//   - KWILT_EMAIL_SENDING_ENABLED kill switch
//   - Per-category preference guard
//   - Daily per-user send cap
//   - Custom header passthrough (e.g. List-Unsubscribe)
//   - Resend tag propagation for analytics
//
// Callers are responsible for building the unsubscribe URL and headers via
// `./emailUnsubscribe.ts::buildUnsubscribeHeaders` before they render the
// template (so the visible unsubscribe link makes it into the footer). Then
// they hand the returned `headers` to us as `extraHeaders`.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  categoryForCampaign,
  hasUnsubscribeSecret,
  type EmailPreferenceCategory,
} from './emailUnsubscribe.ts';

/** Per-user max sends in a rolling 24h window. Phase 7.3. */
export const DEFAULT_PER_USER_DAILY_CAP = 2;

export type SendEmailOutcome =
  | { ok: true; resendId: string | null }
  | {
      ok: false;
      reason:
        | 'kill_switch'
        | 'missing_unsubscribe_secret'
        | 'daily_cap_reached'
        | 'resend_error'
        | 'preference_opted_out';
      status?: number;
      body?: string;
    };

type ResendTag = { name: string; value: string };

/** Read the global email-sending kill switch. Default: enabled. */
export function isEmailSendingEnabled(): boolean {
  const raw = (Deno.env.get('KWILT_EMAIL_SENDING_ENABLED') ?? '').trim();
  if (raw === '') return true;
  if (raw === '0' || raw.toLowerCase() === 'false' || raw.toLowerCase() === 'off') return false;
  return true;
}

/**
 * Count how many entries exist in `kwilt_email_cadence` for this user in the
 * last 24h. Used by the daily cap check. `user_id` indexed, table is small
 * per user, so this is cheap.
 */
async function countRecentSends(admin: SupabaseClient, userId: string): Promise<number> {
  const twentyFourHoursAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from('kwilt_email_cadence')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('sent_at', twentyFourHoursAgoIso);
  return typeof count === 'number' ? count : 0;
}

/**
 * Check the per-category preference row. Returns `true` if the user has
 * opted out of this category (i.e. we should skip the send).
 *
 * Returns `false` when no row exists — new users are opted in by default
 * per the migration.
 */
export async function isUserOptedOut(
  admin: SupabaseClient,
  userId: string,
  category: EmailPreferenceCategory,
): Promise<boolean> {
  const { data } = await admin
    .from('kwilt_email_preferences')
    .select(category)
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return false;
  const value = (data as Record<string, unknown>)[category];
  return value === false;
}

export type SendEmailViaResendParams = {
  /** Resend API key. */
  resendKey: string;
  /** Fully-formed "Name <addr@...>" or bare "addr@...". */
  from: string;
  /** Recipient. */
  to: string;
  subject: string;
  text: string;
  html: string;
  /**
   * UTM campaign identifier. We map this to a preference category:
   *   - non-null → preference-gated mail: run cap + preference guard,
   *     require unsubscribe headers via `extraHeaders`.
   *   - null (transactional) → skip guards, skip unsubscribe-header check.
   */
  campaign: string;
  /** Supabase user id. Required for preference-gated sends. */
  userId?: string;
  /**
   * Supabase admin client. When provided AND the campaign maps to a category,
   * we enforce cap + preference guards.
   */
  admin?: SupabaseClient | null;
  /**
   * Arbitrary extra headers to attach to the outbound email (forwarded to
   * Resend's `headers` field). For non-transactional mail, callers MUST
   * supply `List-Unsubscribe` + `List-Unsubscribe-Post` here — we fail the
   * send if the unsubscribe signing secret is configured but the headers
   * are missing, because a broken unsubscribe path is a deliverability
   * hazard.
   */
  extraHeaders?: Record<string, string>;
  /** Optional extra Resend tags. The `campaign` tag is always added. */
  extraTags?: ResendTag[];
  /** Optional request-level idempotency key (HTTP header, not email header). */
  idempotencyKey?: string;
};

/**
 * Single source of truth for outbound email. Applies kill switch, preference
 * guard, daily cap, then POSTs to Resend. Does NOT write to
 * `kwilt_email_cadence` — callers remain responsible for recording the send
 * in the ledger using their own `message_key` (the unique constraint there
 * is what prevents duplicate sends).
 */
export async function sendEmailViaResend(
  params: SendEmailViaResendParams,
): Promise<SendEmailOutcome> {
  if (!isEmailSendingEnabled()) {
    return { ok: false, reason: 'kill_switch' };
  }

  const category = categoryForCampaign(params.campaign);
  const isTransactional = category === null;

  if (!isTransactional) {
    // List-Unsubscribe is mandatory on preference-gated mail. Fail closed if
    // the secret is configured but the caller didn't pass headers — it means
    // they forgot to call `buildUnsubscribeHeaders` upstream. If the secret
    // is absent entirely, fail too (better to miss a send than train Gmail
    // to distrust the domain).
    if (!hasUnsubscribeSecret()) {
      return { ok: false, reason: 'missing_unsubscribe_secret' };
    }
    const hasListUnsub = !!params.extraHeaders?.['List-Unsubscribe'];
    const hasOneClickUnsub = !!params.extraHeaders?.['List-Unsubscribe-Post'];
    if (!hasListUnsub || !hasOneClickUnsub) {
      return { ok: false, reason: 'missing_unsubscribe_secret' };
    }

    if (params.admin && params.userId) {
      if (await isUserOptedOut(params.admin, params.userId, category)) {
        return { ok: false, reason: 'preference_opted_out' };
      }
      const recent = await countRecentSends(params.admin, params.userId);
      if (recent >= DEFAULT_PER_USER_DAILY_CAP) {
        return { ok: false, reason: 'daily_cap_reached' };
      }
    }
  }

  const tags: ResendTag[] = [
    { name: 'campaign', value: params.campaign },
    ...(params.extraTags ?? []),
  ];

  const httpHeaders: Record<string, string> = {
    Authorization: `Bearer ${params.resendKey}`,
    'Content-Type': 'application/json',
  };
  if (params.idempotencyKey) {
    httpHeaders['Idempotency-Key'] = params.idempotencyKey;
  }

  const body: Record<string, unknown> = {
    from: params.from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
    tags,
  };
  if (params.extraHeaders && Object.keys(params.extraHeaders).length > 0) {
    body.headers = params.extraHeaders;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: httpHeaders,
      body: JSON.stringify(body),
    });
    const respText = await res.text();
    if (!res.ok) {
      return { ok: false, reason: 'resend_error', status: res.status, body: respText };
    }
    let resendId: string | null = null;
    try {
      const parsed = JSON.parse(respText) as { id?: unknown };
      if (typeof parsed.id === 'string') resendId = parsed.id;
    } catch {
      /* ignore */
    }
    return { ok: true, resendId };
  } catch (e) {
    return { ok: false, reason: 'resend_error', body: String(e) };
  }
}
