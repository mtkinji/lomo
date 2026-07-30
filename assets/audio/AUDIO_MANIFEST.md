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

## Existing Focus soundscapes

| Asset | Owner | Category | Provenance | Current status |
| --- | --- | --- | --- | --- |
| `soundscapes/Sleep Music No. 1 - Chris Haugen.mp3` | Focus | `focus.music` | Pre-existing third-party track; preserve its existing license record | Baseline audit required |
| `soundscapes/Copacabana Focus.mp3` | Focus | `focus.music` | Existing ElevenLabs generation in Andrew's paid workspace | Baseline audit required |
| `soundscapes/Focus Flow State.mp3` | Focus | `focus.music` | Existing ElevenLabs generation in Andrew's paid workspace | Baseline audit required |
| `soundscapes/Midnight Study Session.mp3` | Focus | `focus.music` | Existing ElevenLabs generation in Andrew's paid workspace | Baseline audit required |

## Existing UI effects

| Asset | Owner | Category | Provenance | Current status |
| --- | --- | --- | --- | --- |
| `sfx/list-tap.wav` | Activity step completion | `ui.micro` | Pre-existing bundled asset | Baseline audit required |
| `sfx/mark-complete.wav` | Whole-Activity completion | `ui.outcome` | Pre-existing bundled asset | Baseline audit required |

## Existing Games effects

Legacy source and license provenance remains in `assets/games/AUDIO_CREDITS.md`; do not remove it during generated-asset migration.

| Asset family | Owner | Category | Current status |
| --- | --- | --- | --- |
| `dice-roll*.mp3` | Dice mechanics | `game.mechanic` | Baseline audit required |
| `success-*`, `doubles-celebration.wav` | Player success signature | `game.signature` | Baseline audit required |
| `failure-*`, `bank-bust.wav` | Player setback signature | `game.signature` | Baseline audit required |

## Generated candidate record

Add one row per approved generation before copying it into a production asset directory.

| Final asset | Product owner | Category | ElevenLabs model | Prompt | Generation date/id | Credits | Transforms | Measurements | Physical-device review |
| --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- |
