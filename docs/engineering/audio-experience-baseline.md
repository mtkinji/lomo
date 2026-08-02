# Audio Experience Baseline

Captured: 2026-07-30

Checkout: `/Users/andrewwatanabe/Kwilt/.worktrees/audio-experience`

Branch: `codex/audio-experience`
Starting point: `origin/main` at `1a37e8e`, plus the committed audio plan at `ab0c97f`

## Why this baseline exists

The audio experience plan requires volume consistency to be measurable before ElevenLabs candidates enter the app. This report records the existing library against the proposed category policy. It is diagnostic evidence, not permission to bulk-normalize or replace existing assets.

Command:

```bash
npm run audio:audit -- --json /tmp/kwilt-audio-baseline.json
```

Result: **1 of 16 assets** met the proposed category policy.

## Material findings

- Existing player-signature assets span **32.4 LU**: from `bank-bust.wav` at -14.2 LUFS to `success-sparkle.wav` at -39.3 LUFS. That is large enough for the loudest choice to feel inherently “better” and for listeners to adjust device volume between profiles.
- Existing dice recordings span **21.1 LU**: `dice-roll-3.mp3` is -6.9 LUFS with a +2 dBTP true peak, while the other two are about -28 LUFS.
- Existing Focus tracks span **5.3 LU** and three approach or exceed 0 dBTP. Switching tracks can therefore change perceived level even before the app's runtime gain is considered.
- `mark-complete.wav` measures -8.1 LUFS and -0.1 dBTP, while `list-tap.wav` measures -70 LUFS. The two completion layers are not merely differentiated; they occupy radically different loudness ranges.
- Several one-shots contain 117–480 ms of leading silence, which delays their haptic/audio relationship and can make playback feel unresponsive.

## Measured inventory

| Asset | Category | Duration | Format | LUFS | dBTP | Leading silence | Policy result |
| --- | --- | ---: | --- | ---: | ---: | ---: | --- |
| `assets/audio/sfx/list-tap.wav` | `ui.micro` | 0.347 s | 48 kHz stereo | -70.0 | -22.1 | 29 ms | Review: far below target |
| `assets/audio/sfx/mark-complete.wav` | `ui.outcome` | 1.483 s | 44.1 kHz stereo | -8.1 | -0.1 | 0 ms | Review: loudness and peak |
| `assets/audio/soundscapes/Copacabana Focus.mp3` | `focus.music` | 239.961 s | 44.1 kHz stereo | -11.7 | +0.8 | 0 ms | Review: loudness and peak |
| `assets/audio/soundscapes/Focus Flow State.mp3` | `focus.music` | 240.013 s | 44.1 kHz stereo | -17.0 | -2.0 | 76 ms | Review: loudness and leading silence |
| `assets/audio/soundscapes/Midnight Study Session.mp3` | `focus.music` | 240.013 s | 44.1 kHz stereo | -15.1 | -0.1 | 25 ms | Review: loudness and peak |
| `assets/audio/soundscapes/Sleep Music No. 1 - Chris Haugen.mp3` | `focus.music` | 194.194 s | 44.1 kHz stereo | -14.1 | -0.1 | 176 ms | Review: loudness, peak, and leading silence |
| `assets/games/bank-bust.wav` | `game.signature` | 4.400 s | 48 kHz stereo | -14.2 | -3.2 | 204 ms | Review: loudness and leading silence |
| `assets/games/dice-roll-2.mp3` | `game.mechanic` | 3.000 s | 48 kHz mono | -28.0 | -2.2 | 179 ms | Review: loudness and leading silence |
| `assets/games/dice-roll-3.mp3` | `game.mechanic` | 0.731 s | 44.1 kHz stereo | -6.9 | +2.0 | 0 ms | Review: loudness and peak |
| `assets/games/dice-roll.mp3` | `game.mechanic` | 1.149 s | 44.1 kHz stereo | -27.8 | -5.5 | 117 ms | Review: loudness and leading silence |
| `assets/games/doubles-celebration.wav` | `game.signature` | 2.350 s | 48 kHz stereo | -25.5 | -14.2 | 171 ms | Review: loudness and leading silence |
| `assets/games/failure-bonk.wav` | `game.signature` | 1.350 s | 48 kHz stereo | -18.3 | -3.5 | 480 ms | Review: leading silence |
| `assets/games/failure-wobble.wav` | `game.signature` | 1.700 s | 48 kHz stereo | -18.5 | -9.3 | 0 ms | Pass |
| `assets/games/success-fanfare.wav` | `game.signature` | 4.200 s | 48 kHz stereo | -20.5 | -5.4 | 268 ms | Review: loudness and leading silence |
| `assets/games/success-hawk.mp3` | `game.signature` | 1.512 s | 48 kHz stereo | -29.3 | -17.0 | 0 ms | Review: far below target |
| `assets/games/success-sparkle.wav` | `game.signature` | 1.250 s | 48 kHz stereo | -39.3 | -21.9 | 0 ms | Review: far below target |

## Tool proof

The repository normalizer was exercised on a temporary copy of `failure-wobble.wav`:

```bash
npm run audio:normalize -- \
  --category game.signature \
  --output-dir /tmp/kwilt-audio-normalized \
  assets/games/failure-wobble.wav

npm run audio:audit:enforce -- \
  --category game.signature \
  /tmp/kwilt-audio-normalized/failure-wobble.wav
```

The normalized temporary file measured -18.0 LUFS, -8.8 dBTP, 0 ms leading silence, and passed. No production asset was modified.

## Decisions carried forward

1. Do not tune runtime gains around the current inconsistent masters.
2. Master generated candidates by category first, then compare them at the same runtime gain.
3. Treat the numeric targets as provisional until fixed-volume physical-iPhone listening calibrates the category as a whole.
4. Keep player-signature candidates within 1 LU and Pass Pattern notes within 0.75 LU before subjective review.
5. Use arrangement, rhythm, density, and instrumentation—not increasing loudness—to create Bank intensity.

## Proof boundaries

- EBU R128 results expose library inconsistency but do not prove perceived loudness on a phone speaker.
- This checkout has not claimed Metro, a Simulator, or a signed physical-device runtime.
- No ElevenLabs credits were spent during the baseline.
- No existing audio asset was changed or normalized in place.
