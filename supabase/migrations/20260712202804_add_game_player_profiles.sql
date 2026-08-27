create table if not exists public.game_player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 18),
  color_id text not null default 'turmeric'
    check (color_id in ('turmeric', 'coral', 'mint', 'violet', 'sky', 'rose')),
  success_sound_id text not null default 'chime'
    check (success_sound_id in ('chime', 'sparkle', 'fanfare', 'hawk')),
  failure_sound_id text not null default 'trombone'
    check (failure_sound_id in ('trombone', 'bonk', 'wobble')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.game_player_profiles enable row level security;

revoke all on table public.game_player_profiles from anon;
revoke all on table public.game_player_profiles from authenticated;
grant select, insert, update on table public.game_player_profiles to authenticated;

drop policy if exists "Players can read their own game profile" on public.game_player_profiles;
create policy "Players can read their own game profile"
on public.game_player_profiles for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Players can create their own game profile" on public.game_player_profiles;
create policy "Players can create their own game profile"
on public.game_player_profiles for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Players can update their own game profile" on public.game_player_profiles;
create policy "Players can update their own game profile"
on public.game_player_profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);;
