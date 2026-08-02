# Converge: Audio learning release

## Chosen alternative

One bundled Focus fallback plus remote streaming and opportunistic caching for every other continuous track. Short latency-sensitive effects remain bundled.

## Capability delta

Today, Andrew cannot hear the reviewed candidates inside actual Focus and Games moments, and adding them naively would materially increase the install.

After this release, Andrew can use the approved learning set in situ. Long music begins from a cached local file when possible or streams immediately while Kwilt caches it silently. The app keeps one offline Focus fallback and does not expose download management.

Still intentionally unsupported: guaranteed offline availability for every track, user-managed downloads, permanent approval based only on “Love it,” and regenerated victory/Bank effect families.

## Reductive decisions

- Enhance the existing Focus picker and Games audio ownership; add no audio-library screen.
- Keep the existing Games sound toggle; add no separate Music/Effects controls.
- Preserve saved ids when delivery moves from bundled to remote.
- Preserve a missing remote selection and temporarily fall back rather than silently rewriting preference.
- Bundle only interaction cues where sub-second latency matters.

## Activation

- Prefetch the saved Focus selection when the Focus surface becomes relevant.
- Prefetch game music during setup, before the first gameplay phase needs it.
- First play never waits for cache completion.
- The picker communicates temporary unavailability only after a real load failure; it does not advertise downloads.

## Accepted trade-offs

- An immediate first play may create a streaming request and a concurrent cache request.
- The operating system may purge cached music.
- Deep Work Drift is the only guaranteed offline track.

## Rejected trade-offs

- Growing the binary with every long track.
- Waiting for complete downloads.
- Silent failure or blocking play.
- Treating contextual candidates as final production assets.

## Bet

We're betting that remote-first playback with silent caching will feel indistinguishable from bundled playback in normal connected use, while contextual testing will reveal which candidates deserve refinement. If startup or reliability is perceptibly worse, we will prefetch earlier or selectively bundle one additional high-use track rather than add download management.

## Success signal

Andrew can enter Focus and complete representative game rounds without waiting for audio, adjusting volume between candidates, or noticing playback cleanup errors; a second session uses cached files; an offline uncached Focus selection falls back calmly.
