-- Kwilt founder activation/retention alert ledger.
--
-- Edge Functions write one row per canonical internal alert. The primary key
-- doubles as the idempotency guard for provider retries and repeat install pings.

create table if not exists public.kwilt_founder_alert_events (
  event_key text primary key,
  event_name text not null,
  source text not null,
  subject_id text not null,
  occurred_at timestamptz not null,
  environment text not null default 'production',
  properties jsonb not null default '{}'::jsonb,
  slack_sent_at timestamptz null,
  slack_error text null,
  created_at timestamptz not null default now()
);

create index if not exists kwilt_founder_alert_events_occurred_at_idx
  on public.kwilt_founder_alert_events (occurred_at desc);

create index if not exists kwilt_founder_alert_events_event_name_occurred_at_idx
  on public.kwilt_founder_alert_events (event_name, occurred_at desc);

create index if not exists kwilt_founder_alert_events_source_occurred_at_idx
  on public.kwilt_founder_alert_events (source, occurred_at desc);

alter table public.kwilt_founder_alert_events enable row level security;
