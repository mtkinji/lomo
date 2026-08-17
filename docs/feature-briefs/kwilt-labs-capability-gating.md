---
id: brief-kwilt-labs-capability-gating
title: Kwilt Labs capability gating
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-trust-this-app-with-my-life, jtbd-move-the-few-things-that-matter]
related_briefs: [brief-pixel-pet-labs, brief-explore-capability]
owner: andrew
last_updated: 2026-08-17
---

# Kwilt Labs Capability Gating

## Context

Explore is an ambitious location capability with incomplete signed-device crash-free, battery, and thermal evidence. It is currently hidden from the capability menu by a PostHog flag, but its routes and signed-in runtime hosts remain available. Kwilt needs the product-level Labs contract already anticipated by Pixel Pet: emerging capabilities are off by default, explicitly enabled, independently reversible, and never delete their state when hidden.

## Product contract

- Settings > Personalization contains **Kwilt Labs** instead of a root Explore settings row.
- Settings > Kwilt Labs lists code-owned capability entries. Explore is the first entry.
- Every capability starts disabled unless the persisted user choice explicitly enables it.
- Explore activation controls menu visibility, route/deep-link access, navigation restore, sync runtime, automatic-location runtime, and background-task execution.
- Disabling Explore immediately reconciles and stops both location-update and wake-geofence services.
- Disabling preserves the Explore store, permissions, sessions, Places, territory, and preferences. Clear History remains a separate Explore action.
- Enabling Explore does not itself request location permission or choose Automatic Exploring. Explore onboarding and settings retain those responsibilities.
- A disabled Explore deep link routes to Kwilt Labs and never renders the map.
- The PostHog `explore-capability` flag no longer owns consumer activation.

## Data and migration

Use a dedicated persisted `kwilt-labs-v1` store with a code-owned catalog and an explicit enabled-capability set. Missing, malformed, legacy, fresh-install, and upgrade state all resolve to disabled. No Explore domain migration runs.

## UI contract

Job: when a person is willing to try an emerging capability, they need one honest reversible choice so they can experiment without giving unstable behavior default ownership.

Authority chain: explicit user decision -> this brief -> Kwilt UI constitution and canonical Settings components -> native switch semantics -> RNR switch/settings anatomy.

Three-second read: **Kwilt Labs** contains optional capabilities; Explore is off or on.

Primary action: toggle Explore.

Primary information: Explore's activation state and that it maps private places and paths.

Secondary information: Labs may change or go away; disabling preserves history.

Reveal later: Explore's map, tracking, sharing, recap, and deletion settings.

Scan order: page title -> Labs expectation -> Explore row and switch -> preservation footer.

Must not add: master switch, cards, badges, restart action, confirmation dialog, remote variants, or data-reset controls.

Reuse map: page/group/toggle -> `SettingsPage`, `SettingsGroup`, `SettingsToggleRow`; discovery -> `SettingsHomeScreen`; navigation -> existing capability menu and Explore host; runtime -> existing Explore hosts and location reconciliation.

Nearest precedent: Settings > Notifications and Pixel Pet's accepted Labs placement. Difference: Labs owns capability activation, not capability preferences.

External exemplar ledger: N/A.

Required states: disabled default, enabled, persisted enabled, disable while services are active, malformed persisted state, disabled deep link, signed-out and signed-in.

Proof path: Settings > Kwilt Labs and capability menu on iPhone 17 Pro Simulator; focused logic/component tests; TestFlight physical-device restart and background-service verification.

## Spec refinement

- Decision: all existing users default to Explore off unless they explicitly enable the new Lab. Prior remote-flag visibility and OS location permission do not migrate into consent.
- Decision: Lab state is device-local in this release; it is not household, account-sync, entitlement, or PostHog state.
- Decision: disabling stops runtime work but does not mutate Explore's recording preference or end/delete history.
- Deferred: adding Pet or another Lab, syncing Lab choices across devices, analytics, and promotion criteria UI.

## Acceptance

- Default and malformed state keep Explore hidden and inactive.
- The Settings switch persists across app restart.
- Enabled Explore appears in the capability menu and can open normally.
- Disabled route/deep-link access cannot render Explore.
- Both Explore background task handlers exit and stop services while disabled.
- Disabling does not clear `kwilt-explore-v1`.
- Settings, navigation, runtime, product lint, and diff-aware verification pass.
