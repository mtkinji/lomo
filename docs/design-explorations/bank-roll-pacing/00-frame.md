# Frame: Bank Roll Pacing

## What the user said

> I shouldn't have to wait three seconds during the first three safe rolls. If I am the only user left and I'm still rolling, I should be able to roll as much and as often as I want.

## Restated in user voice

When our Bank round has no meaningful roll decision yet, or everyone else has already banked, I want the table to keep moving at my pace so that the game stays lively instead of making us wait on ceremony.

## Target audience and persona

`audience-aspirational-family-organizers`, represented by Maya, turning a small opening into easy family play before coordination or dead time makes the moment disappear.

## Hero anchor and job-flow step

`jtbd-help-us-enjoy-being-together`; step 7 of `job-flow-maya-start-playing-together`: play through a fair, responsive shared game.

## Active anchors

- `jtbd-help-us-enjoy-being-together` — pacing should support the shared game rather than interrupt it.
- `jtbd-trust-this-app-with-my-life` — the delay must follow a legible rule, not appear inconsistently.

## System alignment

Constraint posture: `Fit the system`.

- Existing surface: Bank's current Roll button and countdown label.
- Existing model: `rollInRound` identifies the three safe rolls; `player.banked` identifies who remains active.
- Existing affordance: `useRollCooldown` owns the three-second timer.
- Preserve: the cooldown once risk is shared by multiple active players, dice-settle animation, game rules, randomness, and banking behavior.

## Aspirational design challenge

How might we let Maya's table move immediately when waiting adds no useful social beat, while preserving the shared pause once multiple players face risk?

## Out of scope

Changing Bank scoring, safe-roll rules, dice animation duration, remote command pacing, or the cooldown's three-second duration.
