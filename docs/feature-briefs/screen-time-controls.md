---
id: brief-screen-time-controls
title: Screen Time Controls
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: choose-intentional-access
serves: [jtbd-put-intention-before-impulse, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending]
related_briefs: [brief-budget-reality-gate, brief-lane-gate-onboarding, brief-ios-budget-widgets, brief-screen-time-controls-contextual-setup, brief-family-screen-time-controls]
owner: andrew
last_updated: 2026-07-30
source_repo: mtkinji/kwilt-budget
source_sha: df383c3ac1538dff0a83b43a21ff3e45c024298b
---

> **Money source note:** Promoted from frozen standalone Money product documentation. Preserve its product reasoning, but verify route, implementation, delivery, and release claims against `src/capabilities/money/` and current runtime evidence.

# Screen Time Controls

> **System ownership:** This imported brief defines Money-owned Screen Time agreements. The Money category remains the canonical policy editor; shared authorization, selection, enforcement, receipt, conflict, and overview rules are governed by the canonical [Screen Time Control Plane](../architecture/screen-time-control-plane.md).

## Context

Kwilt Money's core wedge is a spending app that waits behind budget reality.
This feature turns the earlier app-control scaffold into the first native iOS
Screen Time slice: the user chooses apps or categories through Apple's
FamilyControls picker, then Kwilt Money applies or clears ManagedSettings
shields based on budget conditions.

The feature is intentionally not a generic blocker. It is a user-owned spending
pause tied to a named budget lane.

## JTBD Framing

When Maya is about to open an app that can trigger spending, she wants the app
to wait until she has checked the connected budget condition, so the next action
is intentional instead of automatic.

Primary job: `jtbd-put-intention-before-impulse`.

Supporting jobs:

- `jtbd-carry-intentions-into-action` - carry the budget rule into the app-open moment.
- `jtbd-trust-this-app-with-my-life` - money plus device restrictions require transparent, reversible controls.
- `jtbd-review-budget-reality-before-spending` - local Kwilt Money sub-job.

## Product Behavior

Money Screen Time controls live with the category whose budget evidence powers the restriction. **Settings > Screen Time** may summarize active Money policies and route to their categories, but it does not duplicate the category editor.

The user can:

1. Grant Screen Time access.
2. Choose apps or categories in the native FamilyControls picker.
3. Turn individual app-control policies on or off.
4. Choose which budget conditions make the selected apps wait.

Supported conditions:

- `review_before_access` - block until the user performs a budget review action for that budget/target.
- `over_budget` - block when the connected budget has reached or exceeded its limit.
- `ahead_of_pace` - block when the connected budget is materially ahead of period pace.
- `transactions_need_review` - block when the connected budget has unmatched or review-needed transaction evidence.

The first implemented fixture policies are:

- Amazon connected to Shopping, enabled by default.
- Target connected to Shopping, present but disabled by default.

## Native Model

The implementation follows the same pattern as Kwilt mobile:

- JS stores Screen Time setup state and policy overrides.
- The native bridge owns the opaque `FamilyActivitySelection`.
- JS receives only selection summaries such as app/category counts.
- The runtime decides whether any active policy should shield the selected set.
- The native bridge applies or clears a named `ManagedSettingsStore`.
- Shield extensions read a reason from App Group `UserDefaults` and render Budget-specific copy.

This means the selected native apps are not represented as readable bundle IDs
in JS. Budget policy targets are product labels and rule mappings; the actual
shielded apps come from the user's native picker selection.

## Implementation Map

- Settings entry: `app/settings.tsx`
- Management screen: `app/screen-time-controls.tsx`
- App-control route copy: `app/app-control/[budgetId].tsx`
- Review reconciliation: `app/review.tsx`
- Foreground reconciliation: `app/_layout.tsx`
- Domain model: `src/domain/app-gate.ts`
- Budget fixture policies/reviews: `src/platform/budget-repository.ts`
- Rule evaluation: `src/services/budgetScreenTime.ts`
- Settings persistence: `src/services/budgetScreenTimeStorage.ts`
- Runtime reconciliation: `src/services/budgetScreenTimeRuntime.ts`
- Native JS bridge wrapper: `src/services/appleEcosystem/screenTimeProtection.ts`
- Expo config plugin: `plugins/withBudgetScreenTimeControls.js`
- Shield extension plugin: `plugins/appleEcosystem/screenTimeShieldExtensions.js`
- Generated native bridge: `ios/KwiltBudget/KwiltScreenTimeProtection.swift`
- Generated shield targets: `ios/KwiltShieldConfiguration`, `ios/KwiltShieldAction`

## Release Gate

Native Screen Time capability is enabled during prebuild with:

```sh
KWILT_BUDGET_ENABLE_SCREEN_TIME=1 npx expo prebuild --platform ios --no-install
```

The plugin also accepts `KWILT_ENABLE_SCREEN_TIME=1` for parity with Kwilt
mobile, but the Budget-specific flag is preferred for clarity.

Any TestFlight or production lane that is expected to exercise real shields must
verify:

- the Family Controls entitlement is present,
- the App Group entitlement is present,
- shield extension targets are embedded,
- the release profile does not disable Screen Time,
- the signed Apple account has the required capability.

Simulator builds can prove compilation and extension embedding, but real app
blocking requires a signed device build with the entitlement.

## Acceptance Criteria

- Settings exposes Screen Time Controls.
- Screen Time Controls can request authorization and launch the native picker.
- Selected native apps/categories are summarized in the UI.
- Rules can be enabled/disabled per policy.
- Rules can express review-before-access and over-budget blocking.
- Rules can also express ahead-of-pace and needs-review blocking.
- A budget review event causes Screen Time reconciliation.
- App foregrounding reapplies active shields.
- Shield copy names the budget reason without shame or parental-control framing.
- Native prebuild creates the bridge, entitlement, App Group, and shield extensions.

## Verification Evidence

Last verified on 2026-07-02:

- `npm run lint`
- `npm run test:forecast`
- `npx expo config --type public --json`
- `KWILT_BUDGET_ENABLE_SCREEN_TIME=1 npx expo prebuild --platform ios --no-install`
- `plutil -lint` for generated entitlement and extension plist files
- `xcodebuild -workspace ios/KwiltBudget.xcworkspace -scheme KwiltBudget -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5' build CODE_SIGNING_ALLOWED=NO`

The xcodebuild simulator build succeeded and embedded both shield extensions.

## Open Questions

- Should the first production policy block all selected apps from one global native selection, or should Budget eventually support separate native selections per budget rule?
- Should an over-budget rule unlock only after a review, a recovery-plan action, the next period, or explicit rule editing?
- Should weekly budget review, AI-tool spend limit, and recovery-plan gates become separate policies or presets on this same policy model?
