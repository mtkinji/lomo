---
id: brief-kwilt-2-games-maturity
title: Kwilt 2.0 Games Maturity
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-help-us-enjoy-being-together
job_flow: job-flow-maya-start-playing-together
serves: [jtbd-help-us-enjoy-being-together, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-kwilt-games-capability-integration]
owner: andrew
last_updated: 2026-08-04
---

# Kwilt 2.0 Games Maturity

## Context

The integrated Games capability has broad source parity, but breadth and test coverage do not establish that every table is fun enough for Kwilt 2.0. This brief turns release confidence into an explicit product contract.

## Target audience

Aspirational family organizers want easy shared play, not a catalog they must research or administer.

## Representative persona

Maya has a small opening with family or friends. The opening will disappear if choosing, naming players, or learning the next action takes too long.

## Aspirational design challenge

How might we help Maya choose and begin a game the room wants to replay, while preserving instant guest play and being honest about which tables have earned 2.0 billing?

## Hero JTBD

`jtbd-help-us-enjoy-being-together` — Games succeeds when people feel they spent time together, not when a screen was opened.

## Job flow step

Improve `job-flow-maya-start-playing-together` steps 3–8. Current source proves that the unified catalog and local loops exist, but the documented 1/5 scores are stale and must not be raised until runtime and human playtest evidence exists.

## JTBD framing

When a group has a small opening, help them choose, start, understand, finish, and replay a shared game in seconds. Keep the release promise narrower than the implementation inventory whenever confidence differs.

## Design

- Add typed duration, energy, and release-status metadata to the catalog.
- Production shows only release-ready games; development can show playtest candidates in a separate Workshop.
- Feature one fast path into Oddball, with a lightweight saved-player setup because names now carry scores and the public Oddball marker.
- Let local games start with blank default seats and convert them to neutral Player names at launch.
- Keep remote host identity explicit and preserve all existing game routes/domains.
- Treat Common Thread and Object Quest as playtest candidates until their payoff and replay evidence clear the permanent threshold.
- Keep Slanguage under its existing learning-release gate.
- Rework Show of Hands into **Oddball**: everyone secretly predicts the room, the single largest group scores one point each, and the only player on a unique answer receives the public Oddball marker and cannot win while holding it.
- Keep Oddball local/cast-first in this learning release. A 15-second choice clock and shared reveal keep the room moving; the host records the largest group and, when present, the sole unique player. Remote synchronized voting remains a later extension.
- End Oddball when one unmarked player has at least eight points and leads every other unmarked player. The marker transfers only when a later round produces exactly one unique answer; tied largest groups score nothing.
- Rework Clue Circle into 60-second finder turns: use one terse gesture handoff, dip forward for correct, tilt backward to pass, and advance immediately after either result.
- Keep Clue Circle cooperative: show each finder’s result, then celebrate one circle total after everyone has played.
- Retain touch fallbacks, provide immediate haptic/audio feedback, and expand the original family-safe target pool for rapid play.
- Do not add custom decks, team setup, video recording, public scores, or remote parity in this learning slice.

## Acceptance criteria

- Production catalog filtering is deterministic and tested.
- Development keeps withheld tables reachable with candid labeling.
- Every production game card communicates duration and energy.
- Oddball opens from the featured shelf action, seats 3–8 named or neutral players through the canonical setup, and then keeps the shared board public and distance-readable.
- Local setup can start with unnamed seats; remote-only setup still requires a named host.
- No game code or saved-player data is deleted.
- Product lint, focused Games tests, typechecks, and diff-aware verification pass.
- Manual Simulator/device play and family playtest evidence remain explicit release gates.
- Clue Circle's pure turn logic is tested for correct/pass scoring, timeout completion, finder rotation, and final aggregation.
- Clue Circle visibly counts down, advances on both correct and pass, keeps active play to clue plus timer, and reaches a replayable circle result.
- Physical-device proof remains required for gesture direction, accidental repeat suppression, feedback timing, and actual table energy.

## Spec refinement

"Fun" cannot be certified in code. The implementation therefore improves known friction and encodes a reversible evidence boundary. Release-ready is a product curation status, not a claim that this branch performed human validation. Common Thread and Object Quest are the two source-audited candidates withheld in this slice; promotion is a one-line metadata change after the evaluation rule is met. Oddball's incentive model is simulation-backed but still requires human play: the first table sessions must establish whether the marker feels funny rather than shaming, whether host result entry is fast enough, and whether the room asks to play again. Clue Circle's rapid-loop redesign is a TestFlight learning release until a physical-phone table session proves both motion reliability and voluntary replay.

## Success signal

A first-time group reaches meaningful play in under 30 seconds, completes without coaching, and voluntarily asks for another round.

## Open questions

- Which two groups will supply the pre-2.0 table sessions?
