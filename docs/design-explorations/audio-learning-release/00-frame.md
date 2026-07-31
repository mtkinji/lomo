# Frame: Audio learning release

## What the user said

> First implement the approved sounds in the app so they can be tested in situ, then improve the weak sounds. Keep long tracks out of the initial app download where possible, but make playback feel immediate rather than asking the user to manage downloads.

## Restated in user voice

When a family starts a game or someone enters Focus, they want the sound to make the moment feel alive immediately, so they can judge and enjoy the experience without setup, waiting, startling volume changes, or an unnecessarily large app download.

## Target audience

`audience-aspirational-family-organizers` — people who want ordinary family life and shared play to feel easier without becoming administrators of another system.

## Representative persona

**Maya** is opening Kwilt with her family during a small window for play, or using Focus while ordinary family life continues around her.

- Current situation: Kwilt already has playable Games and bundled Focus music, while a reviewed candidate library exists outside the app.
- What she's trying to do: begin the moment immediately and let the audio support it without configuration.
- Emotional state or tension: willing to enjoy the added character, but quick to notice delay, noise, childishness, or an effect that does not match the moment.
- What would make this feel wrong: a download button, waiting screen, broken offline game, surprise cellular burden, loudness jumps, or a large install caused by optional music.

## Hero anchor

`jtbd-help-us-enjoy-being-together` — audio should make shared play more memorable and legible, not create setup before the family can begin.

## Job flow step

`job-flow-maya-start-playing-together`, primarily steps 7–8: play through a responsive shared game, then celebrate and decide whether to play again.

The flow's current recorded score is stale relative to the integrated Games capability, but its product gap remains useful: Kwilt must make play feel responsive and celebration feel earned. This learning release improves the quality of the playable moment; it does not change joining, seating, or game rules.

## Active anchors

- `jtbd-help-us-enjoy-being-together` — atmosphere, feedback, suspense, and celebration should deepen the shared moment.
- `jtbd-move-the-few-things-that-matter` — Focus music should help sustained attention without turning work into a reward economy.
- `jtbd-trust-this-app-with-my-life` — playback must be non-blocking, volume-balanced, explicit about availability, and resilient when the network is absent.

## Friction we're addressing

Approved candidates cannot yet be judged inside their real game and Focus moments. Bundling every approved long track would add about **22.1 MB** to the binary, while a remote-only design could introduce delay or brittle offline behavior. The current candidate labels also contain “Love it” votes that are not sufficient by themselves to approve cues whose qualitative review still asks for regeneration.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: Focus already has a soundscape picker; Games already owns pattern feedback, player outcome signatures, and a single sound toggle.
- Existing user flow: sound begins as part of Focus or gameplay; there is no separate audio-library management flow.
- Existing domain/data model: Focus persists a `SoundscapeId`; player profiles persist success and setback ids; Pass Pattern resolves six beat ids plus success/miss outcomes.
- Existing technical affordances: `expo-audio` 1.1.1 accepts local files or remote HTTP sources and can download a complete remote source before playback; `expo-file-system` is installed for explicit cache management. The existing Focus service still uses deprecated `expo-av`, supports background playback, and currently accepts bundled `require(...)` sources only.
- Existing UX/copy conventions: audio is optional, best-effort, and never gates Focus, a game action, or replay.
- Existing bundled payload: four Focus soundscapes occupy about **23.94 MiB**. Keeping only the default offline fallback would remove about **16.53 MiB** from the binary. The three approved new four-minute tracks occupy about **16.48 MiB**; the four approved one-minute game candidates occupy about **5.50 MiB**; one temporary Bank mix per tier adds about **4.1 MiB**; the proposed short Pattern and Cartoon Splat files occupy about **0.13 MiB**.

Constraints to preserve:

- Playback starts without a user-visible download step.
- Audio failure never blocks Focus or play.
- One bundled Focus track remains an offline fallback.
- Cached tracks remain usable offline when present; uncached remote tracks may be unavailable or fall back gracefully.
- Stable ids survive catalog and source changes.
- Every shipped cue uses the category loudness policy and is tested at fixed device volume.
- The existing To-do sounds remain unchanged.

Constraints we may challenge:

- “Every Focus soundscape is bundled” becomes “one fallback is bundled; all other continuous Focus and game music is remotely delivered and opportunistically cached.”
- Focus playback may migrate from `expo-av` to `expo-audio` if background/lock-screen behavior can be preserved and separately proven on a signed device.

Design implication:

Use a typed catalog that separates identity from delivery source. Bundle short latency-sensitive effects. Give long tracks immutable public CDN URLs and a deterministic cache filename. If a cached file exists, play it; otherwise begin remote playback immediately and cache it silently. Start prefetch at naturally early moments—the saved Focus selection when its surface opens, and game music during setup—without waiting for the transfer. Keep one bundled Focus fallback and never present a “Download” action.

The stock Expo APIs do not expose one network stream that can simultaneously feed playback and a persistent application file. On an immediate first play, remote playback plus explicit caching may perform two HTTP requests. This is an accepted learning-release trade-off; prefetch timing should reduce how often both transfers run concurrently, and telemetry should measure bytes/failures without recording listening content.

## Aspirational design challenge

How might we help Maya feel that Kwilt's audio was already waiting for the family, while preserving immediate play, calm volume, offline grace, and a small initial install?

## Initial approved learning set

“Approved” here means safe to integrate for contextual evaluation, not permanently accepted.

### Bundle in the app

- One technically selected `Love it` variant for each Pass Pattern note: Coral, Gold, Pine, Rose, Sky, and Violet.
- Pattern Miss 1.
- Cartoon Splat 1 as an additional player setback choice.
- Keep the current Pattern success cue until a stronger generated success candidate is approved.

The final Pattern variant among multiple `Love it` votes should be selected by attack/tail consistency, frequency separation, and cross-note loudness—not arbitrary candidate number.

### Deliver remotely and cache

- Open Road Focus 1.
- Cedar Workshop 2.
- Rainlit Library 2.
- The existing Copacabana Focus, Focus Tunnel, and Midnight Study Session tracks, preserving their ids and picker labels while changing their delivery source.
- One Story Relay candidate for the first in-app comparison; both 1 and 2 are approved for contextual evaluation, so technical loop quality and spoken-instruction masking decide the initial default.
- Clue Circle 2.
- Slanguage 1.
- The current three Bank full mixes as an explicitly temporary transition prototype, using the reviewed perceived-intensity mapping. These validate whether music helps Bank before the score is rebuilt as phase-locked vertical layers.

### Defer to enhancement generation

- Player win cues that received `Love it` ratings but are still too short to carry a victory.
- Tiny Crowd and Banjo Victory until they have complete celebratory arcs.
- Wolf Howl, Magic Portal, Air Leak, Bank lock-in, Bank doubles, and Bank seven-release candidates.
- Doodle Bridge and Object Quest music until a more distinctive game-specific sound world is selected.
- To-do step and whole-list completion replacements.

## Out of scope

- A user-facing download manager, storage meter, audio marketplace, or second audio-settings hierarchy.
- Treating first-pass preference votes as permanent production acceptance.
- Completing the second-generation enhancement batch before contextual evidence from this release.
- Claiming reliable offline access for files stored in the operating system's purgeable cache.

## Delivery decision

Move the three existing non-default bundled Focus tracks into the same remote/cache catalog in the learning build. Keep **Deep Work Drift** bundled as the always-available fallback. This makes the delivery rule coherent and should reduce the binary by about **16.53 MiB** rather than merely avoiding further growth.

All continuous game music also uses remote/cache delivery. Existing short dice, feedback, Pattern, and player-signature effects remain bundled because immediate low-latency triggering matters more than their small file footprint.

If a previously selected remote Focus track is not cached and the network is unavailable, preserve the selection but play Deep Work Drift for that session with a quiet availability explanation in the picker. Do not silently rewrite the user's saved choice.

## Anchor assessment

### Restated in user voice

When I begin Focus or a family game, I want its sound to start naturally and fit the moment, so the app feels more alive without making me wait, manage files, or adjust the volume.

### Matches

- `jtbd-help-us-enjoy-being-together` — the primary value is richer, more memorable shared play.
- `jtbd-move-the-few-things-that-matter` — Focus soundscapes support attention while remaining optional and calm.
- `jtbd-trust-this-app-with-my-life` — honest availability, resilient fallback, controlled storage, and non-startling levels make the system dependable.

### serves snippet

```yaml
serves: [jtbd-help-us-enjoy-being-together, jtbd-move-the-few-things-that-matter, jtbd-trust-this-app-with-my-life]
```
