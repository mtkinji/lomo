# Feedback-driven audio candidates — 2026-07-31

These files are review candidates, not production assets. Raw ElevenLabs exports live under `raw/`; matched-volume MP3 review masters live under `mastered/`. A file moves into the app only after contextual family review selects it.

## Loudness policy

- Player win signatures: `game.signature`, target **-18 LUFS**, maximum **-1.5 dBTP**.
- Bank mid-round mechanics: `game.mechanic`, target **-20 LUFS**, maximum **-2 dBTP**.
- All 24 review masters pass the repository audio audit. Tiny Crowd 4 needed gentle compression before normalization because one transient otherwise kept the cue 2.7 LU below its family.

## Generation ledger

| Family | Duration | ElevenLabs item IDs | Approx. credits |
| --- | ---: | --- | ---: |
| Power lick | 2.4 s | `KhVgAshHpGNtyE1cRUOX`, `KqylVozmas5P0BvQWVMZ`, `PLgzxKLe5JGuKoUJqo5p`, `xoI2bxBYWM1HChR1FZmR` | 96 |
| Banjo run | 2.4 s | `VrVnvU0kvLSYBIp3M17E`, `kTmYCVTGtQCWIJMPBppB`, `nEByLHQp0scasPhcXCfe`, `stShHT6vNHGAjeAaLmKj` | 96 |
| Tiny Crowd take two | 2.4 s | `14wVUUxxip4MwGYNJd9w`, `4oEbpxhoHT0qS73HBg9A`, `F9ma9iFaJyT0dPeCG7CA`, `sFjcsavGsjy4CrRS9Uba` | 96 |
| Wolf howl take two | 3.2 s | `YjrdT85CC694OW5CVfLn`, `d878P6ydRgzL7ukUew9d`, `iywcwIPbAZwhgCUODZln`, `qxwe8Y72QQ88uqHdSWOY` | 128 |
| Bank coin gather | 1.2 s | `0gAeC0mG8K6kb4Q4ijD8`, `6GPVUCOvE5UX3UI0wW9d`, `YJSnWHBOEQeLFzMWzRIw`, `mnJWysC8JZnjzA0eQ7lu` | 48 |
| Bank doubles celebration | 1.8 s | `AxXVjJtP630X4wPhs5Fd`, `Hr0Ee8FNzAeBgBHca0cI`, `gGdY4te4Gk1XdYef7G9h`, `poTXjasZxPUvBBUbtdtn` | 72 |

Estimated total for this round: **536 credits**.

## Prompts

### Power lick

> A compact triumphant electric guitar victory lick for a player win. Exactly 2.4 seconds. Begin with one bright power-chord attack, rise through a playful skilled rock riff, and finish on a confident resolved note. Real modern studio guitar through a polished amp: energetic, warm, crisp and full-bodied. Not heavy metal or ominous; no dissonance, MIDI guitar, drums, bass, crowd, voice, or long reverb. Isolated sound effect.

### Banjo run

> An exuberant acoustic banjo victory run for a player win. Exactly 2.4 seconds. Begin cleanly on the first plucked note, race through a nimble joyful bluegrass phrase, climb, then land on a bright satisfying final cadence. Real close-miked banjo with natural finger articulation, warm modern studio clarity, playful but accomplished. No single chord, comic stumble, MIDI, drums, crowd, voice, or long reverb. Isolated sound effect.

### Tiny Crowd take two

> A compact small-group victory cheer for a player win. Exactly 2.4 seconds. Begin with a natural inhale and first clap, never mid-celebration, then swell into delighted cheers, two or three claps, one warm peak, and a clean happy resolution. Six to ten real people in a cozy room, lively and believable, not a stadium. No words, chanting, whistles, music, abrupt cut-in, or hard cutoff. Modern clean recording.

### Wolf howl take two

> A realistic intense adult gray wolf victory howl outdoors. Exactly 3.2 seconds. Begin with a forceful breath and immediate rising howl, bloom into a powerful resonant peak, then taper naturally with a short wilderness tail. Wild animal realism, chest and throat texture, commanding and triumphant rather than scary. No dog bark, human imitation, pack chorus, music, synthetic effect, cartoon tone, or horror ambience.

### Bank coin gather

> A satisfying bank-the-pot coin gather for a family dice game. Exactly 1.2 seconds. Begin with several real metal coins jingling and sliding together, add one small bright clink as the pile settles, then stop cleanly. Warm physical tabletop foley, playful and rewarding, modest scale, not a jackpot. No cash register, slot machine, bell, synth, music, voice, casino ambience, magical sparkle, or huge impact.

### Bank doubles celebration

> A compact doubles celebration for a family dice game. Exactly 1.8 seconds. A tiny room-sized group notices the lucky roll, gives a delighted ooh and brief cheer with two quick claps, then resolves naturally. Start from silence, never mid-cheer. Warm, playful, believable and rewarding, not a stadium or casino. No words, chant, whistle, music, buzzer, jackpot bell, synthetic hit, or hard cutoff.

## Review gate

Review these in the private Kwilt Audio Lab at one comfortable device volume. Use **Try in context** for Bank and profile-win comparisons, then **Browse every sound → Fresh batch** to vote on individual candidates. Treat a listening-room vote as a shortlist signal; the final keep decision still requires in-app repetition on a physical iPhone.

## Andrew review outcome

Recorded 2026-07-31:

- **Primary in-app shortlist:** Power lick 1–3; Banjo run 1; Tiny Crowd 1–4; Bank coin gather 1 and 3.
- **Reserve / maybe:** Power lick 4; Banjo run 2–4; Bank coin gather 2 and 4.
- **Rejected:** Wolf howl 1–4 and Bank doubles celebration 1–4.

The doubles family should not be regenerated now. Reuse a lighter approved celebration cue for the mid-round doubles moment, with less weight than the player's end-of-round victory signature. Pause Wolf generation as well: another attempt would need a real wildlife source or a materially different production method, not another prompt variation on the rejected approach.

The production mapping approved later on 2026-07-31 promoted Power Licks 1–3, Banjo Run 1, Tiny Crowd 1–4, and Coin Gather 1 and 3 into `assets/games/`. Bank doubles reuse Tiny Crowd 1 through a separate reduced-gain player. The reserve and rejected files remain review candidates only.

The promoted files still require repeated in-app use on a physical iPhone at a fixed, comfortable device volume before the release can be described as device-proven.
