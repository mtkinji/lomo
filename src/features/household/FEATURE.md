---
feature: household
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
job_flows:
  - job-flow-maya-move-family-life-forward
  - job-flow-maya-establish-family-screen-time
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
last_reviewed: 2026-09-03
---

# household

Gives Maya a private family boundary with explicit membership, child-by-child capability activation, capability-scoped caregiver authority, and an accepted caregiver-anchored Household Mode contract for a shared family iPad.

## Surfaces in this folder

- `HouseholdSettingsScreen.tsx` - parent-facing roster, dependent setup, accepted private member-photo detail entry point, child capability activation, shareable installed-app invitations, and explicit review-before-join; connected account avatars remain account-owned.
- `HouseholdMemberDetailScreen.tsx` - role-bounded member administration plus a
  private contextual-help entry for any signed-in member viewing someone else.
- `HouseholdDeviceSetupScreen.tsx` - caregiver pairing receipt for one exact child's personal device, including native sharing, short-code fallback, automatic server-receipt confirmation, and truthful separation from Apple authorization.
- `HouseholdDevicesScreen.tsx` - caregiver-owned designation and member access for shared Household devices.
- `screenTime/` - child-specific family agreement, delivery-state learning, and child-facing explanation.
- `data/household.ts` - typed client boundary for server-authorized Household commands.
- `data/householdActionBoundary.ts` - Supabase-backed adapter for the canonical Household action handlers shared by native UI and authorized Chat evidence reads.
- `data/householdMigration.test.ts` - authorization and privacy contract for the canonical Household schema.

The accepted future Household Mode design keeps one assigned caregiver account beneath a restricted child-facing layer. One active-member control appears in the capability menu and attribution-sensitive capability headers; child member codes select the actor, while fresh Face ID, Touch ID, or device-passcode authentication restores the caregiver's full Kwilt. Chores is the first capability shaped around that shared-device participation model, but neither brief is marked shipped by this feature manifest.

## Notes

Household membership shares only roster and relationship metadata. Possessing an invitation grants nothing until a signed-in person reviews and accepts it. Every capability must opt into family participation explicitly; no personal capability content becomes shared through membership alone.

Core Household membership, invitation, activation, and caregiver-grant changes pass through `src/capabilities/relationships/actions/relationshipActions.ts`. Chat tool contracts describe those same actions but remain unavailable until an authenticated provider can preserve the native review, authorization, receipt, and reversibility boundaries.

Family Screen Time owns caregiver and child policy meaning inside Household. Shared native enforcement and cross-domain conflict behavior follow [`docs/architecture/screen-time-control-plane.md`](../../../docs/architecture/screen-time-control-plane.md).
Child-device setup, device authentication, policy reconciliation, application receipts,
full snapshots, readiness, recovery, and release follow
[`docs/architecture/family-screen-time-device-enrollment-and-reconciliation.md`](../../../docs/architecture/family-screen-time-device-enrollment-and-reconciliation.md).
