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
  - jtbd-capture-and-find-meaning
  - jtbd-get-help-without-retelling-my-life
briefs:
  - budget-settings
  - kwilt-money-capability-integration
  - money-capability-first-entry
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
  - budget-overage-recovery
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
  - money-living-limit-answer
  - money-flexible-room-widgets
  - multimodal-money-answers
  - plaid-transaction-backed-meter
  - prediction-trust-contract
  - screen-time-controls
  - screen-time-rule-system-consolidation
  - settings-surface-grammar
  - summary-freshness-recovery
  - transaction-display-names
  - transaction-freshness-trust
  - transaction-inventory-date-scope
  - money-transaction-notes
  - transaction-rule-truth
  - transaction-truth-to-five
status: shipping
last_reviewed: 2026-08-31
---

# Money

Helps Maya understand and act on household money reality without turning family
life into a finance hobby.

## Ownership

- `data/` owns the shared-session Money projection and authoritative mutation
  adapters.
- `domain/` owns financial truth, forecast, living-plan, onboarding, budget
  condition semantics, and Goal-bridge rules. Screen Time owns app-rule identity,
  selection, lifecycle, persistence, and enforcement.
- `navigation/` and `screens/` own Money's Summary, Transactions, Accounts, and
  object workflows inside the one Kwilt shell.
- `runtime/` and `native/` own capability activation, privacy, Plaid handoff,
  widgets, and typed budget truth supplied to Screen Time.
- Kwilt's shell remains the single owner of authentication, Settings, Chat,
  RevenueCat, notifications, account deletion/export, and the release train.

## Documentation

Start at [`docs/capabilities/money/README.md`](../../../docs/capabilities/money/README.md)
for the canonical brief catalog, topical design history, frozen-source boundary,
and current proof limits.

The pending-commitment contract is accepted but remains unshipped until current
outflows are counted and categorized before settlement, historical planning
stays posted-only, and the real sync path proves pending-to-posted replacement
without a duplicate contribution. Temporary-hold treatment is excluded without
explicit transaction-level evidence.

Money category entry delegates app-rule creation and editing to the canonical
Screen Time sentence composer with the relevant budget preselected. Source and
test proof do not replace signed-device proof that the native shield is enforced.

## Monetization boundary

Money and Budgets are a Pro capability from first setup because the usable
product depends on connected, imported transaction truth. Kwilt does not offer
manual account or transaction entry and will not add it as a Free substitute.

An eligible person can start the one-month full-Pro Apple introductory trial
before Plaid initialization. Active trial, paid, and billing-grace states unlock
connection, import, categories, plans, transaction review/correction, relink,
refresh, and sync. After confirmed expiration or refund, active Money operations
and provider sync stop while retained accounts, transactions, and budget history
remain readable; deletion and required data-management routes remain available.
