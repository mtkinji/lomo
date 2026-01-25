-- Kwilt: Chapters (reflection/report outputs generated from Activities)
--
-- Build plan: docs/chapters-build-plan.md (Phase 1)
--
-- Notes:
-- - Templates are owner-managed (RLS: user_id = auth.uid()).
-- - Chapters are owner-readable; writes are intended to go through Edge Functions
--   (service role) so we keep direct client writes locked down for now.
-- - Domain sync IDs are TEXT (arcs/goals/activities). Templates/chapters use UUID ids.

create extension if not exists "pgcrypto";

-- ---------------------------------
-- Chapter templates
-- ---------------------------------

create table if not exists public.kwilt_chapter_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('reflection', 'report')),
  cadence text not null check (cadence in ('weekly', 'monthly', 'yearly')),
  timezone text not null default 'UTC',
  filter_json jsonb not null default '[]'::jsonb,
  filter_group_logic text not null default 'or' check (filter_group_logic in ('and', 'or')),
  email_enabled boolean not null default false,
  email_recipient text null,
  detail_level text null check (detail_level is null or detail_level in ('short', 'medium', 'deep')),
  tone text null check (tone is null or tone in ('gentle', 'direct', 'playful', 'neutral')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kwilt_chapter_templates_user_id_idx
  on public.kwilt_chapter_templates(user_id);

create index if not exists kwilt_chapter_templates_enabled_idx
  on public.kwilt_chapter_templates(enabled);

-- ---------------------------------
-- Chapters
-- ---------------------------------

create table if not exists public.kwilt_chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null references public.kwilt_chapter_templates(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  period_key text not null,
  input_summary jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('ready', 'pending', 'failed')),
  error text null,
  emailed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, template_id, period_key)
);

create index if not exists kwilt_chapters_user_id_idx
  on public.kwilt_chapters(user_id);

create index if not exists kwilt_chapters_template_id_idx
  on public.kwilt_chapters(template_id);

create index if not exists kwilt_chapters_period_start_idx
  on public.kwilt_chapters(period_start desc);

-- ---------------------------------
-- RLS
-- ---------------------------------

alter table public.kwilt_chapter_templates enable row level security;
alter table public.kwilt_chapters enable row level security;

-- Templates: owner-only read/write.
drop policy if exists "kwilt_chapter_templates_owner_only" on public.kwilt_chapter_templates;
create policy "kwilt_chapter_templates_owner_only"
  on public.kwilt_chapter_templates
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Chapters: owner can read; no direct writes (Edge Functions use service role).
drop policy if exists "kwilt_chapters_owner_read" on public.kwilt_chapters;
create policy "kwilt_chapters_owner_read"
  on public.kwilt_chapters
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "kwilt_chapters_no_direct_writes" on public.kwilt_chapters;
create policy "kwilt_chapters_no_direct_writes"
  on public.kwilt_chapters
  for insert
  to authenticated
  with check (false);

drop policy if exists "kwilt_chapters_no_direct_updates" on public.kwilt_chapters;
create policy "kwilt_chapters_no_direct_updates"
  on public.kwilt_chapters
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists "kwilt_chapters_no_direct_deletes" on public.kwilt_chapters;
create policy "kwilt_chapters_no_direct_deletes"
  on public.kwilt_chapters
  for delete
  to authenticated
  using (false);


