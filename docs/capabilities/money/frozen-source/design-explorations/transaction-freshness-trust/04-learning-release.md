# Learning Release: transaction-freshness-trust

## Concept To Build

Kwilt Money shows whether budget reality is fresh enough and lets the user check for new bank activity when recent spending seems missing.

## Capability Delta

Today, the user cannot:

- Tell whether missing recent activity is a filter issue, a stale sync, or normal bank delay.
- Trigger a bank activity check from Transactions or Accounts.
- See consistent freshness language across the surfaces that drive budget trust.

After this release, the user can:

- See compact freshness copy in Transactions, Summary, Accounts, and budget detail.
- Tap or pull `Check for new activity` on Transactions and Accounts.
- Receive clear result copy: new rows arrived, no new activity found, still checking, or unable to check.
- Understand when recent purchases may still be arriving.

Still intentionally not supported:

- Instant guaranteed transaction arrival.
- Scheduled/webhook sync reliability.
- Full connection repair.
- Paid refresh tiers.
- App-control rule changes based on freshness.

## User Experience

Transactions opens with the existing inventory controls and row list. Near the count, the surface shows a terse list-level timestamp such as `Last updated: 2 hr ago`. If the user expects a recent purchase, they can pull or tap `Check for new activity`. While checking, the surface says `Checking for new bank activity...`. Afterward it says either `No new activity found` or `New transactions arrived` and refreshes the list.

Accounts shows the same minimal recency per connection and remains the deeper place for connection health. Summary keeps pull-to-refresh for the latest Kwilt snapshot and shows a compact freshness boundary only when stale/unknown state affects trust. Budget detail inherits the same state so its meter does not look more authoritative than the data deserves.

## Existing Product Relationship

This enhances existing surfaces:

- Transactions remains the transaction inventory.
- Accounts remains the connection inventory.
- Summary remains budget reality.
- Budget detail remains category-specific evidence.

It does not replace transaction review, category assignment, Plaid Link, onboarding, or app-control setup.

## Buildable Slice

Must be real:

- Shared freshness classification from connected-spend metadata.
- User-facing sync invocation through the existing `sync-plaid-transactions` function.
- Result states for checking, success with new/modified rows, success with no new activity, stale/delayed, and failure.
- Transactions refresh action and minimal list-level freshness timestamp.
- Accounts refresh action and minimal per-connection freshness timestamp.
- Summary/budget-detail compact freshness boundary based on shared state.
- Tests for freshness classification and sync-result copy logic.

Can be thin or temporary:

- Manual refresh can target the latest or selected connection only.
- Summary can continue to refresh Kwilt DB snapshot rather than bank activity in the first slice if copy is explicit.
- Connection repair can route to Accounts without solving every provider failure.
- Analytics can be local/manual notes for the first pass.

Intentionally excluded:

- Scheduled Supabase cron.
- Plaid webhook endpoint.
- Widget refresh behavior.
- Screen Time/app-control freshness gating.
- Monetization.
- Merchant/amount analytics.

## Release Channel

`TestFlight build`

Rationale: this is a trust behavior tied to real connected accounts, native Plaid behavior, and realistic app-open moments. Local simulator proof is necessary but not sufficient; the useful learning comes from Andrew/Blaire using the installed app after real or realistic spending activity.

## Brand-Goodwill Guardrails

- Copy must be calm and factual, not defensive.
- Never say "real time" unless the product truly has real bank updates.
- Never imply a missing transaction is the user's fault.
- Keep provider details behind Accounts unless action is required.
- Show the last useful budget data with freshness boundaries rather than dropping into a blank failure state when possible.

## Reversibility

The release can be rolled back by hiding the refresh action and returning surfaces to read-only connected snapshots. The shared freshness model should remain safe even if only used internally. Avoid migrations that make transaction rows dependent on the new UI state.

## Permanent Product Threshold

Make this permanent when TestFlight use shows that users can correctly interpret delayed transactions, use refresh without expecting instant bank truth, and still trust budget meters after stale/no-new-activity states.
