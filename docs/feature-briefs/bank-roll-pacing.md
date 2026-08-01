---
id: brief-bank-roll-pacing
title: State-aware Bank roll pacing
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-help-us-enjoy-being-together
job_flow: job-flow-maya-start-playing-together
serves: [jtbd-help-us-enjoy-being-together, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-kwilt-games-capability-integration]
owner: andrew
last_updated: 2026-07-31
---

# State-aware Bank Roll Pacing

## Context

Bank's three-second roll cooldown creates a useful shared beat once a pot is risky, but the same forced wait drags during the three guaranteed-safe rolls and after every other player has banked.

## Target audience

Aspirational family organizers want a few spare minutes to turn into play without setup or avoidable dead time.

## Representative persona

Maya has gathered family or friends around Bank and wants the table to stay lively while the rules remain obvious and fair.

## Aspirational design challenge

How might we let Maya's table move immediately when waiting adds no useful social beat, while preserving the shared pause once multiple players face risk?

## Hero JTBD

`jtbd-help-us-enjoy-being-together` — the pacing exists to support shared play, not to become friction of its own.

## Job flow step

This refines step 7 of `job-flow-maya-start-playing-together`, “Play through a fair, responsive shared game.” It improves responsiveness without changing the larger delivery score.

## JTBD framing

When a Bank roll carries no meaningful shared decision, players want the next roll to be ready immediately so the game keeps its social momentum. The exception remains deterministic and visible, supporting trust in the table's behavior.

## Design

- Do not enforce or display the cooldown while `rollInRound` is below 3, allowing the first three safe rolls without countdown waits.
- Do not enforce or display the cooldown when one or fewer players remain unbanked.
- Keep the existing three-second countdown after the third safe roll when at least two players remain unbanked.
- If the active-player count drops to one during a countdown, make Roll immediately available.
- Keep dice animation, game rules, randomness, banking, and remote commands unchanged.

## Success signal

Focused state-policy tests pass, and runtime play confirms the first three rolls and sole-roller sequence have no countdown while shared risky play retains it.

## Open questions

None for this slice.
