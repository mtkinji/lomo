alter table public.game_saved_players
  add column if not exists color_id text not null default 'turmeric'
    check (color_id in ('turmeric', 'coral', 'mint', 'violet', 'sky', 'rose')),
  add column if not exists success_sound_id text not null default 'chime'
    check (success_sound_id in ('chime', 'sparkle', 'fanfare')),
  add column if not exists failure_sound_id text not null default 'trombone'
    check (failure_sound_id in ('trombone', 'bonk', 'wobble'));;
