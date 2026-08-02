# Learning Release: Audio in context

## Concept To Build

Kwilt plays the approved audio learning set inside real Focus and Games moments, with long music streamed and silently cached while short effects remain bundled.

## Capability Delta

Today, the user cannot:

- Evaluate reviewed audio inside the product moments it is intended to support.
- Add long candidates without increasing the native asset payload.

After this release, the user can:

- Select approved Focus tracks from the existing picker and hear them immediately.
- Hear approved Pattern notes, a new Cartoon Splat setback choice, and approved learning music during supported games.
- Reuse cached continuous tracks without another network dependency when the cache remains present.

Still intentionally not supported:

- Explicit offline downloads or storage management.
- New To-do sounds.
- Regenerated win signatures, Bank effects, or final vertical Bank stems.

## User Experience

The existing Focus and Games surfaces remain the entry. Selecting or starting a track produces no download prompt. Cached audio plays locally. Uncached audio streams while caching begins. If an uncached Focus track cannot load, Deep Work Drift plays and the picker quietly explains that the selected track needs a connection; the saved preference remains unchanged.

## Existing Product Relationship

This enhances the Focus soundscape picker, Pass Pattern feedback, player setback picker, and supported game phases. It leaves navigation, game rules, player setup, To-do completion, and the existing sound toggles unchanged.

## Buildable Slice

Must be real:

- Public immutable audio objects with long-lived cache headers.
- Typed delivery catalog with byte sizes and stable cache filenames.
- Tested local/cache/remote/fallback resolution and concurrent-download deduplication.
- Remote-capable Focus playback preserving fade, loop, background intent, and cleanup.
- Distinct approved Pass Pattern sources and Cartoon Splat profile persistence.
- One Story Relay default, Clue Circle 2, Slanguage 1, and the temporary Bank full-mix mapping.
- Audio audit and bundle-payload report.

Can be thin or temporary:

- Bank uses full-mix transitions only to learn whether tension music helps.
- Story Relay chooses one technically stronger approved variant as the initial default.
- Availability copy can be one quiet inline status rather than a new state system.

Intentionally excluded:

- Doodle Bridge and Object Quest music.
- New victory signatures and rejected Bank mechanics.
- Download progress, storage controls, analytics dashboards, or user-facing beta labels.

## Release Channel

Local/signed-device learning build first, then TestFlight after source tests and device audio-route checks. Do not claim production behavior from Simulator playback.

## Brand-Goodwill Guardrails

- Sound never blocks an action.
- No volume jumps beyond the existing category policy.
- No broken-looking downloads or persistent warning furniture.
- Offline fallback is calm and honest.

## Reversibility

Every remote item lives behind the catalog. A candidate can be removed or redirected without changing saved ids. Game-music hooks can be removed without game-state migration. The public bucket contains versioned immutable files and no user data.

## Permanent Product Threshold

At least one real family session and repeated Focus use show that the music improves the moment, starts reliably, cleans up correctly, and remains balanced. Only then promote candidates from learning status and begin the refinement batch.
