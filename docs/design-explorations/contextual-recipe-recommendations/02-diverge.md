# Diverge: Contextual Recipe Recommendations

Axis: hard eligibility versus opaque scoring versus deterministic composition.

## A. Cut off breakfast only

After 9:00, remove breakfast and preserve the current order. This is very small
and fixes the most visible failure, but lunch and dinner remain dependent on
catalog order and dinner is not intentionally overweighted.

## B. Continuous weighted score

Give every recipe points for meal period, favorites, featured status, and speed.
This can express nuance, but the constants are harder to reason about and small
changes can make the list unexpectedly unstable or difficult to explain.

## C. Contextual slots

Build the familiar/liked/quick candidate pool, then fill explicit meal-period
slots. Before 9:00, breakfast can occupy the next-meal slot. From 9:00 onward,
breakfast is ineligible and slots repeat dinner, dinner, lunch. Existing signals
order recipes inside each bucket, with neutral/personal recipes as fallbacks.

This fits the current selector, makes the dinner weighting inspectable, and
does not add UI or user-maintained state. It passes the calm-UX and anti-pattern
checks: no dashboard, setup, forced commitment, or anthropomorphic AI.
