---
feature: onboarding
audiences: [audience-faith-and-values-driven-builders]
personas: [Sarah]
hero_jtbd: jtbd-see-who-im-becoming
job_flow: job-flow-sarah-see-who-im-becoming
serves:
  - jtbd-see-who-im-becoming
  - jtbd-name-my-arcs
  - jtbd-move-the-few-things-that-matter
  - jtbd-trust-this-app-with-my-life
briefs:
  - ai-proxy-and-quotas
  - ftux-goal-arc-onboarding
  - growth-evangelism-shared-goals
status: shipped
last_reviewed: 2026-08-19
---

# onboarding

Helps Sarah begin with aspiration and identity direction, then enter Kwilt with enough trust to keep going.

## Surfaces in this folder

- `FirstTimeUxFlow.tsx` and `IdentityAspirationFlow.tsx` - first-run aspiration and Arc formation.
- `LaunchScreen.tsx` and `ConfigErrorScreen.tsx` - startup and failure states.
- `ReturningUserPermissionsFlow.tsx`, `SignInInterstitial.tsx`, and `CreditsInterstitialDrawer.tsx` - permission, identity, and credit interstitials.

## Notes

This feature is the accepted guided-discovery and creation reference inside the broader
capability-routed first-install system. Preserve its identity depth and useful questions without
treating it as the universal interaction model for every capability.

The capability coordinator is currently available only as a Developer Tools rehearsal. Normal
first launch stays on this existing flow until the promoted value doors meet the full promotion
gate.
