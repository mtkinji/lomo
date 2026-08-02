# Converge: Bank Roll Pacing

## Chosen alternative

Make the existing cooldown state-aware.

Before this change, every settled roll starts a visible three-second wait. After it, rolls one through three can flow back-to-back; the pause begins before roll four only when multiple unbanked players remain; and the last unbanked roller can continue immediately.

## Reductive decisions

- No setting, explanation, badge, or new control.
- No change to the dice-settle animation or three-second duration.
- No change to scoring, banking, player order, or probability.
- Derive the exception from `rollInRound` and existing `banked` flags.

## Activation

The behavior is discovered through play. The Roll button simply stays available when no useful pause exists.

## Bet

We're betting that the countdown earns its place only when multiple active players share a risky pot. If family play shows that even this pause drags, revisit the duration separately rather than adding preferences.

## Success signal

Opening safe rolls and last-player runs can be completed without countdown waits, while shared risky rolls still display `Roll in 3`, `Roll in 2`, and `Roll in 1`.
