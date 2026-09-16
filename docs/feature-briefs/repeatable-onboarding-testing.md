---
id: brief-repeatable-onboarding-testing
title: Repeatable Onboarding Testing
status: accepted
audiences: [audience-faith-and-values-driven-builders]
personas: [Sarah]
hero_jtbd: jtbd-see-who-im-becoming
job_flow: job-flow-sarah-see-who-im-becoming
serves: [jtbd-trust-this-app-with-my-life]
related_briefs: [brief-provisioned-email-sign-in-demo-accounts]
owner: andrew
last_updated: 2026-09-15
---

# Repeatable Onboarding Testing

## Context

Onboarding testing needs two explicit proof modes: a genuinely clean app install with a new identity, and a faster development-only replay. The existing DevTools trigger reopens the flow but neither cleans its prior object graph nor explains what it preserves.

## Target audience

The product experience belongs to `audience-faith-and-values-driven-builders`: Sarah needs the first encounter to create a trustworthy identity direction rather than feel like setup administration. Andrew is the immediate development operator.

## Representative persona

Sarah represents the person whose first experience is being tested. Andrew needs a repeatable, truthful starting point to assess whether that experience still serves her.

## Aspirational design challenge

How might we help Andrew repeatedly inspect onboarding from an intentional starting point, while preserving truthful identity and data boundaries?

## Hero JTBD

`jtbd-see-who-im-becoming` — onboarding must help Sarah form an identity direction she recognizes as her own. `jtbd-trust-this-app-with-my-life` remains the supporting quality bar for reset boundaries.

## Job flow step

`job-flow-sarah-see-who-im-becoming`, the first-run identity-formation steps. This brief improves the proof of that onboarding path rather than changing its customer-facing design.

## JTBD framing

When onboarding changes, the operator wants a repeatable starting point and an honest account-state boundary, so observed behavior can be trusted. This serves `jtbd-trust-this-app-with-my-life`.

## Design

### Two proof modes

1. **Clean install + onboarding test identity**: uninstall the app from the target Simulator, install the exact candidate, and sign in with the dedicated ordinary account marked by server-controlled `app_metadata.onboarding_test_account`. In development builds only, an old marked account with no synced Arc/Goal/Activity rows is classified as new instead of using the account-age fallback. Real synced data still makes it returning.
2. **Reset & replay onboarding**: from the development-only DevTools route, remove the last known onboarding-created Arc and its child Goals/To-dos, clear onboarding answers and one-time handoff state, and reopen onboarding. Preserve the signed-in identity and unrelated account data.

The replay control must say that it is not a fresh install or account reset. If known onboarding-created content will be removed, use a native destructive confirmation naming the scope. Do not add a toggle: replay is an action, not persistent mode.

### Data and authority contract

- Cleanup is limited to `lastOnboardingArcId`; if no Arc is recorded, it may remove `lastOnboardingGoalId` and its child Activities.
- Unrelated Arcs, Goals, Activities, capability records, auth identity, and credentials remain.
- The app receives no service-role credential and no privileged backend reset endpoint.
- The onboarding-test marker is server-controlled app metadata, grants no authorization, and only changes the development-build age fallback.
- Full deletion continues through the existing account-deletion flow. Provisioned demo-account reset remains operator-owned and is not an onboarding reset.

### UI contract

Job: When Andrew iterates on onboarding, he needs one fast replay action so he can inspect the full flow without hidden cleanup scope.

Authority chain: explicit request → this brief → existing DevTools composition → owned Kwilt Button/Text/card patterns → native Alert.

Three-second read: this replays onboarding and keeps the account.

Primary action: **Reset & replay onboarding**.

Primary information: exactly which onboarding artifacts are removed and which data remains.

Reveal later: destructive confirmation only when cleanup targets exist.

Scan order: First-time UX label → scope statement → replay action → run metadata.

Must not add: toggle, credentials, account-wide wipe, new settings route, or production surface.

Required states: no previous onboarding object, previous Arc graph, previous Goal fallback, active flow, and completion.

Proof path: `kwilt://__dev/tools` on the iPhone 17 Pro / iOS 26.5 Simulator.

## Acceptance criteria

- The action removes the recorded onboarding Arc and all of its Goals/Activities while preserving unrelated objects.
- If only a recorded onboarding Goal exists, it and its Activities are removed while unrelated objects remain.
- Onboarding answers, celebrations, and handoff guides reset before the flow reopens.
- The account identity and unrelated capability data remain.
- The card explicitly says replay is not a fresh install or account reset.
- A known destructive cleanup requires confirmation; an empty replay starts immediately.
- Focused tests cover Arc cleanup, Goal fallback, and unrelated-data preservation.
- Focused sign-in tests cover the marked account's new-user classification when it has no synced data.
- Task-completion verification is scoped to the changed files because the checkout contains unrelated work.
- Simulator evidence and clean-install evidence are reported separately.

## Success signal

Andrew can complete onboarding, invoke one development-only action, and complete it again without duplicate prior onboarding objects or ambiguity about what was reset.

## Spec refinement

The reset boundary is intentionally onboarding-scoped. One ordinary account is provisioned operator-side with a development-only classification marker; the client still supports sign-in rather than public account creation and receives no elevated authority.

## Open questions

None for this local development slice.
