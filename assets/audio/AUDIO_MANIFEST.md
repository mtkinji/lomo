# Kwilt Audio Manifest

This manifest records the production provenance and mastering status of bundled Kwilt audio. The machine-readable mastering and runtime policy lives in `src/capabilities/games/audio/audioGainPolicy.json` and is enforced through the repository audio audit tooling.

## Acceptance contract

An audio asset is ready for application integration only when it has:

- a named product owner and audio category;
- source or generation provenance, including model, prompt, generation date, generation id, and the subscription/terms context that applied at generation time;
- recorded editing and normalization transforms;
- duration, sample rate, channel count, integrated loudness, true peak, and leading/trailing silence measurements;
- a passing category policy or an explicit reviewed exception;
- fixed-volume listening approval on a physical iPhone.

Automated measurements do not establish perceived balance on phone speakers. Simulator playback does not establish physical-device loudness, silent-switch, Bluetooth, interruption, background, or lock-screen behavior.

## Bundled Focus fallback

| Asset | Owner | Category | Provenance | Current status |
| --- | --- | --- | --- | --- |
| `soundscapes/Sleep Music No. 1 - Chris Haugen.mp3` | Focus | `focus.music` | Pre-existing third-party track; preserve its existing license record | Baseline audit required |

All other continuous Focus and Games tracks are delivered from the immutable public catalog in `src/services/audioAssetCatalog.ts`, streamed on first play, and cached in the app cache when space permits. An unavailable uncached Focus track falls back to Deep Work Drift for that session.

## Remote continuous audio

Public root: `https://sqxwjtorodqjdfnuvprf.supabase.co/storage/v1/object/public/audio_assets/v1/`

| Catalog id | Reviewed title / purpose | Category | Immutable object |
| --- | --- | --- | --- |
| `focus.copacabana` | Copacabana Focus | `focus.music` | `focus/copacabana-focus-ccaaf823e168.mp3` |
| `focus.focus-tunnel` | Focus Tunnel | `focus.music` | `focus/focus-tunnel-f6d4ab6fde4e.mp3` |
| `focus.midnight-study` | Midnight Study Session | `focus.music` | `focus/midnight-study-3f5294ec1320.mp3` |
| `focus.open-road` | Open Road Focus 1 | `focus.music` | `focus/open-road-focus-8173b2ab68a5.mp3` |
| `focus.cedar-workshop` | Cedar Workshop 2 | `focus.music` | `focus/cedar-workshop-eac9775e1d4f.mp3` |
| `focus.rainlit-library` | Rainlit Library 2 | `focus.music` | `focus/rainlit-library-5731d14f10a5.mp3` |
| `game.story-relay` | Story Relay 1 | `game.music` | `games/story-relay-a63e69918b9c.mp3` |
| `game.clue-circle` | Clue Circle 2 | `game.music` | `games/clue-circle-f11ae524d433.mp3` |
| `game.slanguage` | Slanguage 1 | `game.music` | `games/slanguage-b4848a867f22.mp3` |
| `game.bank-initial` | Bank: Pot is growing | `game.music` | `games/bank-initial-9d384641ba20.mp3` |
| `game.bank-building` | Bank: High stakes | `game.music` | `games/bank-building-80c059ab399e.mp3` |
| `game.bank-maximum` | Bank: First risky rolls | `game.music` | `games/bank-maximum-b04a34eb7fd2.mp3` |

The Supabase `audio_assets` bucket is public-read, MP3-only, capped at 10 MiB per object, and has no client write policy. Objects use content-addressed names and `public, max-age=31536000, immutable` cache metadata.

## Existing UI effects

| Asset | Owner | Category | Provenance | Current status |
| --- | --- | --- | --- | --- |
| `sfx/list-tap.wav` | Activity step completion | `ui.micro` | Pre-existing bundled asset | Baseline audit required |
| `sfx/mark-complete.wav` | Whole-Activity completion | `ui.outcome` | Pre-existing bundled asset | Baseline audit required |

## Existing Games effects

Legacy source and license provenance remains in `assets/games/AUDIO_CREDITS.md`; do not remove it during generated-asset migration.

| Asset family | Owner | Category | Current status |
| --- | --- | --- | --- |
| `dice-roll*.mp3` | Dice mechanics | `game.mechanic` | Three coherent generated variants; mastered and automated audit passed; contextual review pending |
| `success-*`, `doubles-celebration.wav` | Player success signature | `game.signature` | Baseline audit required |
| `failure-*`, `bank-bust.wav` | Player setback signature | `game.signature` | Baseline audit required |
| `pattern-{coral,gold,pine,rose,sky,violet}.mp3` | Pass the Pattern notes | `game.pattern` | Andrew approved the selected variants in the family listening review |
| `pattern-miss.mp3` | Pass the Pattern miss | `game.pattern` | Andrew approved Pattern Miss 1 in the family listening review |
| `failure-cartoon-splat.mp3` | Player setback signature | `game.signature` | Andrew approved Cartoon Splat 1 in the family listening review |
| `success-power-lick-{1,2,3}.mp3` | Player win signature | `game.signature` | Andrew approved Power Licks 1–3; production mapping added 2026-07-31 |
| `success-banjo-run-1.mp3` | Player win signature | `game.signature` | Andrew approved Banjo Run 1; production mapping added 2026-07-31 |
| `success-tiny-crowd-{1,2,3,4}.mp3` | Player win signature; Tiny Crowd 1 also supplies the lower-gain Bank doubles cue | `game.signature` | Andrew approved all four clean-start Tiny Crowd variants; production mapping added 2026-07-31 |
| `bank-coin-gather-{1,3}.mp3` | Bank-the-pot mechanic | `game.mechanic` | Andrew approved Coin Gather 1 and 3; production alternates the two variants |

## Generated candidate record

Add one row per approved generation before copying it into a production asset directory.

| Final asset | Product owner | Category | ElevenLabs model | Prompt | Generation date/id | Credits | Transforms | Measurements | Physical-device review |
| --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- |
| `assets/games/pattern-*.mp3` (7 selected files) | Pass the Pattern | `game.pattern` | Sound Effects; exact model not retained in listening-room export | Prompt/id not retained in export | 2026-07-30 / unavailable | Recorded in generation workspace | Family mastering pass | 0.504 s each; -21.3 to -21.2 LUFS; audit pass | Andrew listening-room approval; in-app device review pending |
| `assets/games/failure-cartoon-splat.mp3` | Player profile setback | `game.signature` | Sound Effects; exact model not retained in listening-room export | Prompt/id not retained in export | 2026-07-30 / unavailable | Recorded in generation workspace | Signature mastering pass | 1.776 s; -18.3 LUFS; audit pass | Andrew listening-room approval; in-app device review pending |
| `assets/games/dice-roll{,-2,-3}.mp3` | Shared dice mechanics | `game.mechanic` | ElevenLabs Sound Effects; exact model not exposed in the generation UI | “Two real resin dice tumble across a shallow green-felt hardwood dice tray…” with close-miked natural foley, irregular clacks, a wooden-edge finish, and explicit exclusions for ambience, cups, voice, music, reverb, cartoon/UI, and cinematic treatment | 2026-07-31 / `LN2FbkpRnhYkpNTQEN9H` | 40 | Selected 3 of 4; decoded 48 kHz stereo Opus previews; onset trim; MP3 192 kbps transcode; category normalization; transparent peak limiting on variants 2–3 | 1.032 s each; -20.6 to -20.5 LUFS; -2.3 to -2.1 dBTP; audit pass | Simulator contextual review pending; physical-iPhone review pending |
| `assets/games/success-power-lick-{1,2,3}.mp3` | Player profile win | `game.signature` | ElevenLabs Sound Effects; generated in Andrew's paid workspace | Compact triumphant 2.4-second modern electric-guitar victory lick with a resolved ending; no MIDI, voice, crowd, or long reverb | 2026-07-31 / `KhVgAshHpGNtyE1cRUOX`, `KqylVozmas5P0BvQWVMZ`, `PLgzxKLe5JGuKoUJqo5p` | 72 | Family mastering pass; production files copied byte-for-byte from approved masters | 2.424 s; 48 kHz stereo; -18.2 LUFS; -11.2 to -9.7 dBTP; audit pass | Andrew Audio Lab approval; repeated in-app iPhone review pending |
| `assets/games/success-banjo-run-1.mp3` | Player profile win | `game.signature` | ElevenLabs Sound Effects; generated in Andrew's paid workspace | Exuberant 2.4-second acoustic banjo victory run with natural articulation and a resolved cadence | 2026-07-31 / `VrVnvU0kvLSYBIp3M17E` | 24 | Family mastering pass; production file copied byte-for-byte from approved master | 2.424 s; 48 kHz stereo; -18.2 LUFS; -6.6 dBTP; audit pass | Andrew Audio Lab approval; repeated in-app iPhone review pending |
| `assets/games/success-tiny-crowd-{1,2,3,4}.mp3` | Player profile win; Bank doubles reuse | `game.signature` | ElevenLabs Sound Effects; generated in Andrew's paid workspace | Compact clean-start small-group victory cheer with a natural swell, peak, and resolution | 2026-07-31 / `14wVUUxxip4MwGYNJd9w`, `4oEbpxhoHT0qS73HBg9A`, `F9ma9iFaJyT0dPeCG7CA`, `sFjcsavGsjy4CrRS9Uba` | 96 | Family mastering pass; Tiny Crowd 4 gently compressed before normalization; production files copied byte-for-byte from approved masters | 2.424 s; 48 kHz stereo; -18.5 to -18.2 LUFS; -11.3 to -1.7 dBTP; audit pass | Andrew Audio Lab approval; repeated in-app iPhone review pending |
| `assets/games/bank-coin-gather-{1,3}.mp3` | Bank-the-pot mechanic | `game.mechanic` | ElevenLabs Sound Effects; generated in Andrew's paid workspace | Real tabletop coins jingling, sliding together, and settling with one modest bright clink; explicitly not casino or jackpot audio | 2026-07-31 / `0gAeC0mG8K6kb4Q4ijD8`, `YJSnWHBOEQeLFzMWzRIw` | 24 | Family mastering pass; production files copied byte-for-byte from approved masters | 1.224 s; 48 kHz stereo; -20.3 to -20.2 LUFS; -9.4 to -8.2 dBTP; audit pass | Andrew Audio Lab approval; repeated in-app Bank review pending |
| Remote Focus and Games catalog above | Focus / Games | `focus.music`, `game.music` | Music generation; exact model metadata not retained in listening-room export | Prompt/id not retained in export | 2026-07-30 / unavailable | Recorded in generation workspace | MP3 mastering pass | Focus -24 LUFS; Games -24 LUFS | Andrew listening-room approval; in-app device review pending |
