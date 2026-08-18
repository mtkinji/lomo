---
feature: household
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves:
  - jtbd-move-the-few-things-that-matter
  - jtbd-put-intention-before-impulse
  - jtbd-carry-intentions-into-action
  - jtbd-invite-the-right-people-in
  - jtbd-trust-this-app-with-my-life
briefs:
  - household-foundation
  - shared-household-device-profiles
  - chores-as-recurring-activities
  - family-screen-time-controls
  - family-screen-time-simple-administration
  - household-member-photos
status: shipping
last_reviewed: 2026-08-18
---

# household

Gives Maya a private family boundary with explicit membership, child-by-child capability activation, capability-scoped caregiver authority, and an accepted caregiver-anchored Household Mode contract for a shared family iPad.

## Surfaces in this folder

- `HouseholdSettingsScreen.tsx` - parent-facing roster, dependent setup, accepted private member-photo detail entry point, child capability activation, shareable installed-app invitations, and explicit review-before-join; connected account avatars remain account-owned.
- `screenTime/` - child-specific family agreement, delivery-state learning, and child-facing explanation.
- `data/household.ts` - typed client boundary for server-authorized Household commands.
- `data/householdMigration.test.ts` - authorization and privacy contract for the canonical Household schema.

The accepted future Household Mode design keeps one assigned caregiver account beneath a restricted child-facing layer. One active-member control appears in the capability menu and attribution-sensitive capability headers; child member codes select the actor, while fresh Face ID, Touch ID, or device-passcode authentication restores the caregiver's full Kwilt. Chores is the first capability shaped around that shared-device participation model, but neither brief is marked shipped by this feature manifest.

## Notes

Household membership shares only roster and relationship metadata. Possessing an invitation grants nothing until a signed-in person reviews and accepts it. Every capability must opt into family participation explicitly; no personal capability content becomes shared through membership alone.

Family Screen Time owns caregiver and child policy meaning inside Household. Shared native enforcement and cross-domain conflict behavior follow [`docs/architecture/screen-time-control-plane.md`](../../../docs/architecture/screen-time-control-plane.md).
