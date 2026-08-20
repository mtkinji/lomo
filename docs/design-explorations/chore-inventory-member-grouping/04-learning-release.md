# Learning Release: Chore Inventory Member Grouping

## Concept To Build

The caregiver Chores inventory opens grouped by **Member**, with a standard grouping control beside the existing filter.

## User Experience

On entering caregiver Chores, Maya sees the filter and grouping controls followed by Charlie, Olive, and Household sections. Each section contains the existing editable Chore-series rows. Opening the grouping control and choosing **None** returns one continuous list with assignee pills.

## Buildable Slice

Must be real:

- default local grouping state;
- immediate **Member** / **None** menu choices;
- deterministic member order and Household-last behavior;
- correct composition with the current filter;
- accessible labels, selected states, and focused component coverage.

Intentionally excluded: persistence, collapse state, analytics, additional grouping fields, and backend changes.

## Release Channel

Local build, inside the existing Kwilt-Labs-gated Chores slice.

## Brand-Goodwill Guardrails and reversibility

Use existing inventory controls, neutral section labels, and no comparison metrics. The change is local UI state and can be removed without data migration.

## Permanent Product Threshold

Promote only after the grouped caregiver scan proves clearer in real household use and survives production Household authorization work.
