# Frame: Focus seamless soundscapes

## What the user said

> Repair the six recently added Focus tracks so their loops are uninterrupted and unnoticeable, then add looping ambience such as rain, streams, and ocean waves.

## Restated in user voice

When Marcus settles into a Focus session, he wants the soundscape to continue without calling attention to its own ending, so the environment helps him stay with the work instead of interrupting it.

## Target audience and persona

`audience-burned-out-productivity-power-users`, represented by **Marcus**. He has already chosen what to work on and does not want another system to configure.

## Hero anchor and job-flow step

- Hero: `jtbd-move-the-few-things-that-matter`.
- Active: `jtbd-carry-intentions-into-action` and `jtbd-trust-this-app-with-my-life`.
- Job flow: `job-flow-marcus-move-the-few-things-that-matter`, step 5, “Decide what to do next,” currently scored 3. Focus is the existing transition from that decision into action.

## Friction

The six remote Focus music files are ordinary four-minute compositions rather than loop masters. Measured examples include Copacabana restarting roughly 66 dB louder than its final second and Midnight Study restarting roughly 55 dB louder. On iOS, Expo Audio 55.0.16 also implements a single-player loop by waiting for end-of-item, seeking to zero, and calling play again, so transport can contribute a smaller gap.

## System alignment

Constraint posture: `Fit the system`.

- Existing surface: one Soundscape field in the Focus setup drawer and one in-session soundscape menu.
- Existing model: a stable persisted `SoundscapeId` and a typed immutable remote audio catalog.
- Existing delivery: one bundled fallback; remote tracks stream immediately and cache opportunistically.
- Existing policy: `focus.music` targets -24 LUFS with a -2 dBTP ceiling.
- Existing UI authority: the Kwilt UI constitution, Canonical picker trigger grammar, Candidate small-set choice pattern, and the current Focus drawer.

Constraints to preserve:

- No download manager, mixer, playlist, favorites system, or automatic rotation.
- Audio remains optional and never blocks Focus.
- Stable ids and calm offline fallback remain intact.
- Source measurements, generated provenance, and physical-device listening remain distinct proof gates.

## Aspirational design challenge

How might we help Marcus enter a continuous, non-demanding Focus environment, while preserving one calm choice, immediate playback, and honest reliability?

## UI contract

- Job: choose one supportive environment before starting Focus.
- Three-second read: Minutes, Soundscape, Start.
- Primary action: Start.
- Primary information: current soundscape selection.
- Reveal later: grouped Music and Nature choices inside the existing picker.
- Scan order: duration -> soundscape -> Start.
- Must not add: audio-library navigation, multiple simultaneous layers, or setup education.
- Reuse map: existing `FocusSetupContent`, `DropdownMenu`, `BottomDrawer`, and `Button`.
- Required states: no audio, selected music, selected nature ambience, persisted selection, remote fallback, long option titles.

## Out of scope

Mixing music with ambience, user uploads, adaptive personalization, playlists, per-track downloads, and declaring signed-device or TestFlight proof from source tests.
