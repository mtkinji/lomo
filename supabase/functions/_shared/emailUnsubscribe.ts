// Email unsubscribe — HMAC token + URL builders + category taxonomy.
//
// Phase 7.1 of docs/email-system-ga-plan.md.
//
// Design
// ------
// Every user-facing email that routes through a preference-gated category
// (welcome drip, chapter digest, streak win-back, marketing/trial) must
// include a `List-Unsubscribe` header pointing at a POST endpoint that can
// be hit without a login — per RFC 8058 (one-click unsubscribe) and the
// Gmail + Yahoo February 2024 bulk-sender rules.
//
// The POST endpoint authenticates the caller with an HMAC-signed token
// that encodes (user_id, category, issued_at). This mirrors the pattern
// already used in `_shared/calendarUtils.ts::encodeState/decodeState`, and
// is intentionally a thin wrapper over that file so there's one HMAC
// implementation in the codebase.
//
// Category taxonomy
// -----------------
// The `kwilt_email_preferences` table already has 4 boolean columns:
//   - welcome_drip       → welcome day 0/1/3/7
//   - chapter_digest     → chapter digest email
//   - streak_winback     → winback 1/2
//   - marketing          → trial expiry + any future broad marketing
//
// Transactional emails (pro_granted, pro_code, goal_invite, secret_expiry)
// are NEVER gated by preferences and do NOT carry unsubscribe links —
// they're either user-requested actions (invite) or account-state changes
// (pro billing). We still keep them one-to-one / low-volume so they don't
// risk the bulk-sender threshold.

// HMAC codec intentionally inlined (rather than imported from
// `./calendarUtils.ts`) so this module can be imported from Node + Jest
// without pulling in `npm:@supabase/supabase-js@2` — we need the tests to
// cover HMAC roundtrip + forgery rejection, and those are pure crypto.

/** Canonical preference categories. 1:1 with `kwilt_email_preferences` columns. */
export type EmailPreferenceCategory =
  | 'welcome_drip'
  | 'chapter_digest'
  | 'streak_winback'
  | 'marketing';

export const EMAIL_PREFERENCE_CATEGORIES: readonly EmailPreferenceCategory[] = [
  'welcome_drip',
  'chapter_digest',
  'streak_winback',
  'marketing',
] as const;

/** Map a UTM campaign name (what the email CTA uses) to the preference category. */
export function categoryForCampaign(campaign: string): EmailPreferenceCategory | null {
  switch (campaign) {
    case 'welcome_day_0':
    case 'welcome_day_1':
    case 'welcome_day_3':
    case 'welcome_day_7':
      return 'welcome_drip';
    case 'chapter_digest':
      return 'chapter_digest';
    case 'winback_1':
    case 'winback_2':
      return 'streak_winback';
    case 'trial_expiry':
      return 'marketing';
    // Transactional / admin campaigns explicitly return null — these are
    // intentionally NOT unsubscribable.
    case 'pro_granted':
    case 'pro_code':
    case 'goal_invite':
    case 'secret_expiry':
      return null;
    default:
      return null;
  }
}

/** Human-readable label used in confirmation UIs and email footer copy. */
export function categoryLabel(category: EmailPreferenceCategory): string {
  switch (category) {
    case 'welcome_drip':
      return 'welcome series emails';
    case 'chapter_digest':
      return 'weekly chapter emails';
    case 'streak_winback':
      return 'streak reminder emails';
    case 'marketing':
      return 'product update emails';
  }
}

// ---------------------------------------------------------------------------
// Token codec
// ---------------------------------------------------------------------------

export type UnsubscribeTokenPayload = {
  /** Supabase auth user id (UUID). */
  uid: string;
  /** Preference category to toggle. */
  cat: EmailPreferenceCategory;
  /** Issued-at epoch seconds. Used only for auditing; tokens do not expire. */
  iat: number;
};

function getSecret(): string {
  const s = (Deno.env.get('KWILT_EMAIL_UNSUBSCRIBE_SECRET') ?? '').trim();
  return s;
}

/** Return true iff the signing secret is configured. Callers should fail closed. */
export function hasUnsubscribeSecret(): boolean {
  return getSecret().length >= 32;
}

function toBase64Url(bytes: Uint8Array): string {
  const raw = btoa(String.fromCharCode(...bytes));
  return raw.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(raw: string): Uint8Array {
  const padded = raw.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(raw.length / 4) * 4, '=');
  const bin = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function signPayload(payload: Uint8Array, secret: string): Promise<string> {
  const keyData = new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const payloadBuffer = payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength) as ArrayBuffer;
  const signature = await crypto.subtle.sign('HMAC', key, payloadBuffer);
  return toBase64Url(new Uint8Array(signature));
}

async function encodeSignedState(
  payload: Record<string, unknown>,
  secret: string,
): Promise<string> {
  const jsonString = JSON.stringify(payload);
  const data = new TextEncoder().encode(jsonString);
  const sig = await signPayload(data, secret);
  return `${toBase64Url(data)}.${sig}`;
}

async function decodeSignedState(
  state: string,
  secret: string,
): Promise<Record<string, unknown> | null> {
  const [payloadB64, sig] = state.split('.');
  if (!payloadB64 || !sig) return null;
  let payload: Uint8Array;
  try {
    payload = fromBase64Url(payloadB64);
  } catch {
    return null;
  }
  let expected: string;
  try {
    expected = await signPayload(payload, secret);
  } catch {
    return null;
  }
  if (expected !== sig) return null;
  try {
    return JSON.parse(new TextDecoder().decode(payload)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Encode a signed unsubscribe token.
 *
 * Returns `null` when the signing secret is unconfigured (callers must treat
 * this as "cannot produce an unsubscribe URL" and fall back to sending with
 * no `List-Unsubscribe` header — or, preferably, refuse to send).
 */
export async function encodeUnsubscribeToken(
  payload: Pick<UnsubscribeTokenPayload, 'uid' | 'cat'>,
): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;
  const iat = Math.floor(Date.now() / 1000);
  const body: UnsubscribeTokenPayload = {
    uid: payload.uid,
    cat: payload.cat,
    iat,
  };
  return await encodeSignedState(body as unknown as Record<string, unknown>, secret);
}

/** Decode and verify an unsubscribe token. Returns null on any failure. */
export async function decodeUnsubscribeToken(
  token: string,
): Promise<UnsubscribeTokenPayload | null> {
  const secret = getSecret();
  if (!secret) return null;
  if (!token || typeof token !== 'string') return null;
  const decoded = await decodeSignedState(token, secret);
  if (!decoded) return null;
  const uid = typeof decoded.uid === 'string' ? decoded.uid.trim() : '';
  const cat = typeof decoded.cat === 'string' ? (decoded.cat as EmailPreferenceCategory) : '';
  const iat = typeof decoded.iat === 'number' ? decoded.iat : 0;
  if (!uid) return null;
  if (!isValidCategory(cat)) return null;
  return { uid, cat, iat };
}

function isValidCategory(v: string): v is EmailPreferenceCategory {
  return (EMAIL_PREFERENCE_CATEGORIES as readonly string[]).includes(v);
}

// ---------------------------------------------------------------------------
// URL builders
// ---------------------------------------------------------------------------

/**
 * The in-body visible unsubscribe link. Goes to a kwilt-site page that
 * presents a confirmation UI and then POSTs to the edge function on click.
 *
 * Env: `KWILT_EMAIL_UNSUBSCRIBE_BASE_URL` (default `https://kwilt.app/unsubscribe`).
 */
export function buildVisibleUnsubscribeUrl(token: string): string {
  const base =
    (Deno.env.get('KWILT_EMAIL_UNSUBSCRIBE_BASE_URL') ?? '').trim() ||
    'https://kwilt.app/unsubscribe';
  const cleanBase = base.replace(/\/+$/, '');
  return `${cleanBase}?t=${encodeURIComponent(token)}`;
}

/**
 * The `List-Unsubscribe` header URL. Gmail / Yahoo / Apple Mail post to this
 * URL directly when the user clicks the inbox-native unsubscribe button. No
 * confirmation UI — hence one-click.
 *
 * Env: `KWILT_EMAIL_UNSUBSCRIBE_POST_URL` (default derives from SUPABASE_URL).
 */
export function buildOneClickUnsubscribeUrl(token: string): string {
  const explicit = (Deno.env.get('KWILT_EMAIL_UNSUBSCRIBE_POST_URL') ?? '').trim();
  if (explicit) {
    const cleanBase = explicit.replace(/\/+$/, '');
    return `${cleanBase}?t=${encodeURIComponent(token)}`;
  }
  const sbUrl = (Deno.env.get('SUPABASE_URL') ?? '').trim().replace(/\/+$/, '');
  if (!sbUrl) return '';
  return `${sbUrl}/functions/v1/unsubscribe?t=${encodeURIComponent(token)}`;
}

/**
 * Produce the two Resend-forwarded headers that make Gmail / Yahoo happy.
 *
 * Returns `null` when the signing secret or Supabase URL aren't configured —
 * callers should log and decide whether to send without them (risk: deliv-
 * erability) or hold the send (risk: missed trigger).
 */
export async function buildUnsubscribeHeaders(params: {
  userId: string;
  category: EmailPreferenceCategory;
}): Promise<{ visibleUrl: string; headers: Record<string, string> } | null> {
  const token = await encodeUnsubscribeToken({ uid: params.userId, cat: params.category });
  if (!token) return null;
  const oneClickUrl = buildOneClickUnsubscribeUrl(token);
  if (!oneClickUrl) return null;
  const visibleUrl = buildVisibleUnsubscribeUrl(token);
  return {
    visibleUrl,
    headers: {
      // RFC 2369: comma-separated list of URIs, each wrapped in <>. We
      // provide the one-click HTTPS URL only — no mailto — matching Resend's
      // documented pattern and Gmail's 2024 requirements.
      'List-Unsubscribe': `<${oneClickUrl}>`,
      // RFC 8058: signals that the List-Unsubscribe URL accepts a POST with
      // this exact form body, allowing inbox-native one-click behavior.
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
}
