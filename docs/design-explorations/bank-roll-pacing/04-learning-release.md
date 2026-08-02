# Learning Release: Bank Roll Pacing

## Concept To Build

Bank keeps the Roll button immediately available for the opening three safe rolls and for the final unbanked roller.

## Capability Delta

Today, the table must wait after every settled roll. After this release, it waits only once the three safe rolls are complete and multiple active rollers remain.

## Buildable Slice

- Reuse the current cooldown hook, button, countdown label, `rollInRound`, and `banked` state.
- Add one pure policy function that converts the timer's raw remaining time into the time the button should enforce and display.
- Cover opening-roll, shared-risk, and sole-roller states with focused tests.
- Exclude new settings, copy, analytics, and remote-protocol changes.

## Release And Proof

Validate first in the local checkout with focused Jest coverage and diff-aware repository verification. A later signed build or TestFlight session is required for physical interaction proof.
