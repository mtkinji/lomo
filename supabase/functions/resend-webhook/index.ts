// Resend webhook → PostHog bridge (Supabase Edge Function).
//
// Phase 6.3 of docs/email-system-ga-plan.md. Resend POSTs every delivery /
// open / click / bounce / complaint event to us; we verify the Svix
// signature, look up the owning user via `kwilt_email_cadence.metadata
// ->>'resend_id'` (indexed in 20260416000000_kwilt_email_cadence_resend_id_index.sql),
// and forward to PostHog's ingestion API as a single `email_event` event.
//
// Endpoint:   POST /functions/v1/resend-webhook
// Public:     Yes (verify_jwt = false — Resend cannot sign Supabase JWTs).
// Auth:       Svix signature (see `_shared/resendWebhook.ts`).
//
// Env vars:
//   KWILT_RESEND_WEBHOOK_SECRET   — Svix signing secret (`whsec_<base64>`).
//   KWILT_POSTHOG_PROJECT_API_KEY — PostHog public project API key (phc_...).
//   KWILT_POSTHOG_HOST            — e.g. `us.i.posthog.com` (defaults to US).
//
// All three are required. If any is missing we acknowledge Resend with 200
// (to avoid retry storms on misconfiguration) and log the skip reason.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { getSupabaseAdmin, json, corsHeaders } from '../_shared/calendarUtils.ts';
import {
  buildPosthogCaptureUrl,
  buildPosthogPayload,
  normalizeResendEvent,
  verifySvixSignature,
} from '../_shared/resendWebhook.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }

  const secret = (Deno.env.get('KWILT_RESEND_WEBHOOK_SECRET') ?? '').trim();
  const posthogApiKey = (Deno.env.get('KWILT_POSTHOG_PROJECT_API_KEY') ?? '').trim();
  const posthogHost = (Deno.env.get('KWILT_POSTHOG_HOST') ?? '').trim();

  // Read body ONCE as raw text — we need the exact bytes for signature
  // verification AND we parse the same string for event normalization.
  const body = await req.text();

  if (!secret) {
    console.warn('[resend-webhook] skipping: KWILT_RESEND_WEBHOOK_SECRET unset');
    return json(200, { ok: false, reason: 'missing_webhook_secret' });
  }

  const svixId = req.headers.get('svix-id') ?? '';
  const svixTimestamp = req.headers.get('svix-timestamp') ?? '';
  const svixSignature = req.headers.get('svix-signature') ?? '';

  const ok = await verifySvixSignature({ secret, body, svixId, svixTimestamp, svixSignature });
  if (!ok) {
    return json(401, { error: 'invalid_signature' });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const normalized = normalizeResendEvent(payload);
  if (!normalized) {
    return json(200, { ok: true, skipped: 'unrecognized_event' });
  }

  // Look up the owning user via the cadence ledger.
  const admin = getSupabaseAdmin();
  let distinctId: string | null = null;
  if (admin) {
    const { data } = await admin
      .from('kwilt_email_cadence')
      .select('user_id, message_key')
      .eq('metadata->>resend_id', normalized.resendEmailId)
      .limit(1)
      .maybeSingle();
    if (data?.user_id) distinctId = data.user_id as string;
  }

  if (!posthogApiKey) {
    console.warn('[resend-webhook] skipping PostHog forward: KWILT_POSTHOG_PROJECT_API_KEY unset');
    return json(200, {
      ok: true,
      skipped: 'missing_posthog_key',
      eventType: normalized.type,
      resendEmailId: normalized.resendEmailId,
    });
  }

  // Fall back to the Resend email id itself as a distinct_id when we can't
  // correlate to a user (e.g. the send went out via Resend Automation and
  // never landed in kwilt_email_cadence). The event still contributes to
  // aggregate funnel counts; it just won't be person-attached.
  const finalDistinctId = distinctId ?? `resend:${normalized.resendEmailId}`;

  const phPayload = buildPosthogPayload({
    apiKey: posthogApiKey,
    distinctId: finalDistinctId,
    normalized,
  });
  const captureUrl = buildPosthogCaptureUrl(posthogHost);

  try {
    const res = await fetch(captureUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(phPayload),
    });
    if (!res.ok) {
      console.warn('[resend-webhook] PostHog capture failed', {
        status: res.status,
        body: (await res.text()).slice(0, 200),
      });
    }
  } catch (e) {
    console.warn('[resend-webhook] PostHog capture threw', String(e));
  }

  // Always ack Resend 200 — we've already captured the event (or logged
  // our failure). Retrying won't help and causes duplicates.
  return json(200, {
    ok: true,
    eventType: normalized.type,
    resendEmailId: normalized.resendEmailId,
    distinctIdAttached: distinctId !== null,
  });
});
