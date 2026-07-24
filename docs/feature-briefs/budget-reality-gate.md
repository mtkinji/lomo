---
id: brief-budget-reality-gate
title: Budget Reality Gate
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: choose-intentional-access
serves: [jtbd-put-intention-before-impulse, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending]
related_briefs: [brief-screen-time-controls]
owner: andrew
last_updated: 2026-06-24
source_repo: mtkinji/kwilt-budget
source_sha: df383c3ac1538dff0a83b43a21ff3e45c024298b
---

> **Money source note:** Promoted from frozen standalone Money product documentation. Preserve its product reasoning, but verify route, implementation, delivery, and release claims against `src/capabilities/money/` and current runtime evidence.

# Budget Reality Gate

## Context

Kwilt Money's first scaffold already points at a strong wedge: selected
spending apps stay behind a budget review moment. The brief turns that scaffold
into a buildable value unit tied to Kwilt's shared persona and JTBD taxonomy:
multiple possible meters, app-to-meter rules, and one intentional review outcome.

## Target Audience

`audience-aspirational-family-organizers` - households trying to become more
organized without adopting a productivity methodology. This matters because
family spending decisions often happen inside ordinary convenience apps, not in
budget review sessions.

## Representative Persona

Maya wants her household to stay inside chosen lanes without running a finance
dashboard. She is willing to accept a calm pause before a known spending app if
the rule is explicit, reversible, and helps her act with intention.

## Aspirational Design Challenge

How might we help Maya put a calm budget-reality pause before spend-triggering
apps, while preserving Kwilt's trust, agency, and non-productivity-app voice?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` - the budget gate serves real progress
on family stewardship by carrying a household intention into the moment it
would otherwise be forgotten.

## Job Flow Step

`job-flow-maya-review-budget-reality-before-spending`

Underserved step: see the current lane meter and choose intentional access
before a spend-triggering app opens.

Current offering: a hard-coded meter, review screen, and in-memory review event.

Delivery score: 2 overall. The interaction exists as a scaffold, but it is not
yet coherent enough to learn whether the review gate is valuable.

## JTBD Framing

When Maya is about to open a spending app that can quietly push the household
off track, she wants Kwilt Money to show the live lane reality first, so the
next tap is intentional rather than automatic. The feature primarily serves
`jtbd-put-intention-before-impulse`, supported by
`jtbd-carry-intentions-into-action` and `jtbd-trust-this-app-with-my-life`.
`jtbd-review-budget-reality-before-spending` is a provisional local sub-job for
this app's first value unit.

## Design

The V1 value unit is a budget reality gate:

1. Budget meters exist for meaningful spending contexts, such as `Takeout`, `Amazon household`, or `Amazon work`.
2. App/site targets are mapped to the relevant meter, such as DoorDash to `Takeout` or Amazon to `Amazon household`.
3. When access is requested, the review screen shows:
   - percent used,
   - dollars remaining,
   - pace versus the period,
   - the target app being opened,
   - the mapped meter name.
4. The user chooses one of two outcomes:
   - `Open for now`
   - `Leave blocked`
5. The app records a `BudgetReviewEvent`.
6. The Screen Time adapter uses an `opened_for_now` review to grant a short access window when that adapter is ready.

The copy should frame the interaction as a chosen pause:

- "Review the meter first."
- "Open for now."
- "Leave blocked."
- "This app opens after you review the mapped meter."

Avoid:

- "You are over budget."
- "Failed."
- "Allowance."
- "Compliance."
- "Permission."
- "Bad spending."

## Success Signal

Maya can explain the value without product language: "It makes me look at the
right meter before I open the spending app." She completes review flows at real
app-open moments and sometimes chooses to leave the app blocked.

## Spec Refinement

Clear enough to build:

- Local docs now provide persona, JTBD, and job-flow scaffolding.
- The core domain objects already exist and map well to the value unit.
- The first release can reuse the current meter and review screens.

Needs product decision before a permanent release:

- Whether the first interaction test uses fixture/manual values before real bank integration.
- Whether Plaid or MX becomes the first production bank-data provider.
- Whether the first entitlement path simulates Screen Time locally or attempts real Screen Time in TestFlight.
- How long `Open for now` should unlock the target.

Assumptions made:

- The first build may seed Amazon/household extras, but the model should support DoorDash/takeout and multiple Amazon-purpose meters.
- Durable meters require bank/card transaction data; manual values are only a short-lived learning scaffold.
- Plaid is the likely first integration path because its sandbox, Link flow, React Native docs, and Pay as You Go developer path are public and early-builder friendly.
- MX remains a serious candidate if transaction access reliability, institution coverage, or commercial terms are better.
- Kwilt should own meter-specific enrichment and assignment quality rather than depending entirely on provider categories.
- A local/TestFlight learning release is preferred over production-visible launch.

Acceptance criteria:

- The app can represent multiple meters, multiple targets, and at least one persisted app-to-meter rule.
- The app has a `FinancialDataProvider` boundary so Plaid and MX are implementation choices, not product architecture.
- The app can ingest normalized transactions into meters before any broad release.
- The app can store merchant/account/category/rule signals separately from user-approved meter assignment.
- The review screen offers both outcomes.
- Review history records both outcomes with timestamps.
- The unlock boundary is explicit, even if locally simulated.
- Copy remains non-shaming and user-owned.

## Bank Integration Direction

Durable Kwilt Money requires bank/card transaction integration. The product
should support Plaid and MX as provider candidates through one normalized
financial-data boundary:

- linked institution/account records,
- provider item/member connection state,
- normalized transactions,
- merchant/category enrichment,
- meter assignment rules,
- sync health and repair states.

The current recommendation is Plaid-first for sandbox and early mobile
implementation, with MX evaluated before production if access reliability,
institution coverage, or commercial terms become decisive. Enrichment quality
should be a Kwilt-owned layer on top of provider data: merchant/category hints
from the provider feed into durable meter assignment rules, user corrections,
confidence states, and eventually AI-assisted suggestions. See
[`06-bank-integration-options.md`](../design-explorations/budget-reality-gate/06-bank-integration-options.md).

## Open Questions

- Should the first build prioritize real persistence or real Screen Time behavior if only one can be made robust quickly?
