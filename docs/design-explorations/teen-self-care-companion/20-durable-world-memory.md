# Pet Engine Study 16 — Durable World Memory

## Why this is the next layer

Study 15 proved that a completed To-do can become a living habitat consequence instead of a point or payment. But a meadow that forgets its blooms whenever the capability reloads breaks the emotional promise. A return should feel like coming back to the same tiny place, not opening a fresh animation demo.

Study 16 tests one rule: **the world remembers what matters and releases what does not.**

## Durable boundary

The browser stores one versioned, bounded world-memory record containing only:

- at most three bloom identifiers;
- each bloom's clamped world coordinate;
- anonymous `todo` provenance;
- a completed growth state.

It deliberately does not store task titles, Focus details, people, timestamps, streaks, scores, Pet position, camera position, zoom, weather, visitors, unfinished behaviors, or animation progress.

## Return behavior

When the capability opens again:

1. Moss returns idle at the neutral world center.
2. The camera and zoom return to the full calm composition.
3. Weather begins in settled sunshine.
4. No visitor or unfinished interaction resumes.
5. Remembered blooms are already open in their world positions.

This makes the habitat feel continuous without turning a transient simulation snapshot into an awkward frozen save state.

## Failure recovery

Malformed JSON is removed at the browser boundary. Unknown versions restore an empty meadow. Individual invalid bloom records are ignored, coordinates are clamped, duplicate identifiers are rejected, and extra/private properties never enter the runtime record.

## Prototype reset

The inspector's reset control now resets the whole prototype—care progress and world memory together—so a tester can replay the experience honestly.

## Evidence

- Pure tests prove the versioned schema, privacy boundary, maximum bloom count, sanitization, and calm restoration semantics.
- Browser QA proves plant → reload → remembered bloom at the 390px capability width.
- Browser QA proves reset → reload returns Day 1, zero care moments, and a quiet meadow.

## Boundary before Kwilt integration

This is browser-local prototype persistence only. Production Kwilt still needs a capability-owned durable record, authenticated sync semantics, migration rules, and explicit account deletion behavior before Pet memory can ship in the app.
