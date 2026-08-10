---
id: brief-completion-celebration-audio
title: Completion and streak celebration audio
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-move-the-few-things-that-matter, jtbd-trust-this-app-with-my-life]
related_briefs: []
owner: andrew
last_updated: 2026-08-10
---

# Completion and streak celebration audio

## Context

Kwilt already plays small sounds for completed steps and Activities and shows richer visual celebrations for daily streaks, repairs, and finishing the scheduled day. Those independent paths can overlap. A fixed reward such as every third completed to-do would also turn ordinary progress into an arbitrary counter.

## Target audience

Aspirational family organizers want ordinary follow-through to feel good without turning family life into a productivity game or requiring another preference system to maintain.

## Representative persona

Maya is completing real household and personal commitments. She benefits from a brief moment of acknowledgment when the result is meaningful, but repeated or stacked cues would make Kwilt feel noisy and fussy.

## Aspirational design challenge

How might we help Maya feel that meaningful follow-through counted, while keeping ordinary completion calm and refusing arbitrary task-count rewards?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — the sound should reinforce real movement on commitments, not reward list manipulation.

## Job flow step

In `job-flow-maya-move-family-life-forward`, “Keep using the system because it feels helpful, not fussy” is currently rated 3/5. This enhancement makes completion warmer while preserving a restrained interaction rhythm.

## JTBD framing

When I complete something that meaningfully moves my day, briefly acknowledge it so the progress feels real without asking me to chase points or manage another system. The behavior also serves `jtbd-trust-this-app-with-my-life` by preventing noisy, overlapping, or manipulative celebration feedback.

## Design

- Keep the existing step and Activity completion sounds for ordinary actions.
- On the first qualifying action of a later streak day, replace the base completion sound with the already-bundled Tiny Crowd 1 cue at a restrained gain.
- Use the same Tiny Crowd cue at its approved signature gain for special streak milestones, repaired streaks, and completing all scheduled Activities when at least three were planned.
- Grace protection and repair opportunities retain the ordinary completion sound; they do not receive applause.
- Resolve all outcomes from one action through a single priority policy. `all scheduled done`, special streak milestones, and repaired streaks outrank an ordinary streak continuation, which outranks the base completion sound.
- Do not add a new audio asset, a separate Activities-owned cue, or an every-third-to-do counter.
- Keep visual, textual, and haptic feedback authoritative when audio is unavailable.

## Success signal

On a physical iPhone, a qualifying action produces one coherent sound with no overlap: ordinary completions remain subtle, streak continuation feels warmer, and genuinely meaningful moments receive the richer cue. The reused asset does not increase the application’s audio inventory.

## Spec refinement

- Sound selection is pure logic with direct tests.
- The all-done visual celebration uses the same stable local-date identifier at its caller and store boundary.
- Completion entry points pass their base sound into the shared streak celebration wrapper instead of playing independently.
- Final acceptance requires physical-device listening for perceived gain, silent-mode behavior, Bluetooth routing, and interaction with Focus soundscapes.

## Open questions

- Whether the restrained Tiny Crowd gain is right on an iPhone speaker remains a device-listening decision rather than an automated-test claim.
