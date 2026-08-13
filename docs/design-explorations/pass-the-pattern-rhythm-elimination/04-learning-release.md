# Learning Release: Pass the Pattern rhythm elimination

## Concept To Build

A local-table Pass the Pattern where immediate notes build music over changing grooves and one player is eliminated each round until one remains.

## Capability Delta

Today, the user cannot:
- continue the same game after one player misses;
- rely on touch-down audio;
- play or be judged against a musical beat.

After this release, the user can:
- play through progressive eliminations to one winner;
- hear equal-duration notes immediately on touch-down;
- repeat and extend the pattern on a visible and audible genre groove;
- hear a different groove after each elimination.

Still intentionally not supported:
- remote play, custom songs, saved patterns, difficulty configuration, or accuracy statistics.

## User Experience

After seating players, the first groove begins and the phone asks for the first handoff. The active player watches the pattern, then taps it back one note per pulse and adds one. A wrong or late/early note ends only that player's run. The screen names who is out, shows who remains, changes groove, and hands the phone to the next survivor. The last survivor receives the finish state.

## Existing Product Relationship

This replaces only the local `PassPatternGame` rules and presentation. It reuses the canonical player setup, Connection Game frame, sound setting, note pad, approved pattern notes, and Games theme. The hidden remote game and server reducer stay unchanged.

## Buildable Slice

Must be real:
- deterministic survivor, round, winner, note-order, and beat-window logic;
- touch-down note playback with preloaded pooled voices;
- four deterministic local percussion grooves with known tempos;
- genre rotation, visible pulse, sound toggle, and accessible state copy;
- tests for logic and audio ordering.

Can be thin or temporary:
- procedural groove production and fixed rotation order;
- generous fixed timing windows by groove.

Intentionally excluded:
- remote parity, song persistence, user-authored beats, analytics, and adaptive tempo.

## Release Channel

Local build. The concept needs another observed family round before TestFlight or production promotion.

## Brand-Goodwill Guardrails

- Keep the learning release inside the existing local game; do not advertise remote rhythm play.
- Use neutral "out this game" language without failure scoring.
- If audio is off, preserve a visible pulse rather than making timing unknowable.

## Reversibility

The new local engine, groove hook, and assets are capability-owned and do not migrate data or alter the remote schema. They can be revised or removed without persisted-state cleanup.

## Permanent Product Threshold

At least two table-play rounds show immediate-feeling audio, fair timing, clear elimination/continuation, musical delight, and a finish that makes the group want a rematch.
