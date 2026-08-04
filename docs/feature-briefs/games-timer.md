---
id: brief-games-timer
title: Games Timer
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-help-us-enjoy-being-together
job_flow: job-flow-maya-start-playing-together
serves: [jtbd-help-us-enjoy-being-together, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-kwilt-games-capability-integration]
owner: andrew
last_updated: 2026-08-03
---

# Games Timer

## Context
A table game can call for a one-minute timer that is missing or inconvenient. The first replacement imitated an hourglass, but abstract SVG sand broke the physical promise. The utility should feel like a delightful timer in its own right.

## Target audience
Aspirational family organizers want a small opening for play to remain easy rather than becoming another setup task.

## Representative persona
Maya is already playing with family or friends when the rules call for a 60-second timer nobody has.

## Aspirational design challenge
How might we give Maya a trustworthy game timer that is quicker to set than the missing physical timer?

## Hero JTBD
`jtbd-help-us-enjoy-being-together` — Game Timer protects an active shared-play moment from avoidable setup friction.

## Job flow step
`job-flow-maya-start-playing-together`, steps 6–7. Games offers a complete playable catalog and Basic Dice Roller; Game Timer completes the common table-utility pair.

## Design
- Add **Game Timer** beneath Games → Utilities, beside Basic Dice Roller.
- Open directly to a one-minute default with visible 30-second, 1-minute, 2-minute, and 5-minute presets.
- Offer explicit 15-second decrease/increase controls for nearby values, bounded from 15 seconds through 10 minutes.
- Show all durations and countdowns in unambiguous `m:ss` form.
- Use one stationary progress ring with no perimeter numbers, pointer, or physical scale metaphor.
- Derive remaining time from an absolute deadline and reconcile after lifecycle interruption.
- Tick softly while running when Games sound is enabled; optional session music remains off by default.
- Warm the last ten seconds from turmeric toward coral and use the Games completion sound/haptic at zero.
- Allow only reset while running. Do not add pause, players, scores, history, remote sync, notifications, or onboarding.

## Acceptance criteria
- Game Timer is visible in Games Utilities and opens through the Games native stack at the canonical timer path; the prior local hourglass path resolves as a compatibility alias.
- The default is 1:00; presets set 0:30, 1:00, 2:00, or 5:00 in one press.
- Minus and plus adjust by 0:15, never below 0:15 or above 10:00.
- Start names the selected duration and begins it in one press.
- The displayed seconds and dial position derive from an absolute deadline, including after app resume.
- The last ten seconds are visually urgent without obscuring the number.
- Zero produces one completion haptic/audio cue and an unmistakable finished state.
- Music is off by default, can be toggled for the current session, and stops when the timer stops or the screen closes.
- The screen remains accessible and usable when audio, haptics, or visual motion are unavailable.
- Timer logic, shelf/navigation contracts, typechecks, product lint, architecture lint, and diff-aware verification pass.

## Success signal
Andrew can reach Game Timer, choose the needed duration without decoding a dial, and trust the countdown without seeing a fake physical scale.
