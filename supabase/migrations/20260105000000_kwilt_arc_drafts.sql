-- Anonymous ArcDrafts for web → app handoff (marketing site Arc survey).
-- These drafts are short-lived and claimed in-app after install/sign-in.

create table if not exists public.arc_drafts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  payload jsonb not null,
  claim_token_hash text not null,
  -- Best-effort abuse control. Store only a hash (not raw IP).
  ip_hash text,
  claim_attempts integer not null default 0,
  claimed_at timestamptz,
  claimed_by_user_id uuid references auth.users (id) on delete set null,
  constraint arc_drafts_expires_after_create check (expires_at > created_at)
);

create index if not exists arc_drafts_created_at_idx on public.arc_drafts (created_at);
create index if not exists arc_drafts_expires_at_idx on public.arc_drafts (expires_at);
create index if not exists arc_drafts_claimed_by_user_id_idx on public.arc_drafts (claimed_by_user_id);
create index if not exists arc_drafts_ip_hash_idx on public.arc_drafts (ip_hash);

alter table public.arc_drafts enable row level security;


