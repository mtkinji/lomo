create table if not exists public.game_personal_bests (
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  player_key text not null check (player_key ~ '^(profile|saved):.+$'),
  game_key text not null check (game_key in ('bank', 'farkle')),
  score integer not null check (score >= 0),
  achieved_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (owner_user_id, player_key, game_key)
);

alter table public.game_personal_bests enable row level security;

revoke all on table public.game_personal_bests from anon, authenticated;
grant select, insert, update on table public.game_personal_bests to authenticated;

drop policy if exists "Players can read their private personal bests" on public.game_personal_bests;
create policy "Players can read their private personal bests"
on public.game_personal_bests for select
to authenticated
using ((select auth.uid()) = owner_user_id);

drop policy if exists "Players can create their private personal bests" on public.game_personal_bests;
create policy "Players can create their private personal bests"
on public.game_personal_bests for insert
to authenticated
with check ((select auth.uid()) = owner_user_id);

drop policy if exists "Players can improve their private personal bests" on public.game_personal_bests;
create policy "Players can improve their private personal bests"
on public.game_personal_bests for update
to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.preserve_game_personal_best()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.score <= old.score then
    new.score := old.score;
    new.achieved_at := old.achieved_at;
  end if;
  new.updated_at := greatest(new.updated_at, old.updated_at);
  return new;
end;
$$;

revoke all on function private.preserve_game_personal_best() from public, anon, authenticated;

drop trigger if exists preserve_game_personal_best on public.game_personal_bests;
create trigger preserve_game_personal_best
before update on public.game_personal_bests
for each row execute function private.preserve_game_personal_best();;
