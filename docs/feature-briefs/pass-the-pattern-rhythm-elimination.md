---
id: brief-pass-the-pattern-rhythm-elimination
title: Pass the Pattern rhythm elimination
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-help-us-enjoy-being-together
job_flow: job-flow-maya-start-playing-together
serves: [jtbd-help-us-enjoy-being-together, jtbd-trust-this-app-with-my-life]
related_briefs: [kwilt-2-games-maturity]
owner: andrew
last_updated: 2026-08-12
---

# Pass the Pattern rhythm elimination

## Context

Observed family play found three connected problems: a miss ends everybody's run, note audio feels delayed until release, and the notes lack a shared musical pulse despite equal source-file duration. The same round produced a stronger direction: play against changing genre beats until one player remains.

## Target audience

Aspirational family organizers want a spare moment to become play without accounts, rules setup, or score administration.

## Representative persona

Maya has gathered two to six people around one phone and needs the game to teach itself, respond instantly, and keep the table involved after a miss.

## Aspirational design challenge

How might we help Maya's group build and remember a song together until one player remains, while preserving immediate play, fair timing, and one-phone simplicity?

## Hero JTBD

`jtbd-help-us-enjoy-being-together` — the game exists to make shared time easier and more delightful, not to reward productivity.

## Job flow step

`job-flow-maya-start-playing-together`, step 7, "Play through a fair, responsive shared game," is 3/5. This release addresses directly observed responsiveness, fairness, continuation, and finish friction.

## JTBD framing

When a family has a few minutes together, help them build and remember a musical pattern that responds exactly when they touch it, so the whole table can stay in the game through eliminations and trust the result.

## Design

- Local play is last-player-standing. A wrong or off-beat note eliminates only the active player; survivors continue until one remains.
- Each elimination starts a new round, resets the short seed pattern, moves to the next survivor, and rotates among Funk, Jazz, Rock, and Blues grooves.
- Each groove has a fixed known tempo and a generous timing window. Notes always sound immediately; deterministic logic judges the recorded touch-down time separately.
- The six approved note sources remain exactly 504 ms. Preloaded pooled players remove the awaited rewind from the touch path and permit clean repeated notes.
- The current difficulty picker is removed. Genre rotation supplies variety without another table decision.
- The visible four-count pulse remains available when sound is off or Reduce Motion is enabled.
- Wrong notes do not trigger a second overlapping failure sound. The note, state change, and semantic haptic carry the result.
- This learning release changes only local play. Remote Pass the Pattern and its server reducer remain hidden and unchanged.

## Acceptance criteria

- A two-to-six-player game eliminates one active player after a wrong or out-of-window note, chooses the next surviving player, and finishes with exactly one winner.
- A successful repeat and added note pass the grown pattern to the next survivor without ending the round.
- The groove changes and the seed pattern resets after elimination, not after a successful turn.
- Direct touch starts its note before release; rule evaluation uses the touch-down timestamp.
- Every pattern note is 504 ms, preloaded, gain-policy compliant, and reusable without awaiting a rewind before playback.
- The play surface names the active player, groove, pulse, progress, remaining players, elimination, and winner without scores or accuracy percentages.
- Sound-off play retains a visible beat reference.
- Focused rules, hook/component tests, audio audit, changed-file verification, and Simulator proof pass. Physical-speaker timing and family table play remain explicit promotion gates.

## Spec refinement

The genre names describe procedural percussion patterns with fixed tempos, not licensed songs. The initial timing windows are intentionally generous and code-owned. No user setting is added until table evidence shows that tempo choice is necessary. Remote parity is a separate future spec because it requires synchronized clocks and an authoritative server migration.

## Success signal

Two complete signed-iPhone table rounds produce no disputed timing eliminations; taps feel immediate; the group recognizes that a miss removes one player rather than ending play; and they choose a rematch or ask for another groove.

## Open questions

- Do the procedural grooves and approved notes feel musically cohesive on the iPhone speaker?
- Is the timing window fair across ages and direct-touch styles?
