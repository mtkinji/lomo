---
feature: household
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves:
  - jtbd-put-intention-before-impulse
  - jtbd-carry-intentions-into-action
  - jtbd-invite-the-right-people-in
  - jtbd-trust-this-app-with-my-life
briefs:
  - household-foundation
  - family-screen-time-controls
  - family-screen-time-simple-administration
status: shipping
last_reviewed: 2026-07-30
---

# household

Gives Maya a private family boundary with explicit membership, child-by-child capability activation, and capability-scoped caregiver authority.

## Surfaces in this folder

- `HouseholdSettingsScreen.tsx` - parent-facing roster, dependent setup, child capability activation, shareable installed-app invitations, and explicit review-before-join.
- `screenTime/` - child-specific family agreement, delivery-state learning, and child-facing explanation.
- `data/household.ts` - typed client boundary for server-authorized Household commands.
- `data/householdMigration.test.ts` - authorization and privacy contract for the canonical Household schema.

## Notes

Household membership shares only roster and relationship metadata. Possessing an invitation grants nothing until a signed-in person reviews and accepts it. Every capability must opt into family participation explicitly; no personal capability content becomes shared through membership alone.

Family Screen Time owns caregiver and child policy meaning inside Household. Shared native enforcement and cross-domain conflict behavior follow [`docs/architecture/screen-time-control-plane.md`](../../../docs/architecture/screen-time-control-plane.md).
