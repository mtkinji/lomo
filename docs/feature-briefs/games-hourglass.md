---
id: brief-games-hourglass
title: Games Hourglass
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-help-us-enjoy-being-together
job_flow: job-flow-maya-start-playing-together
serves: [jtbd-help-us-enjoy-being-together, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-kwilt-games-capability-integration]
owner: andrew
last_updated: 2026-08-02
---

# Games Hourglass

## Context
A physical table game can depend on a one-minute hourglass that is easy to lose or leave behind. Kwilt Games already replaces missing dice but cannot replace this equally common game piece.

## Target audience
Aspirational family organizers want a small opening for play to remain easy rather than becoming another setup task.

## Representative persona
Maya is already playing with family or friends when the rules call for a 60-second hourglass nobody has.

## Aspirational design challenge
How might we help Maya replace a missing 60-second game piece instantly, while preserving the playful momentum and tactile character of the table?

## Hero JTBD
`jtbd-help-us-enjoy-being-together` — Hourglass protects an active shared-play moment from avoidable setup friction.

## Job flow step
`job-flow-maya-start-playing-together`, steps 6–7. Games offers a complete playable catalog and Basic Dice Roller, but lacks a one-minute table timer utility.

## JTBD framing
When the game in front of us needs a one-minute timer, let us flip a beautiful, trustworthy replacement immediately so everyone stays in the moment.

## Design
- Add **Hourglass** beneath Games → Utilities, beside Basic Dice Roller.
- Open directly to a fixed 60-second full-screen timer in the last-used **Physical**, **Classic**, or **Simple** style.
- Make turning the phone end-over-end the hero action in Physical, while retaining a clear touch fallback in every style.
- Derive remaining time from an absolute deadline and reconcile after lifecycle interruption.
- Animate flowing sand while preserving a clear numeric remaining-time label and reduced-motion behavior.
- Offer optional session music, off by default, using the existing Games audio policy and a temporary existing music bed.
- Use Games completion sound/haptic policy at zero.
- Allow a small reset while running and **Flip again** after completion.
- Keep the screen awake while the timer is active when the platform runtime supports it.
- Remember only the selected visual style; do not add custom durations, pause, players, scores, history, remote sync, notifications, or onboarding.

## Acceptance criteria
- Hourglass is visible in the Games Utilities section and opens through the Games native stack.
- Classic and Simple start exactly 60 seconds with one press and no setup.
- Physical arms after the phone is held steadily at either end and starts after a stable turn to the opposite end; sensor unavailability leaves the touch fallback fully usable.
- Physical sand follows the phone's end direction, and the next completed turn can start by turning the phone back the other way.
- Physical, Classic, and Simple share the same authoritative timer and completion behavior; the selected style is remembered locally.
- The displayed seconds and sand state are derived from an absolute deadline, including after app resume.
- Zero produces a single completion haptic/audio cue and the finished state.
- Music is off by default, can be toggled for the current session, and stops when the timer stops or the screen closes.
- Reset returns to a clean ready state; Flip again starts a new full minute.
- The surface is accessible by label and state and remains understandable with reduced motion.
- Timer logic, shelf/navigation contracts, related component behavior, typechecks, product lint, architecture lint, and diff-aware verification pass.

## Spec refinement
The release remains deliberately fixed at one minute because that is the observed game-piece need. The three styles vary presentation and physicality, not timer semantics. It reuses an existing Games music bed temporarily rather than inventing an undeployed asset. Dedicated music and duration choice require later evidence and are not hidden implementation assumptions. Physical motion must be proven on a signed device; Simulator interaction can prove only the fallback and visual states.

## Success signal
Andrew can reach Hourglass and start a trustworthy timed turn in two taps from the Games shelf, without instructions or configuration.

## Open questions
None for the learning release.
