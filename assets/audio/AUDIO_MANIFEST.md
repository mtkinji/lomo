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
| `focus.copacabana` | Copacabana | `focus.music` | `focus/copacabana-focus-9714caeb0913.mp3` |
| `focus.focus-tunnel` | Focus Tunnel | `focus.music` | `focus/focus-tunnel-36e2e0d5c498.mp3` |
| `focus.midnight-study` | Midnight Study | `focus.music` | `focus/midnight-study-f415ecb449e4.mp3` |
| `focus.open-road` | Open Road | `focus.music` | `focus/open-road-focus-707dfde8b7ee.mp3` |
| `focus.cedar-workshop` | Cedar Workshop | `focus.music` | `focus/cedar-workshop-56a9047ea7ae.mp3` |
| `focus.rainlit-library` | Rainlit Library | `focus.music` | `focus/rainlit-library-f28fdc597fd5.mp3` |
| `focus.quiet-rain` | Quiet Rain | `focus.music` | `focus/quiet-rain-bb036739700b.mp3` |
| `focus.forest-stream` | Forest Stream | `focus.music` | `focus/forest-stream-96a2d1cccd42.mp3` |
| `focus.ocean-waves` | Ocean Waves | `focus.music` | `focus/ocean-waves-1bc54848be4d.mp3` |
| `focus.fireplace` | Fireplace | `focus.music` | `focus/fireplace-437701bb0f20.mp3` |
| `focus.night-meadow` | Night Meadow | `focus.music` | `focus/night-meadow-652815cb09d9.mp3` |
| `game.story-relay` | Story Relay 1 | `game.music` | `games/story-relay-a63e69918b9c.mp3` |
| `game.clue-circle` | Clue Circle 2 | `game.music` | `games/clue-circle-f11ae524d433.mp3` |
| `game.slanguage` | Slanguage 1 | `game.music` | `games/slanguage-b4848a867f22.mp3` |
| `game.bank-initial` | Bank: Pot is growing | `game.music` | `games/bank-initial-9d384641ba20.mp3` |
| `game.bank-building` | Bank: High stakes | `game.music` | `games/bank-building-80c059ab399e.mp3` |
| `game.bank-maximum` | Bank: First risky rolls | `game.music` | `games/bank-maximum-b04a34eb7fd2.mp3` |

The Supabase `audio_assets` bucket is public-read, MP3-only, capped at 10 MiB per object, and has no client write policy. Objects use content-addressed names. Earlier August 10 Dashboard uploads returned `Cache-Control: no-cache`; changing only their `storage.objects.metadata.cacheControl` values did not change the public response. The replacement Quiet Rain upload returned `Cache-Control: public, max-age=3600`, and its first range request returned `max-age=3600`. A one-year immutable cache policy remains a delivery-optimization follow-up and is not represented as complete here.

## Focus seamless-loop corrected masters

The August 10 correction pass preserves the six published July music sources, removes their composed intro/outro boundary, rotates each accepted candidate to an established internal start point, and places an equal-power crossfade inside the master. The authoring sources, rejected candidates, lossless intermediates, and boundary auditions remain outside Git and the app bundle. Every row below passed the automated `focus.music` and loop-seam policies and was published at its content-addressed object. Andrew's boundary listening and signed-iPhone playback remain pending.

| Track | Transform | Measurements | Candidate SHA-256 | Status |
| --- | --- | --- | --- | --- |
| Copacabana | 16 s loop start; 16 s equal-power tail-to-head crossfade | 223.992 s; 48 kHz stereo; -24.2 LUFS; -11.0 dBTP; 0 ms lead/tail; 1.10 dB boundary delta; -65.56 dBFS derivative jump | `9714caebdff69795bcffaa70faaae030b9a62dca4677261f1cc3bbd7d6ef09d7` | Published; automated pass; listening pending |
| Focus Tunnel | 8 s loop start; 8 s equal-power tail-to-head crossfade | 232.056 s; 48 kHz stereo; -24.2 LUFS; -9.3 dBTP; 0 ms lead/tail; 0.13 dB boundary delta; -49.10 dBFS derivative jump | `36e2e0d582f1efe69afd251e9f8cff522f51c09db6303a4b4ac16d485f5a9121` | Published; automated pass; listening pending |
| Midnight Study | 30 s loop start; 12 s equal-power tail-to-head crossfade | 210.048 s; 48 kHz stereo; -24.2 LUFS; -9.1 dBTP; 0 ms lead/tail; 2.92 dB boundary delta; -36.31 dBFS derivative jump | `f415ecb4a9108b7b4f4652bd2fe5a6920a21a95082b7df417d96a1de67304171` | Published; automated pass; listening pending |
| Open Road | 45 s loop start; 12 s equal-power tail-to-head crossfade | 183.072 s; 48 kHz stereo; -24.2 LUFS; -11.5 dBTP; 0 ms lead/tail; 1.79 dB boundary delta; -63.15 dBFS derivative jump | `707dfde8636abcfa2f86d554b146139f4a746ca3d1d959534060792aa564acb3` | Published; automated pass; listening pending |
| Cedar Workshop | 60 s loop start; 12 s equal-power tail-to-head crossfade | 168.048 s; 48 kHz stereo; -24.2 LUFS; -8.4 dBTP; 0 ms lead/tail; 2.75 dB boundary delta; -38.41 dBFS derivative jump | `56a9047e031d4f4f598d6b0d1d5390e20a2b76f27f0f5142526d2de3def5a371` | Published; automated pass; listening pending |
| Rainlit Library | 60 s loop start; 12 s equal-power tail-to-head crossfade | 167.832 s; 48 kHz stereo; -24.2 LUFS; -12.8 dBTP; 0 ms lead/tail; 0.20 dB boundary delta; -37.94 dBFS derivative jump | `f28fdc596dab4f3d9c36ed1ce5d826681ba12c72809fb3b543d36a348457a8a8` | Published; automated pass; listening pending |

## Focus nature masters

ElevenLabs Sound Effects v2 produced four 30-second loop-enabled candidates per prompt. Forest Stream was generated twice because the first result arrived after the UI poll, yielding eight candidates and 2,400 credits spent for that family. The accepted WAVs were rotated through a one- or two-second equal-power seam, tiled eight times before the single delivery encode, normalized with one decibel of lossy-codec true-peak headroom, and published as multi-minute masters. This makes source repetition less recognizable and reduces native transport boundaries to roughly one every four minutes. Andrew rejected the first published Quiet Rain master after in-app listening because it cycled like waves and exposed a narrow whiny motor artifact. Candidate 4 from the retained generation was then screened with a rain-specific stationarity gate before remastering; the rejected immutable object remains published but is no longer referenced by the catalog.

| Track | Accepted generation | Transform | Measurements | Master SHA-256 | Status |
| --- | --- | --- | --- | --- | --- |
| Quiet Rain | `l4E1JzV5tX9J61qBmIfD`, candidate 4 | 1 s seam; 29 s unit tiled 8x | 232.032 s; -24.2 LUFS; -4.5 dBTP; 0 ms lead/tail; 0.31 dB boundary delta; 2.59 dB slow loudness spread; 0.79 dB deviation | `bb036739700b8663c2289af51271282423be033ae8233b7a0d01fc5bdbbc3cd0` | Published replacement; seam and steady-rain automated pass; replacement listening pending |
| Forest Stream | `Ynta6iO9N0GdPn1KME47`, candidate 4 | 1 s seam; 29 s unit tiled 8x | 232.032 s; -24.2 LUFS; -3.2 dBTP; 0 ms lead/tail; 0.39 dB boundary delta | `96a2d1cccd42cbd0322d589917e1bca4f100cc446efd1ecbee6e9cb8c75af840` | Published; automated pass; listening pending |
| Ocean Waves | `vU1DnIbxUSpPSVQxBQRb`, candidate 3 | 2 s seam; 28 s unit tiled 8x | 224.040 s; -24.2 LUFS; -3.1 dBTP; 0 ms lead/tail; 1.97 dB boundary delta | `1bc54848be4d5e6aa7191723c6aa9d647000d01d1748d05498d5ac5fed9e482a` | Published; automated pass; listening pending |
| Fireplace | `y8EVp6AsoKXQMpZGQfsQ`, candidate 4 | 1 s seam; 29 s unit tiled 8x | 232.032 s; -24.2 LUFS; -3.0 dBTP; 0 ms lead/tail; 0.69 dB boundary delta | `437701bb0f201add2f5034753848eddc952b8d4f5c9a62e093700b2f22439b4c` | Published; automated pass; listening pending |
| Night Meadow | `YiqNkeyhoLwnZhsPugTR`, candidate 1 | 1 s seam; 29 s unit tiled 8x | 232.032 s; -24.2 LUFS; -13.8 dBTP; 0 ms lead/tail; 0.58 dB boundary delta | `652815cb09d9367a19808cc6f555b05562919911414baba706e6593c69f85de9` | Published; automated pass; listening pending |

### Runtime proof

On August 10, the active Metro server was verified as owned by `/Users/andrewwatanabe/Kwilt`, and the installed `com.andrewwatanabe.kwilt` development client was exercised on an iPhone 17 Pro Simulator running iOS 26.5. `kwilt://focus` rendered one Soundscape control with Music and Nature groups, all eleven remote choices, one dominant Start action, and a scrollable menu. The original Quiet Rain selected successfully and started a one-minute Focus session with audio enabled, but Andrew subsequently rejected its sound. After the catalog update, the supported Focus deep link started a one-minute `quietRain` session, and the Simulator cache created `focus-quiet-rain-bb036739700b.mp3` at the exact expected 5,569,388-byte size while the old cache file remained separately addressable. This proves replacement catalog resolution, remote download, caching, and playback start in Simulator; repeated-boundary listening and signed physical-iPhone behavior remain acceptance gates.

The paired physical device is Andy's iPhone 16 on iOS 26.5.2 with Developer Mode enabled. CoreDevice reached it over the local network, but the device was locked and rejected developer-disk-image mounting with `kAMDMobileImageMounterDeviceLocked`; signed-device inspection and playback therefore remain unproven until the phone is unlocked.

## Existing UI effects

| Asset | Owner | Category | Provenance | Current status |
| --- | --- | --- | --- | --- |
| `sfx/list-tap.wav` | Activity step completion | `ui.micro` | Pre-existing bundled asset | Baseline audit required |
| `sfx/mark-complete.wav` | Whole-Activity completion | `ui.outcome` | Pre-existing bundled asset | Baseline audit required |
| `sfx/focus-complete-chime.wav` | Focus completion | `ui.outcome` | ElevenLabs Sound Effects generation `4QdrqZp33WPD8UPQogly`, candidate 2 of 4; low singing-bowl generation mastered from the 48 kHz stereo WAV export | 4.000 s; 48 kHz stereo PCM; -20.0 LUFS; -8.5 dBTP; 0 ms lead; 60 ms tail; automated audit passed; physical-iPhone listening pending |

## Existing Games effects

Legacy source and license provenance remains in `assets/games/AUDIO_CREDITS.md`; do not remove it during generated-asset migration.

| Asset family | Owner | Category | Current status |
| --- | --- | --- | --- |
| `dice-roll*.mp3` | Dice mechanics | `game.mechanic` | Three coherent generated variants; mastered and automated audit passed; contextual review pending |
| `success-*`, `doubles-celebration.wav` | Player success signature | `game.signature` | Baseline audit required |
| `failure-*`, `bank-bust.wav` | Player setback signature | `game.signature` | Baseline audit required |
| `pattern-{coral,gold,pine,rose,sky,violet}.mp3` | Pass the Pattern notes | `game.pattern` | Andrew approved the selected variants in the family listening review |
| `pattern-miss.mp3` | Pass the Pattern miss | `game.pattern` | Andrew approved Pattern Miss 1 in the family listening review |
| `music/pattern-{funk,jazz,rock,blues}.wav` | Pass the Pattern background grooves | `game.music` | Original deterministic synthesis; loudness and loop-seam audits pass; Simulator and physical-iPhone review pending |
| `failure-cartoon-splat.mp3` | Player setback signature | `game.signature` | Andrew approved Cartoon Splat 1 in the family listening review |
| `success-power-lick-{1,2,3}.mp3` | Player win signature | `game.signature` | Andrew approved Power Licks 1–3; production mapping added 2026-07-31 |
| `success-banjo-run-1.mp3` | Player win signature | `game.signature` | Andrew approved Banjo Run 1; production mapping added 2026-07-31 |
| `success-tiny-crowd-{1,2,3,4}.mp3` | Player win signature; Tiny Crowd 1 also supplies the lower-gain Bank doubles cue and Activities streak/all-done celebrations | `game.signature` | Andrew approved all four clean-start Tiny Crowd variants; Activities reuse adds no audio asset to the bundle |
| `bank-coin-gather-{1,3}.mp3` | Bank-the-pot mechanic | `game.mechanic` | Andrew approved Coin Gather 1 and 3; production alternates the two variants |

## Procedural Pass the Pattern grooves

These bundled learning-release loops contain no generated-model or third-party source audio. `scripts/audio/build-pattern-grooves.mjs` deterministically synthesizes kick, snare, hat, ride, and a seam-safe low-level bed at 48 kHz mono PCM. It renders surrounding bars, cuts each loop at a matching musical phase, and writes one fixed four-bar groove per style. The style names describe the authored rhythm patterns rather than licensed songs. Automated approval does not replace Andrew's contextual family and physical-iPhone listening gate.

| Asset | Tempo / duration | Measurements | Loop seam | SHA-256 | Status |
| --- | --- | --- | --- | --- | --- |
| `assets/games/music/pattern-funk.wav` | 100 BPM / 9.600 s | -23.4 LUFS; -4.9 dBTP; 0 ms lead/tail | 1.14 dB boundary delta; -90.31 dBFS derivative | `6f09b67adf19a5a6b02b60e8baab05cb460fb592df66b012713c601f009e6456` | Automated pass; contextual review pending |
| `assets/games/music/pattern-jazz.wav` | 96 BPM / 10.000 s | -24.6 LUFS; -4.1 dBTP; 0 ms lead/tail | 0.28 dB boundary delta; -90.31 dBFS derivative | `da01f42b5270b52d13da8dccb3fee31308b4fd93336a3b13331049d9c673b803` | Automated pass; contextual review pending |
| `assets/games/music/pattern-rock.wav` | 112 BPM / 8.571 s | -23.5 LUFS; -4.6 dBTP; 0 ms lead/tail | 0.53 dB boundary delta; -90.31 dBFS derivative | `979bd9c83b25b152b669903c86f2154abf266c9f61f7d56ab1dc814ba8994742` | Automated pass; contextual review pending |
| `assets/games/music/pattern-blues.wav` | 88 BPM / 10.909 s | -23.9 LUFS; -3.3 dBTP; 0 ms lead/tail | 0.28 dB boundary delta; -90.31 dBFS derivative | `ddc9ca158a7e9a4cf9ca431ef938a98b2d986c02799dbfb2a7f73cfbbcf2a3a5` | Automated pass; contextual review pending |

## Generated candidate record

Add one row per approved generation before copying it into a production asset directory.

| Final asset | Product owner | Category | ElevenLabs model | Prompt | Generation date/id | Credits | Transforms | Measurements | Physical-device review |
| --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- |
| `assets/games/pattern-*.mp3` (7 selected files) | Pass the Pattern | `game.pattern` | Sound Effects; exact model not retained in listening-room export | Prompt/id not retained in export | 2026-07-30 / unavailable | Recorded in generation workspace | Family mastering pass | 0.504 s each; -21.3 to -21.2 LUFS; audit pass | Andrew listening-room approval; in-app device review pending |
| `assets/games/failure-cartoon-splat.mp3` | Player profile setback | `game.signature` | Sound Effects; exact model not retained in listening-room export | Prompt/id not retained in export | 2026-07-30 / unavailable | Recorded in generation workspace | Signature mastering pass | 1.776 s; -18.3 LUFS; audit pass | Andrew listening-room approval; in-app device review pending |
| `assets/games/dice-roll{,-2,-3}.mp3` | Shared dice mechanics | `game.mechanic` | ElevenLabs Sound Effects; exact model not exposed in the generation UI | “Two real resin dice tumble across a shallow green-felt hardwood dice tray…” with close-miked natural foley, irregular clacks, a wooden-edge finish, and explicit exclusions for ambience, cups, voice, music, reverb, cartoon/UI, and cinematic treatment | 2026-07-31 / `LN2FbkpRnhYkpNTQEN9H` | 40 | Selected 3 of 4; decoded 48 kHz stereo Opus previews; onset trim; MP3 192 kbps transcode; category normalization; transparent peak limiting on variants 2–3 | 1.032 s each; -20.6 to -20.5 LUFS; -2.3 to -2.1 dBTP; audit pass | Simulator contextual review pending; physical-iPhone review pending |
| `assets/games/success-power-lick-{1,2,3}.mp3` | Player profile win | `game.signature` | ElevenLabs Sound Effects; generated in Andrew's paid workspace | Compact triumphant 2.4-second modern electric-guitar victory lick with a resolved ending; no MIDI, voice, crowd, or long reverb | 2026-07-31 / `KhVgAshHpGNtyE1cRUOX`, `KqylVozmas5P0BvQWVMZ`, `PLgzxKLe5JGuKoUJqo5p` | 72 | Family mastering pass; production files copied byte-for-byte from approved masters | 2.424 s; 48 kHz stereo; -18.2 LUFS; -11.2 to -9.7 dBTP; audit pass | Andrew Audio Lab approval; repeated in-app iPhone review pending |
| `assets/games/success-banjo-run-1.mp3` | Player profile win | `game.signature` | ElevenLabs Sound Effects; generated in Andrew's paid workspace | Exuberant 2.4-second acoustic banjo victory run with natural articulation and a resolved cadence | 2026-07-31 / `VrVnvU0kvLSYBIp3M17E` | 24 | Family mastering pass; production file copied byte-for-byte from approved master | 2.424 s; 48 kHz stereo; -18.2 LUFS; -6.6 dBTP; audit pass | Andrew Audio Lab approval; repeated in-app iPhone review pending |
| `assets/games/success-tiny-crowd-{1,2,3,4}.mp3` | Player profile win; Bank doubles reuse; Activities completion celebrations | `game.signature` | ElevenLabs Sound Effects; generated in Andrew's paid workspace | Compact clean-start small-group victory cheer with a natural swell, peak, and resolution | 2026-07-31 / `14wVUUxxip4MwGYNJd9w`, `4oEbpxhoHT0qS73HBg9A`, `F9ma9iFaJyT0dPeCG7CA`, `sFjcsavGsjy4CrRS9Uba` | 96 | Family mastering pass; Tiny Crowd 4 gently compressed before normalization; production files copied byte-for-byte from approved masters | 2.424 s; 48 kHz stereo; -18.5 to -18.2 LUFS; -11.3 to -1.7 dBTP; audit pass | Andrew Audio Lab approval; repeated in-app iPhone review pending, including Activities warm/prominent gains |
| `assets/games/bank-coin-gather-{1,3}.mp3` | Bank-the-pot mechanic | `game.mechanic` | ElevenLabs Sound Effects; generated in Andrew's paid workspace | Real tabletop coins jingling, sliding together, and settling with one modest bright clink; explicitly not casino or jackpot audio | 2026-07-31 / `0gAeC0mG8K6kb4Q4ijD8`, `YJSnWHBOEQeLFzMWzRIw` | 24 | Family mastering pass; production files copied byte-for-byte from approved masters | 1.224 s; 48 kHz stereo; -20.3 to -20.2 LUFS; -9.4 to -8.2 dBTP; audit pass | Andrew Audio Lab approval; repeated in-app Bank review pending |
| `assets/audio/sfx/focus-complete-chime.wav` | Focus completion | `ui.outcome` | ElevenLabs Sound Effects; exact model not exposed in the generation UI | One single low, deeply resonant meditation singing bowl struck very softly with a padded mallet. A dark warm fundamental blooms slowly with rich lower harmonics and a spacious organic sustain, then decays naturally for four seconds. Grounding, calm, intimate studio recording. No bright bell ping, no piercing highs, no second strike, no melody, no music, no voice, no ambience, no crowd, no bass boom, no cinematic impact, and no artificial reverb. | 2026-08-13 / `4QdrqZp33WPD8UPQogly`, candidate 2 | 160 for this four-candidate batch; 280 total including the superseded 3-second batch | Selected 1 of 4; 48 kHz stereo WAV export; onset trim; `ui.outcome` category normalization and a final -1.9 dB gain correction; production SHA-256 `0f1900eabdcb036393a4c4946e54934f66b2f258535e15718d7627e73ed34e39` | 4.000 s; -20.0 LUFS; -8.5 dBTP; 0 ms lead; 60 ms tail; audit pass | Physical-iPhone listening pending |
| `focus/quiet-rain-90631c045614.mp3` (rejected, unreferenced) | Focus | `focus.music` | ElevenLabs Sound Effects v2, Looping on | Seamless 30-second quiet steady rain ambience for deep focus; soft rain on leaves and a distant roof; steady density; no thunder, voices, birds, music, foreground drops, or fades | 2026-08-10 / `l4E1JzV5tX9J61qBmIfD`, candidate 3 | Included in the 1,200-credit four-candidate batch | 1 s equal-power seam; 29 s unit tiled 8x; two-pass loudness normalization; MP3 codec headroom | 232.032 s; slow loudness spread 8.74 dB; deviation 3.42 dB; rain-specific audit reject | Andrew rejected in app: wave-like fades plus whiny motor artifact |
| `focus/quiet-rain-bb036739700b.mp3` | Focus | `focus.music` | ElevenLabs Sound Effects v2, Looping on | Seamless 30-second quiet steady rain ambience for deep focus; soft rain on leaves and a distant roof; steady density; no thunder, voices, birds, music, foreground drops, or fades | 2026-08-10 / `l4E1JzV5tX9J61qBmIfD`, candidate 4 | Included in the same 1,200-credit four-candidate batch; no additional generation spend | 1 s equal-power seam; 29 s unit tiled 8x; two-pass loudness normalization; MP3 codec headroom | 232.032 s; -24.2 LUFS; -4.5 dBTP; 0.31 dB seam delta; slow loudness spread 2.59 dB; deviation 0.79 dB; steady-rain audit pass | Replacement fixed-volume and signed-iPhone review pending |
| `focus/forest-stream-96a2d1cccd42.mp3` | Focus | `focus.music` | ElevenLabs Sound Effects v2, Looping on | Seamless 30-second forest stream ambience for deep focus; clear steady water over rounded stones; no birds, insects, voices, footsteps, music, or fades | 2026-08-10 / `Ynta6iO9N0GdPn1KME47`, candidate 4; extra batch `gHOnfFgxjH4YiBTABmne` retained outside Git | 2,400 | 1 s equal-power seam; 29 s unit tiled 8x; two-pass loudness normalization; MP3 codec headroom | 232.032 s; -24.2 LUFS; -3.2 dBTP; seam audit pass | Boundary and signed-iPhone review pending |
| `focus/ocean-waves-1bc54848be4d.mp3` | Focus | `focus.music` | ElevenLabs Sound Effects v2, Looping on | Seamless 30-second gentle ocean waves for deep focus; slow small waves on a sandy shore; no gulls, boats, people, music, crashes, or fades | 2026-08-10 / `vU1DnIbxUSpPSVQxBQRb`, candidate 3 | 1,200 | 2 s equal-power seam; 28 s unit tiled 8x; two-pass loudness normalization; MP3 codec headroom | 224.040 s; -24.2 LUFS; -3.1 dBTP; seam audit pass | Boundary and signed-iPhone review pending |
| `focus/fireplace-437701bb0f20.mp3` | Focus | `focus.music` | ElevenLabs Sound Effects v2, Looping on | Seamless 30-second quiet fireplace ambience for deep focus; small steady wood fire and ember bed; no loud pops, voices, room sounds, music, or fades | 2026-08-10 / `y8EVp6AsoKXQMpZGQfsQ`, candidate 4 | 1,200 | 1 s equal-power seam; 29 s unit tiled 8x; two-pass loudness normalization; MP3 codec headroom | 232.032 s; -24.2 LUFS; -3.0 dBTP; seam audit pass | Boundary and signed-iPhone review pending |
| `focus/night-meadow-652815cb09d9.mp3` | Focus | `focus.music` | ElevenLabs Sound Effects v2, Looping on | Seamless 30-second night meadow for deep focus; continuous small insects and faint grass breeze; no owls, frogs, voices, footsteps, music, sudden calls, or fades | 2026-08-10 / `YiqNkeyhoLwnZhsPugTR`, candidate 1 | 1,200 | 1 s equal-power seam; 29 s unit tiled 8x; two-pass loudness normalization; MP3 codec headroom | 232.032 s; -24.2 LUFS; -13.8 dBTP; seam audit pass | Boundary and signed-iPhone review pending |
| Remote Focus and Games catalog above | Focus / Games | `focus.music`, `game.music` | Music generation; exact model metadata not retained in listening-room export | Prompt/id not retained in export | 2026-07-30 / unavailable | Recorded in generation workspace | MP3 mastering pass | Focus -24 LUFS; Games -24 LUFS | Andrew listening-room approval; in-app device review pending |
