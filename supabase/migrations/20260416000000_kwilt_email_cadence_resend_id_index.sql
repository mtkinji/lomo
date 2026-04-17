-- Phase 6.3 of docs/email-system-ga-plan.md.
-- The resend-webhook edge function needs to correlate Resend event payloads
-- (`email_id`) back to a `user_id` so it can forward open/click/bounce events
-- to PostHog as `email_event` with proper person attribution. We already
-- record `metadata.resend_id` on every send site; this partial index makes
-- the per-event lookup O(log n) instead of a full table scan.

create index if not exists kwilt_email_cadence_resend_id_idx
  on public.kwilt_email_cadence ((metadata->>'resend_id'))
  where metadata ? 'resend_id';
