# Money Product Documentation

Money is a first-class capability inside the one public Kwilt app. This folder
is the documentation entry point for its demand model, topical briefs, design
history, source provenance, and evidence boundaries.

## Canonical Demand Model

- Audience and persona: [Aspirational family organizers / Maya](../../personas/aspirational-family-organizers.md)
- Hero flow: [Maya: move family life forward](../../job-flows/maya-move-family-life-forward.md)
- Money flow: [Maya: review budget reality before spending](../../job-flows/maya-review-budget-reality-before-spending.md)
- Money-specific job: [Review household money reality before spending or changing the plan](../../jtbd/move-the-few-things-that-matter/review-budget-reality-before-spending.md)
- Integration contract: [Kwilt Money capability integration](../../feature-briefs/kwilt-money-capability-integration.md)
- Progressive activation: [Money progressive activation](../../feature-briefs/money-progressive-activation.md)
- Implementation manifest: [`src/capabilities/money/FEATURE.md`](../../../src/capabilities/money/FEATURE.md)

## Topical Briefs

The standalone Money briefs are promoted into `docs/feature-briefs/` so Kwilt's
product framing and linting workflows discover them normally. Their audience
hero is normalized to `jtbd-move-the-few-things-that-matter`; the more specific
Money jobs remain in `serves:`. The exact original front matter remains in the
frozen source below.

| Topic | Canonical briefs |
| --- | --- |
| Accounts and connected truth | [Accounts inventory](../../feature-briefs/accounts-inventory-shell.md), [Plaid-backed meters](../../feature-briefs/plaid-transaction-backed-meter.md), [transaction freshness](../../feature-briefs/transaction-freshness-trust.md), [summary recovery](../../feature-briefs/summary-freshness-recovery.md) |
| Categories and planning | [Governed household plan](../../feature-briefs/governed-household-money-plan.md), [category planning](../../feature-briefs/category-budget-planning.md), [category ordering](../../feature-briefs/money-category-ordering.md), [amount adjustment](../../feature-briefs/budget-amount-adjustment.md), [living-limit answer](../../feature-briefs/money-living-limit-answer.md), [rollovers](../../feature-briefs/category-rollovers.md), [automatic living plan](../../feature-briefs/auto-budget-from-living-target.md) |
| Transaction truth | [Date scope](../../feature-briefs/transaction-inventory-date-scope.md), [display names](../../feature-briefs/transaction-display-names.md), [rule truth](../../feature-briefs/transaction-rule-truth.md), [credits and income](../../feature-briefs/budget-credits-and-income-classification.md), [month-scoped detail](../../feature-briefs/budget-detail-month-scoped-activity.md) |
| Forecast and prediction | [Prediction trust](../../feature-briefs/prediction-trust-contract.md), [model tradeoffs](../../feature-briefs/model-strategy-and-tradeoffs.md), [income runway](../../feature-briefs/income-runway-detection.md) |
| Intentional access | [Budget reality gate](../../feature-briefs/budget-reality-gate.md), [Screen Time controls](../../feature-briefs/screen-time-controls.md), [unlock review](../../feature-briefs/budget-app-unlock-review.md), [unlock guide](../../feature-briefs/budget-unlock-bottom-guide.md), [app-pause builder](../../feature-briefs/app-pause-sentence-builder.md) |
| First use and continuity | [Money progressive activation](../../feature-briefs/money-progressive-activation.md), [Category-gate onboarding](../../feature-briefs/lane-gate-onboarding.md), [Goal crossover](../../feature-briefs/live-better-goal-crossover.md), [iOS widgets](../../feature-briefs/ios-budget-widgets.md), [flexible-room widgets](../../feature-briefs/money-flexible-room-widgets.md) |
| Product system | [Settings grammar](../../feature-briefs/settings-surface-grammar.md), [job-delivery map](../../feature-briefs/job-delivery-map.md) |

## Supporting Topical Material

- Design explorations: [`docs/design-explorations/`](../../design-explorations/)
  contains the 31 Money topic folders imported from the frozen source alongside
  the parent-app integration exploration.
- Concepts: [Money v1](../../concepts/kwilt-budget-v1-concept.md),
  [spend-category ontology](../../concepts/spend-category-ontology.md), and
  [shared agent workspace](../../concepts/shared-agent-workspace-capability.md).
- Product voice: [Money copy and voice](../../copy-voice.md).
- Basic workflow: [standalone Money workflow](../../basic-workflow.md), retained
  as source behavior rather than the current shell contract.
- Visual references: [`docs/design-references/`](../../design-references/).

## Frozen Source And History

[`frozen-source/`](frozen-source/) contains all 230 non-metadata documentation
files from standalone Money commit
`df383c3ac1538dff0a83b43a21ff3e45c024298b`. This includes the original persona
and JTBD pointers, feature-brief authoring guide, job-delivery map and operating
templates, reviews, implementation plans, security/Plaid material, development
notes, concepts, visual references, briefs, and design explorations.

Read frozen files as provenance. They contain standalone routes, delivery
scores, implementation state, and release claims that may have been superseded
by native Kwilt. Current truth comes from the canonical documents linked above,
current source, and fresh runtime evidence.

## Evidence Boundary

As of 2026-07-27, source and automated contracts prove safe Plaid error
normalization, the compact transaction category/meaning picker, account-type
payment-source presentation, bounded confirmed transaction writes, atomic
governed-plan projections, stale-refresh protection, allowlisted latency
telemetry, and semantic haptic routing. The full Jest suite passes with 337
suites and 2,353 tests; the diff-aware verification gate also passes its
TypeScript, code-health, related-Jest, Supabase Deno, and code-map checks.

An authenticated iPhone 17 Pro simulator running this branch through Metro on
port 8081 proves that a Chase TOTAL CHECKING payment renders as a blue account
transfer rather than a plastic card, and that its compact picker exposes
placeholder search, categories without decorative thumbnails, Internal
transfer, and Outside the plan. An unchanged category-settings save completed
in the `under_250ms` telemetry bucket without a plan or identity write.

This does not prove tactile haptic output, accessibility-policy behavior on
hardware, signed-device persistence, installed TestFlight parity, or live Plaid
OAuth/relink. The observed production link-token request returned HTTP 400, but
the current deployed logs do not expose the provider error body; the exact
Plaid code and root cause still require an approved instrumented deployment and
signed-device reproduction. Physical-device Face ID, widget refresh, Screen
Time enforcement, archive/App Thinning, global export, household invite
creation, and standalone retirement also remain separate boundaries.
