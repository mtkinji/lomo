# Money Global Destinations and Standalone Parity

## Authoritative correction

The integration contract is:

- Preserve the Kwilt Option G shell.
- Expose Summary, Transactions, and Accounts as direct global capability-nav destinations
  under Money. They share one Money capability/data/lifecycle owner.
- Remove the standalone Money bottom navigation. Do not replace it with another local nav.
- Preserve the carefully curated standalone Summary, Transactions, Accounts, Settings, and
  widget presentations and behavior inside the Kwilt host.

## Reductive UI gate

Primary job: review money reality before spending.

Primary action: open a category, transaction, or account to inspect the evidence and act.

Must show:

- Summary: standalone header, month arrows/swipe pager, add action, two-column radial category
  meters, total/projection/freshness receipts.
- Transactions: date/filter/sort control group, visible/total count, sync action/freshness,
  grouped compact transaction inventory, assignment state, and amount.
- Accounts: filter/sort control group, visible/total count, refresh/connect actions,
  freshness, and compact account inventory rows.
- Settings: the Money `shellAlt` background, grouped cards, row/divider/toggle grammar.
- Widgets: configurable small one-category and medium two-category radial meters using the
  same meter geometry and deep links as standalone Money.
- Category detail: selected-month navigation; the page-native meter and forecast explanation;
  recent activity with a five-row limit and view-all path; quiet secondary statistics;
  contextual edit, rollover, and app-control actions; and transaction review without leaving
  the category context.
- Transaction detail: date/amount hierarchy; payment-source receipt and original provider
  description; one compact category field; category search/create and inflow-meaning choices
  in the standard drawer; and an explicit exact/partial merchant-rule follow-up.

Must not show:

- a Money-local place bar or bottom tab bar;
- a replacement Summary hero/forecast-card dashboard;
- generic rounded-card transaction or account stacks;
- a generic aggregate progress widget.
- a shared generic category/transaction detail form or a ledger-first category page.

## Detail UI contract

### Category detail

Job: When Maya opens a category from Summary, she needs to understand this month's actual,
planned, and likely position and inspect the evidence, so she can decide whether to spend,
correct a transaction, or adjust the plan.

Primary action: inspect or correct recent activity.

Must show: category identity, selected month, live meter, spent/left/limit, forecast basis and
range, current-month activity, transaction count, rollover truth, and freshness/error state.

Reveal later: forecast settings, category name/monthly amount/rollover settings, Screen Time
policy, and full transaction inventory.

Must not add: a second category title, a large enclosing dashboard card, a separate reports
surface, or a generic settings form as the page's primary composition.

Reuse map: `MoneyCategoryMeterTile` geometry for the large meter; `BottomDrawer` for forecast,
category, and transaction review; `MoneyInventoryListFrame` row grammar for activity; host
`PageHeader`, tokens, inputs, and buttons for shell-owned behavior.

Required states: loading, unavailable, current/previous/future month, no activity, refresh
error with known-good data, saving, and mutation error.

Proof path: Summary -> category tile -> detail -> previous month -> transaction -> correction
-> Back, plus the `kwilt://money/category/:categoryId` deep link.

### Transaction detail

Job: When Maya opens a transaction, she needs to identify the charge or inflow and correct its
meaning once, so every Money surface reflects the same decision.

Primary action: choose or change its category/meaning.

Must show: merchant/display name, date, amount, pending/reviewed state, original description,
institution/account receipt, current category/meaning, and persistence errors.

Reveal later: searchable category choices, create-category fields, inflow meaning choices,
and the exact/partial future-match rule preview.

Must not add: an always-expanded list of every category or expose provider implementation
language as the primary explanation.

Reuse map: host `BottomDrawer`; standalone payment-source receipt, category-field, picker,
and rule-builder compositions; capability-owned snapshot and mutation paths.

Required states: loading, unavailable, assigned/unassigned/not-counted, inflow/outflow,
pending, saving, create-category, rule follow-up, and mutation error.

Proof path: Transactions -> row -> category drawer -> selection -> optional merchant rule ->
Back with corrected row, plus category activity -> transaction detail and the direct deep link.

## Reuse map

The frozen standalone source at `/Users/andrewwatanabe/Documents/Kwilt Budget` is the
presentation and behavior source:

- `app/(tabs)/index.tsx` and `src/components/category-meter-tile.tsx`
- `app/(tabs)/transactions.tsx`, `src/components/inventory-list-frame.tsx`, and
  `src/components/transaction-match-row.tsx`
- `app/(tabs)/accounts.tsx`
- `src/ui/settings-surface.tsx` and `src/theme/colors.ts`
- `plugins/withBudgetWidgets.js`

Host navigation, auth, data ownership, deep-link parsing, privacy gates, native target, and
mutation receipts stay host/capability owned.

## Remaining frozen-route reconciliation

The detail audit also rechecked every non-collection route in the frozen manifest:

- `budgets/new` remains `MoneyCategoryCreate` and writes through the authoritative category
  RPC before replacing into the new category detail route.
- `app-control/[budgetId]` is split as intended: category amount/name/rollover/forecast stay in
  contextual detail drawers; app selection and pause policy stay in `MoneyAppControl` using
  the shared native Screen Time target.
- `review` is folded into category detail. A pending Money shield review shows the explicit
  open-for-20-minutes / keep-blocked decision and records the capability-owned receipt.
- `living-plan/[receiptId]` and the former Plan settings surface remain in
  `MoneyLivingPlanReceipt` and `MoneyLivingPlan`, using the shared settings grammar and
  versioned promotion/reversal writes.
- `screen-time-controls` and standalone `settings` remain intentionally split into contextual
  Money controls plus the one host Settings root; no duplicate global settings page returns.
- standalone Ask, Goals, Plan-tab, More, auth, and router roots remain retired because their
  accepted jobs are owned by unified Chat, Goals, the Money contextual flows, and the global
  capability shell.

## Proof

1. Unit-test owner/destination resolution and month projection.
2. Run `npm run verify:changed -- --run`.
3. Capture fresh signed-simulator screenshots for rail, Summary, Transactions, Accounts, and
   Settings and compare them with the standalone source/reference screenshots.
4. Build the combined widget extension and prove configuration, small/medium rendering,
   refresh, and deep links on a signed physical device.
5. Keep simulator, archive/App Thinning, physical-device, and TestFlight evidence separate.
