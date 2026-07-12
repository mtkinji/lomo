create table public.game_saved_players (
  id uuid primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  linked_user_id uuid references auth.users(id) on delete set null,
  play_count integer not null default 0 check (play_count >= 0),
  last_played_at timestamptz,
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index game_saved_players_owner_user_id_idx on public.game_saved_players(owner_user_id);
alter table public.game_saved_players enable row level security;
revoke all on public.game_saved_players from anon;
grant select, insert, update, delete on public.game_saved_players to authenticated;

create policy "Owners read game players" on public.game_saved_players for select to authenticated using ((select auth.uid()) = owner_user_id);
create policy "Owners add game players" on public.game_saved_players for insert to authenticated with check ((select auth.uid()) = owner_user_id);
create policy "Owners update game players" on public.game_saved_players for update to authenticated using ((select auth.uid()) = owner_user_id) with check ((select auth.uid()) = owner_user_id);
create policy "Owners delete game players" on public.game_saved_players for delete to authenticated using ((select auth.uid()) = owner_user_id);
