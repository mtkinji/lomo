# Kwilt Money V1 Concept

## One-line concept

Kwilt Money helps a user create a simple spend category, keep its budget meter
current with matched transactions, and optionally place spending apps behind a
calm review of that category.

## User-facing objects

- **Summary**: the month-level surface that answers how this month is going.
- **Category**: the primary object users create and inspect. Example: `Shopping`.
- **Budget plan**: the amount, cadence, period, forecast settings, and thresholds attached to a category. Example: `$100/month`.
- **Category group**: optional organization. Example: `Household`, `Kids`, `Food`.
- **Category match**: the relationship between a transaction and a category.
- **App control**: optional rule that makes apps/sites respond to a category's budget state.

Provider categories are matching signals, not the user's category model. See
`docs/concepts/spend-category-ontology.md` for the canonical ontology.

## Internal objects

- `SpendCategoryGroup`: optional grouping for categories.
- `SpendCategory`: user-owned spending context.
- `BudgetPlan` / budget plan fields: amount, cadence, period, and forecast settings for a category.
- `BudgetMeterSnapshot`: computed current state for display.
- `NormalizedTransaction`: source transaction imported or seeded into Kwilt.
- `AssignmentSuggestion`: Kwilt thinks a transaction may belong to a category.
- `TransactionAssignment`: confirmed relationship between a transaction and a category.
- `MatchingRule`: learned rule from user correction.
- `MeterLedgerEntry`: confirmed spend that counts toward the category meter.
- `AppGateRule`: optional FamilyControls/Screen Time rule for a category, including when and how access should change.
- `BudgetReviewEvent`: record of opening or leaving blocked after review.

Compatibility note: existing code still exposes names such as `BudgetLane`,
`BudgetDefinition`, and `/budgets/[budgetId]`. New code should prefer
category-first names where it does not require persistence or route churn.

## Home screen concept

The home screen borrows Robinhood's hierarchy, not its trading mood.

Top:

- monthly household runway chart,
- remaining amount,
- income and spend summary,
- pace status,
- sync freshness.

Below:

- compact category rows,
- each row shows remaining/spent, pace, match status, and optional app-control marker.

## Navigation model

Primary nav should be:

- **Summary**: the home/runway screen and category rows.
- **Transactions**: the projection of imported/spend activity, filtered by match state and category.
- **Ask**: the shared agent workspace capability ported from Giraffed: bottom composer, timeline, run controls, proposals, tools, and inline evidence.
- **More**: settings, connections, app controls, account, and lower-frequency setup.

Setup should not be a primary nav item. Creating a category is an action from `Summary`; adding app controls is an action from category detail; connecting accounts can be prompted in-context and also live in `More`.

The floating action in the tab bar can become the Ask composer entry instead of generic search. The Ask page should not be a generic chatbot or a lightweight approximation; it should consume the same mature agent-workspace capability as Giraffed, adapted to mobile. It should be a command/workspace surface that can:

- create a category,
- explain this month,
- find unmatched transactions,
- suggest category matches,
- create or adjust app-control rules,
- answer questions with inline evidence from categories/transactions.

The durable capability to port from Giraffed is:

- bottom composer,
- timeline/event hierarchy,
- streamed run events,
- assistant checkpoints,
- tool/action cards in the timeline,
- proposal cards and proposal operations,
- run steering and stop controls,
- persisted agent preferences,
- feedback hooks,
- inline evidence,
- clear confirmation before mutating budget, transaction-match, or app-control state.

See `docs/concepts/shared-agent-workspace-capability.md`.

## Category setup flow

1. Create category:
   - name,
   - monthly budget amount,
   - cadence.
2. Show the first meter.
3. Ask how to keep it current:
   - connect account,
   - enter/manual dev values,
   - decide later.
4. If transactions exist, show suggested matches.
5. User confirms/corrects matches.
6. Ask whether any apps should wait behind this category.
7. If yes, create an app control rule and rehearse the review.

## Transaction matching model

All transactions can contribute to total monthly cashflow, but only trusted matches count toward individual category meters.

Match states:

- `unmatched`: no category relationship yet.
- `suggested`: Kwilt thinks this belongs to a category.
- `confirmed`: user accepted or created the match.
- `ignored`: user said this transaction should not count toward this category.
- `excluded`: transaction should not count toward category meters.
- `split`: future state where one transaction contributes to multiple categories.

Unmatched spend appears as `Other spending` or `Uncategorized` in the monthly view. It does not pollute individual category meters.

## Transaction projection model

Yes, transactions should be persisted in a Kwilt-owned projection.

Plaid is the provider source. Kwilt needs its own normalized projection so the app can:

- compute category meters quickly,
- show transaction history without calling Plaid every time,
- preserve match/correction history,
- track unmatched spend,
- support agent questions and actions,
- recover from provider category changes,
- keep app-control decisions tied to current category state.

Projection layers:

- `ProviderConnection`: institution/item metadata and server-side access-token reference.
- `ProviderSyncState`: cursor, last sync time, health.
- `ProviderTransaction`: optional raw/lossless provider payload for backend audit/debug.
- `NormalizedTransaction`: Kwilt-readable transaction row.
- `AssignmentSuggestion`: inferred relationship to a category.
- `TransactionAssignment`: confirmed user/product relationship to a category.
- `MatchingRule`: learned future behavior.
- `MeterLedgerEntry`: confirmed spend used by category meters.

Client devices may cache this projection locally for speed/offline read, but the durable source should be server/account-backed. Plaid access tokens never belong in client storage.

## Correction model

The source transaction should remain intact. The user edits Kwilt's interpretation:

- move to another budget,
- remove from this budget,
- exclude from budgets,
- create a rule for similar transactions.

After a correction, Kwilt may ask:

> Apply this to similar transactions?

For V1, "similar" should start with merchant/account matches before broad category rules.

## App control model

App controls are optional support for a budget, not the budget itself.

The control should support modes:

- **Review before opening**: the selected app waits behind a budget review every time.
- **Review when running hot**: the app opens normally while the budget is healthy, then asks for review when pace/spend is high.
- **Pause when maxed out**: the app stays unavailable once the budget is fully used unless the user explicitly changes the budget/rule.

User-facing copy examples:

> Before Amazon opens, show Shopping. If you review it, Amazon opens for 15 minutes.

> If Shopping is maxed out, Amazon stays paused until next month or until you change this rule.

This should still be framed as a chosen support mechanism, not punishment. The user owns the rule and can turn it off.

V1 can simulate this locally before native FamilyControls is wired.

## V1 build slice

Build a local, fixture-backed version first:

- one home screen with runway chart and budget rows,
- create-budget screen,
- budget detail with suggested/confirmed transaction matches,
- correction flow with apply-to-similar preview,
- optional app-control summary,
- review screen loading the selected budget.

Plaid and FamilyControls should plug into seams after the product loop feels right.
