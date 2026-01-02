-- Kwilt: v0 domain sync deletions (soft delete tombstones).

alter table public.kwilt_arcs
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz null;

alter table public.kwilt_goals
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz null;

alter table public.kwilt_activities
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz null;

create index if not exists kwilt_arcs_not_deleted_idx
  on public.kwilt_arcs(user_id, updated_at desc)
  where is_deleted = false;

create index if not exists kwilt_goals_not_deleted_idx
  on public.kwilt_goals(user_id, updated_at desc)
  where is_deleted = false;

create index if not exists kwilt_activities_not_deleted_idx
  on public.kwilt_activities(user_id, updated_at desc)
  where is_deleted = false;


