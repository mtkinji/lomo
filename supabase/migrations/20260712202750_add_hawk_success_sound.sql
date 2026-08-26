alter table public.game_saved_players
  drop constraint if exists game_saved_players_success_sound_id_check;

alter table public.game_saved_players
  add constraint game_saved_players_success_sound_id_check
  check (success_sound_id in ('chime', 'sparkle', 'fanfare', 'hawk'));;
