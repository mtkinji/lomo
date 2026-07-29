---
feature: household
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves:
  - jtbd-invite-the-right-people-in
  - jtbd-trust-this-app-with-my-life
briefs:
  - household-foundation
status: shipping
last_reviewed: 2026-07-28
---

# household

Gives Maya a private family boundary with explicit membership, child-by-child capability activation, and capability-scoped caregiver authority.

## Surfaces in this folder

- `HouseholdSettingsScreen.tsx` - parent-facing roster, dependent setup, child capability activation, and caregiver invitations.
- `data/household.ts` - typed client boundary for server-authorized Household commands.
- `data/householdMigration.test.ts` - authorization and privacy contract for the canonical Household schema.

## Notes

Household membership shares only roster and relationship metadata. Every capability must opt into family participation explicitly; no personal capability content becomes shared through membership alone.
