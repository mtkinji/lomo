# Native Money read-only implementation plan

**Goal:** Replace the Money capability placeholders with authenticated, read-only Summary, Transactions, Accounts, category detail, and transaction detail surfaces using Kwilt's existing session and Supabase client.

**Source contract:** Behavior is translated from standalone Money commit `df383c3ac1538dff0a83b43a21ff3e45c024298b`. Kwilt remains the owner of auth, routing, analytics, Settings, and the Supabase client.

## Slice 1: Read projection

- Add capability-owned read types and a pure snapshot projector.
- Query `budget_categories`, `budget_plans`, `budget_transactions`, `budget_financial_accounts`, and `budget_financial_connections` through `getSupabaseClient()`.
- Never provide fixture dollars or sample financial rows. Loading, empty, stale, and error states must say what is actually known.
- Retain a known-good snapshot when refresh fails.
- Cover category aliases, current-month totals, category credits, accounts with no transactions, freshness, and error retention with Jest.

## Slice 2: Native surfaces

- Mount one Money data provider at the nested navigator boundary.
- Build a current-month Summary with total plan/spend/remaining and category meters.
- Build filterable Transactions and Accounts inventories with exact navigation parameters.
- Build read-only category and transaction details.
- Keep connect/relink, transaction correction, category edits, rollover changes, and forecasting mutations out of this slice.

## Slice 3: Bounded Chat and activation

- Expose a redacted Money summary adapter to Unified Chat: aggregate values and counts only unless the user explicitly opens a native record.
- Add an exact native return target for categories and transactions.
- [x] Change Money from `preview` to `active` after the real-data UI and Chat boundary are tested and visually exercised.

## Verification

- Run focused repository, state, screen, navigation, registry, and Chat coverage tests.
- Run `npm run verify:changed -- --run`.
- [x] Exercise `kwilt://money`, Summary, Transactions, Accounts, and a live category detail in the iOS simulator using an authenticated account. Transaction-detail route parsing is automated; a direct transaction tap remains outside this run because desktop UI control was locked. Simulator proof does not establish physical-device, archive, TestFlight, or production-Plaid behavior.
