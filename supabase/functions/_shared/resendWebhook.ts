// Resend webhook → PostHog bridge.
//
// Phase 6.3 of docs/email-system-ga-plan.md. Pure module (no Deno/Supabase
// imports) so Jest can exercise the Svix signature verifier and the event
// normalizer in Node without shimming.
//
// The edge-function entry point (`supabase/functions/resend-webhook/index.ts`)
// is the only thing that touches the Resend → PostHog wire; it delegates
// all parsing + crypto to this file so the rules are testable.

import { webcrypto } from 'node:crypto'; // Shimmed for Node/Jest testing.

const subtle: SubtleCrypto = (globalThis.crypto?.subtle ?? (webcrypto as unknown as Crypto).subtle) as SubtleCrypto;

// ---------------------------------------------------------------------------
// Svix signature verification
// ---------------------------------------------------------------------------
//
// Resend uses Svix to sign webhook deliveries. Headers on every request:
//   svix-id:        msg_2ABc...
//   svix-timestamp: 1700000000  (unix seconds)
//   svix-signature: v1,<base64-sig> [v1,<rotated-sig> ...]
//
// The signed body is `${svix-id}.${svix-timestamp}.${rawRequestBody}`, HMAC-
// SHA256 keyed by the webhook's signing secret. The secret shows up in the
// Resend dashboard prefixed with `whsec_`; the remainder is the raw secret
// base64-encoded.
//
// We accept a signature if ANY `v1,...` entry in the header matches the
// expected digest AND the timestamp is within ±5 min of `now` (standard
// Svix tolerance — blocks replay attacks).

const SVIX_TIMESTAMP_TOLERANCE_SEC = 5 * 60;

export type VerifySvixParams = {
  /** The `whsec_<base64>` value from Resend's dashboard. */
  secret: string;
  /** Raw request body (exact bytes — DO NOT pre-parse then re-stringify). */
  body: string;
  /** `svix-id` header. */
  svixId: string;
  /** `svix-timestamp` header (unix seconds, as a string). */
  svixTimestamp: string;
  /** `svix-signature` header (space-separated `v1,<sig>` entries). */
  svixSignature: string;
  /** Optional `Date.now()` override for tests. */
  nowMs?: number;
};

function base64urlToBytes(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=');
  const bin = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function base64ToBytes(s: string): Uint8Array {
  const bin = atob(s);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function hmacSha256(secret: Uint8Array, data: string): Promise<Uint8Array> {
  const key = await subtle.importKey('raw', secret as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await subtle.sign('HMAC', key, new TextEncoder().encode(data) as BufferSource);
  return new Uint8Array(sig);
}

/**
 * Verify a Svix-signed Resend webhook delivery. Returns true on match,
 * false on anything off (missing headers, expired timestamp, wrong
 * secret, forged signature).
 */
export async function verifySvixSignature(params: VerifySvixParams): Promise<boolean> {
  const { secret, body, svixId, svixTimestamp, svixSignature } = params;
  const nowMs = params.nowMs ?? Date.now();

  if (!secret || !body || !svixId || !svixTimestamp || !svixSignature) return false;

  const tsSec = Number.parseInt(svixTimestamp, 10);
  if (!Number.isFinite(tsSec) || tsSec <= 0) return false;
  const skewSec = Math.abs(Math.floor(nowMs / 1000) - tsSec);
  if (skewSec > SVIX_TIMESTAMP_TOLERANCE_SEC) return false;

  // Strip the `whsec_` prefix if present, then base64-decode the remainder.
  const rawSecret = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret;
  let secretBytes: Uint8Array;
  try {
    secretBytes = base64ToBytes(rawSecret);
  } catch {
    return false;
  }

  const signed = `${svixId}.${svixTimestamp}.${body}`;
  const expected = await hmacSha256(secretBytes, signed);

  // The header may carry multiple space-separated signatures (secret
  // rotation). Accept any match.
  for (const entry of svixSignature.split(' ')) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const sepIdx = trimmed.indexOf(',');
    if (sepIdx < 0) continue;
    const version = trimmed.slice(0, sepIdx);
    if (version !== 'v1') continue;
    const candidate = trimmed.slice(sepIdx + 1);
    let candidateBytes: Uint8Array;
    try {
      // Svix uses standard base64 (not base64url) for the signature.
      candidateBytes = base64ToBytes(candidate);
    } catch {
      try {
        candidateBytes = base64urlToBytes(candidate);
      } catch {
        continue;
      }
    }
    if (timingSafeEqual(expected, candidateBytes)) return true;
  }

  return false;
}

/** Exposed for tests: produce a valid Svix signature over `${id}.${ts}.${body}`. */
export async function signForTest(secret: string, svixId: string, svixTimestamp: string, body: string): Promise<string> {
  const raw = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret;
  const secretBytes = base64ToBytes(raw);
  const sig = await hmacSha256(secretBytes, `${svixId}.${svixTimestamp}.${body}`);
  return `v1,${bytesToBase64(sig)}`;
}

// ---------------------------------------------------------------------------
// Event normalization
// ---------------------------------------------------------------------------

/** Narrow the event types Resend actually ships (as of Apr 2026). */
export const RESEND_EVENT_TYPES = [
  'email.sent',
  'email.delivered',
  'email.delivery_delayed',
  'email.complained',
  'email.bounced',
  'email.opened',
  'email.clicked',
  'email.failed',
] as const;
export type ResendEventType = (typeof RESEND_EVENT_TYPES)[number];

export function isResendEventType(v: unknown): v is ResendEventType {
  return typeof v === 'string' && (RESEND_EVENT_TYPES as readonly string[]).includes(v);
}

export type NormalizedResendEvent = {
  type: ResendEventType;
  createdAtIso: string;
  resendEmailId: string;
  /** Pulled from Resend tag `campaign` we set in `_shared/emailSend.ts`. */
  campaign: string | null;
  subject: string | null;
  toEmail: string | null;
  /** `email.clicked` payloads carry a `link` field. */
  clickedLink: string | null;
  /** `email.bounced` payloads carry a `bounce` substructure. */
  bounceType: string | null;
};

export function normalizeResendEvent(payload: unknown): NormalizedResendEvent | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  if (!isResendEventType(p.type)) return null;

  const data = (p.data ?? {}) as Record<string, unknown>;
  const resendEmailId =
    typeof data.email_id === 'string' && data.email_id.trim() !== '' ? data.email_id.trim() : null;
  if (!resendEmailId) return null; // Without an id we can't correlate → drop.

  const tags = Array.isArray(data.tags) ? (data.tags as Array<{ name?: unknown; value?: unknown }>) : [];
  const campaignTag = tags.find((t) => t && t.name === 'campaign');
  const campaign =
    campaignTag && typeof campaignTag.value === 'string' && campaignTag.value.trim() !== ''
      ? campaignTag.value.trim()
      : null;

  const to = data.to;
  const toEmail = typeof to === 'string' ? to : Array.isArray(to) && typeof to[0] === 'string' ? (to[0] as string) : null;

  const createdAtIso = typeof p.created_at === 'string' ? p.created_at : new Date().toISOString();
  const subject = typeof data.subject === 'string' ? data.subject : null;

  const click = (data as Record<string, unknown>).click;
  const clickedLink =
    click && typeof click === 'object' && typeof (click as Record<string, unknown>).link === 'string'
      ? ((click as Record<string, unknown>).link as string)
      : null;

  const bounce = (data as Record<string, unknown>).bounce;
  const bounceType =
    bounce && typeof bounce === 'object' && typeof (bounce as Record<string, unknown>).type === 'string'
      ? ((bounce as Record<string, unknown>).type as string)
      : null;

  return {
    type: p.type,
    createdAtIso,
    resendEmailId,
    campaign,
    subject,
    toEmail,
    clickedLink,
    bounceType,
  };
}

// ---------------------------------------------------------------------------
// PostHog capture payload
// ---------------------------------------------------------------------------
//
// We forward every Resend event as a single PostHog event named `email_event`
// so funnels and cohorts can slice by `event_type`. The alternative — one
// PostHog event name per Resend event type — would balloon the event taxonomy
// for no practical benefit.

export type PosthogCapturePayload = {
  api_key: string;
  distinct_id: string;
  event: 'email_event';
  timestamp: string;
  properties: Record<string, string | number | boolean | null>;
};

export function buildPosthogPayload(params: {
  apiKey: string;
  distinctId: string;
  normalized: NormalizedResendEvent;
}): PosthogCapturePayload {
  const { normalized } = params;
  return {
    api_key: params.apiKey,
    distinct_id: params.distinctId,
    event: 'email_event',
    timestamp: normalized.createdAtIso,
    properties: {
      event_type: normalized.type,
      campaign: normalized.campaign,
      resend_email_id: normalized.resendEmailId,
      subject: normalized.subject,
      clicked_link: normalized.clickedLink,
      bounce_type: normalized.bounceType,
    },
  };
}

/** Default ingestion host. Override with `KWILT_POSTHOG_HOST` in function secrets. */
export const DEFAULT_POSTHOG_HOST = 'us.i.posthog.com';

export function buildPosthogCaptureUrl(host: string | null | undefined): string {
  const h = (host ?? '').trim().replace(/\/+$/, '');
  const resolved = h === '' ? DEFAULT_POSTHOG_HOST : h;
  const withScheme = /^https?:\/\//i.test(resolved) ? resolved : `https://${resolved}`;
  return `${withScheme}/capture/`;
}
