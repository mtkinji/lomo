# Learning Release: Meals End-to-End Continuity

## Concept To Build

One active meal cycle carries the user from choosing meals to a reviewed
grocery list, with one primary next move at each handoff.

## Buildable Slice

Must be real:

- Plan drawer continuation into Meal Planning.
- State-derived Meal Plan primary actions.
- Food-first empty state and optional family input.
- List-first Grocery hierarchy and readiness-gated Shop action.
- Device-local grocery checks with reconnect reconciliation, plus existing
  persistence, provenance, and compilation paths.

Can remain thin:

- Store price evidence and retailer integrations.
- Household choice proof with seeded or test accounts during local iteration.

Intentionally excluded:

- New navigation destinations, rigid dates, autonomous planning, and checkout.

## Release Channel

Local signed development build first, followed by TestFlight only after the full
two-account household path and grocery handoff are verified.

## Reversibility

The release primarily changes presentation and navigation through existing
authoritative records. Runtime verification exposed two narrow persistence
contract corrections: bundled catalog ingredient provenance must remain a
validated snapshot rather than masquerading as private Recipe UUID rows, and
historical finalized entries must not prevent replacement of draft candidates.
Both changes preserve existing rows and add no parallel plan or list state. The
offline queue is a bounded transport for item-state mutations, not a second
grocery list: the server revision remains authoritative and acknowledged queue
entries are removed after reconciliation.
