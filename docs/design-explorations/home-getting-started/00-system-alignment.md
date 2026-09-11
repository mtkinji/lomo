# Home activation: current system and integration decisions

Reviewed 2026-09-10 in `/Users/andrewwatanabe/Kwilt`, `main` at `9baf1a4a8e14b83e806c1df9e25ee4d3e66d0678`, with concurrent dirty work. This is a targeted source/document audit, not production, signed-device or runtime verification. This concept's specification is [Home Getting Started and Readiness](../../feature-briefs/home-getting-started.md).

## Authority and corrections to the first sketch

1. Andrew's request authorizes developing the concept across onboarding, household readiness and app use. It does not authorize changing production entry or implementing this feature.
2. [Capability-Routed First Install](../../feature-briefs/capability-routed-onboarding.md) is the accepted direction. Guided Overture is explicitly retired. Earlier Quiet Compass/chooser explorations are historical alternatives.
3. The accepted Welcome/value-door reel supplies orientation. Home must not add another generic chooser after selection. Skip tour must expose the real capability menu without interruption. Andrew subsequently clarified that Home must explicitly invite useful setup; skipping the tour does not suppress inline invitations on the next unobscured Home view.
4. Capability-specific current sources refine older general documents. For example, the stable Money path ID is still `budget-app-controls`, but its current headline and first-value contract describe Money foundation. Do not infer current behavior from that ID or the older app-blocking pitch.
5. The initial proposal to make Home every new user's first destination is narrowed: Home is the proposed default *unscoped shell destination after orientation* for the future promoted cohort. A chosen capability keeps its native result. Returning-user destinations remain unchanged. This is a proposal, not an existing contract or global routing migration.

## Evidence ledger

| Concern | Current source or accepted document | What it supports | What it does not establish |
| --- | --- | --- | --- |
| Universal entry | `src/features/capability-onboarding/capabilityOnboardingEntryPolicy.ts` | Release stage is `development-rehearsal`; exact link/invitation/restore bypass; production policy requires promoted Goals and Meals | Helper is not proof of installed production integration |
| Actual host | `src/features/dev/DevToolsScreen.tsx` mounts `CapabilityOnboardingHost`; `App.tsx` mounts legacy `FirstTimeUxFlow` | Rehearsal enters Money, Food, Goals or Chat; exploration opens the capability menu | New first-install production rollout |
| Persistence | `capabilityOnboardingState.ts`, `useCapabilityOnboardingStore.ts` | Per-user local records; selected path, per-path checkpoints, receipt-based completions, `explored` exit | Cross-device sync, production/rehearsal isolation, readiness freshness |
| Handoffs | `capabilityOnboardingNavigationTarget.ts` | Money, Food, Goals and Chat have concrete typed destinations | Screen Time, Chores and Games registry entries are not all launchable through this builder; default is null |
| Home | `SharedHomeScreen.tsx`, `SharedLifeFeed.tsx`, shared-home `FEATURE.md` | Gray shell, feed, reading restoration, relationships, authored posts and source-owned Chores arrivals | A setup projection, household-health score or permission to expose personal state to children |
| Household | `household.ts`, household-foundation brief | Owner/caregiver/child, optional auth bindings, per-child activation and scoped grants | Membership is not permission for every capability or proof of participation |
| Devices | `householdDeviceParticipation.ts`, `HouseholdDeviceSetupScreen.tsx` | Personal child vs shared-household devices, statuses, expiring pairing sessions and connection receipt | Device connection is not Apple authorization or applied Screen Time |
| Screen Time | `familyScreenTimeSetupFlow.ts`, pairing-receipt exploration | Progress requires capability/device/selection/review facts and matching desired/applied versions | Physical enforcement cannot be claimed from this source audit or a simulated adapter |
| Money | `moneyOnboarding.ts`, `moneyOnboardingAssessment.ts`, registry | Owner-controlled checkpoints, usable-plan completion, insufficient-evidence handling, Pro connection decision; current registry says `money_foundation_completed` | A link callback does not prove a budget exists; foundation completion is distinct from the older first-trusted-decision outcome |
| Food | food-capability-onboarding brief, `foodFirstCycleGuide.ts` | Individual-first recipe-to-plan-to-groceries relay; sharing optional; checkpoints can resolve against current data | `sharing-opened` is not a published share; guide completion is not a shared household's participation |
| Goals and Chat | registry, `App.tsx`, `FirstTimeUxFlow.tsx` | Goal receipt and native result handoff; Chat registry currently uses durable user-message event | Goal creation is not goal accomplishment; message sent is engagement, not proof of helpful answer |
| Shared-device privacy | shared-household-device-profiles brief; Home manifest | Caregiver and child contexts have separate allowed projections; adult Home eligibility stays bounded | This concept does not add Home to child/Household Mode or settle conflicting historical reauthentication language |

## Ownership seam

Home should consume small, authorized projections from the existing owners. It owns presentation and the user's choice of which path to foreground. It does not become the source of truth for bank connection, device setup, onboarding completion, or Household authority.

Extend the existing capability-onboarding contracts with optional resumable Home guidance; preserve stable path IDs. Add a separate Household prerequisite adapter for concrete membership/device work. Household is a dependency when needed, not a mandatory onboarding door for everyone.

Use real owner facts to recover from missing local history. A reinstall with no local record does not make an established user new. `universalState: explored` means the tour was exited, not that all future setup invitations were declined. Preserve the exit while allowing contextual inline invitations.

## Source gaps to resolve when building

- Make production vs rehearsal provenance explicit in state and evidence before production Home consumes records; current local store lacks that separation.
- Define typed owner projections and exact launch/recovery routes; reject registry-only entries with no executable handoff.
- Define current role, device, grant, entitlement and rollout eligibility per path, using source-owned evaluators.
- Adapt existing first-value events without relabeling weaker events as useful outcomes. Track Food guide progress separately from meal-plan first value and grocery payoff.
- Home launch and native return context need integration in the real entry path; changing the helper alone is insufficient.
- Account-scoped presentation preferences require a deliberate persistence policy. Local-only preference persistence is acceptable for rehearsal; production cross-device behavior must be implemented before it is promised.
- Existing Home reading-anchor logic must account for the guidance region without shifting the post being read.

No existing job-flow scores are raised by this concept. No current first-install or capability source is changed.
