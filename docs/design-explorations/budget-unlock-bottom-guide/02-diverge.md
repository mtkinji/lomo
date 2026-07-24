# Diverge: budget-unlock-bottom-guide

## Axis
Inline decision vs. bottom guide vs. sheet-first review.

## Alternative 1: Chart Companion Guide

The unlock choice becomes a compact bottom guide that appears when Budget Detail has an active unlock task. The page layout keeps the month selector followed by the chart. The guide sits over the lower canvas with title, one reason, `Keep blocked`, and `Open Amazon`. It is non-blocking and can be swiped down, but dismissing records `left_blocked` only when the user explicitly taps `Keep blocked`.

Audience/persona fit: high. Maya gets the budget reality and a calm choice without reading a warning card.

Design-challenge answer: strong. It preserves Budget Detail as the reality surface while making the choice feel guided.

System-fit note: medium-high. Requires a Money-local `BottomGuide` or an extension to `BottomDrawer` because current `BottomDrawer` is modal and too tall.

Best when: the active pause is route-triggered and the chart is the decision evidence.

Fails when: the guide covers important chart details or feels like an ad for a feature.

Anti-pattern check: pass. No productivity voice, streaks, rewards, or generic dashboarding.

## Alternative 2: Meter-Header Action Strip

Keep the decision inline, but move it into a one-line strip attached to the meter header: `Amazon paused - Shopping at 90%` with trailing `Open` and `Keep blocked`. The chart stays closer than the current item card, and no bottom overlay is needed.

Audience/persona fit: medium. It is efficient, but it still competes with meter text.

Design-challenge answer: partial. The action is calm, but the page still treats the pause as part of the meter module.

System-fit note: high. Reuses current implementation shape with minimal movement.

Best when: avoiding overlay behavior is more important than achieving the Kwilt guide grammar.

Fails when: the first viewport still feels like several financial/status rows before the chart.

Anti-pattern check: pass, but it risks becoming a dense operations UI.

## Alternative 3: Full Review Sheet

When a pause is active, Budget Detail opens a bottom drawer with a focused review task. The sheet contains the reason, key meter stats, and actions. The user closes it to inspect the page or taps an outcome.

Audience/persona fit: medium-low. It is explicit, but too modal for a moment that should remain calm.

Design-challenge answer: weak. It turns the unlock task into its own surface instead of preserving Budget Detail as the surface.

System-fit note: high technically because Money already has `BottomDrawer`; low product fit because the drawer is scrimmed and tall.

Best when: the budget page is too noisy to support the decision.

Fails when: the user wants to inspect the chart before deciding.

Anti-pattern check: fails if it blocks reading the page or makes the pause feel like a permission dialog.

## Alternative 4: Floating Action Pill

The page shows a small floating bottom pill: `Amazon paused` plus `Open`. Tapping the pill expands it into a guide with reason and `Keep blocked`.

Audience/persona fit: medium. It is visually light, but it hides the reason.

Design-challenge answer: partial. It keeps the page clear, but adds an extra tap before the choice is transparent.

System-fit note: medium. Requires a new expanded/collapsed state and careful safe-area behavior.

Best when: screen space is extremely constrained.

Fails when: the user cannot immediately answer why the app is paused.

Anti-pattern check: fails if it hides the reason behind a mysterious control.
