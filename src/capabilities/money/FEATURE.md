---
feature: money
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
serves:
  - jtbd-move-the-few-things-that-matter
  - jtbd-review-budget-reality-before-spending
  - jtbd-put-intention-before-impulse
  - jtbd-carry-intentions-into-action
  - jtbd-trust-this-app-with-my-life
briefs:
  - kwilt-money-capability-integration
  - money-progressive-activation
  - money-category-ordering
  - accounts-inventory-shell
  - app-pause-sentence-builder
  - auto-budget-from-living-target
  - budget-amount-adjustment
  - budget-app-unlock-review
  - budget-credits-and-income-classification
  - budget-detail-month-scoped-activity
  - budget-reality-gate
  - budget-unlock-bottom-guide
  - category-budget-planning
  - category-rollovers
  - governed-household-money-plan
  - income-runway-detection
  - ios-budget-widgets
  - job-delivery-map
  - lane-gate-onboarding
  - live-better-goal-crossover
  - model-strategy-and-tradeoffs
  - plaid-transaction-backed-meter
  - prediction-trust-contract
  - screen-time-controls
  - settings-surface-grammar
  - summary-freshness-recovery
  - transaction-display-names
  - transaction-freshness-trust
  - transaction-inventory-date-scope
  - transaction-rule-truth
  - transaction-truth-to-five
status: shipping
last_reviewed: 2026-07-27
---

# Money

Helps Maya understand and act on household money reality without turning family
life into a finance hobby.

## Ownership

- `data/` owns the shared-session Money projection and authoritative mutation
  adapters.
- `domain/` owns financial truth, forecast, living-plan, onboarding, app-control,
  and Goal-bridge rules.
- `navigation/` and `screens/` own Money's Summary, Transactions, Accounts, and
  object workflows inside the one Kwilt shell.
- `runtime/` and `native/` own capability activation, privacy, Plaid handoff,
  widgets, and category-specific Screen Time coordination.
- Kwilt's shell remains the single owner of authentication, Settings, Chat,
  RevenueCat, notifications, account deletion/export, and the release train.

## Documentation

Start at [`docs/capabilities/money/README.md`](../../../docs/capabilities/money/README.md)
for the canonical brief catalog, topical design history, frozen-source boundary,
and current proof limits.
