---
id: brief-transaction-freshness-trust
title: Transaction Freshness Trust
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: connect-spend-source
serves: [jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending, jtbd-carry-intentions-into-action]
related_briefs: [brief-accounts-inventory-shell, brief-transaction-inventory-date-scope, brief-prediction-trust-contract]
owner: andrew
last_updated: 2026-08-17
source_repo: mtkinji/kwilt-budget
source_sha: df383c3ac1538dff0a83b43a21ff3e45c024298b
---

> **Money source note:** Promoted from frozen standalone Money product documentation. Preserve its product reasoning, but verify route, implementation, delivery, and release claims against `src/capabilities/money/` and current runtime evidence.

# Transaction Freshness Trust

## Product Decision

Kwilt Money needs a shared transaction freshness contract. User-facing budget claims should distinguish latest Kwilt database truth from latest bank-check truth, and the user should have one calm way to check for new bank activity when recent spending seems missing.

## Job Delivery

- Job: `review-budget-reality-before-spending`
- Step: `connect-spend-source`
- Current score: 3.5
- Expected delivery change: 3.5 -> 4 if TestFlight verification proves users can understand bank-check recency, run a check for new activity, and keep trusting budget meters when no new rows arrive.
- Evidence required: connected account -> stale or missing recent transaction moment -> Check for new activity -> result copy -> refreshed Transactions/Summary state.
- Map update trigger: after runtime verification with connected spend in a TestFlight build.

## User Problem

When Maya knows she just spent money and opens Kwilt Money, a missing transaction makes the app feel untrustworthy. She does not care whether the technical gap is Plaid delay, sync cursor state, Supabase snapshot freshness, selected date scope, or connection health. She needs the app to answer: "Did Kwilt count this yet, and if not, what does that mean?"

## Pending Commitment Contract

An ordinary pending outflow is current household activity, not an exceptional
state Maya must interpret. Kwilt shows it, categorizes it, and includes it in
the current category and whole-plan answer immediately. Pending status remains
bank lifecycle metadata; it is not a category, review state, or reason to call
the purchase `Not counted`.

Pending inflows do not increase available money. Completed-period history and
forecast learning remain based on posted evidence, while current-period
exposure includes pending outflows. When a pending purchase posts, changes
amount, or disappears, Kwilt reconciles the provider inventory without counting
the same economic event twice.

Explicit user corrections, exclusions, splits, and merchant rules outrank
automated categorization. Kwilt does not infer or display `Temporary hold` from
merchant, amount, merchant type, or generic pending status. That treatment
requires an explicit transaction-level provider signal or a user-confirmed
designation. Neither signal exists in this implementation slice.

## User Experience

Transactions:

- Hydrates the last trustworthy, user-scoped Money snapshot from device storage before checking the network, so an ordinary return never replaces known transactions with a blocking loader.
- Keeps that inventory visible while the authoritative Kwilt snapshot refreshes in the background.
- Shows active date/filter scope and transaction count as it does now.
- Adds minimal list-level freshness copy near the inventory controls/count, such as `Last updated: 2 hr ago`.
- Provides `Check for new activity` for signed-in connected users.
- Shows result copy after checking: new transactions arrived, no new activity found, unable to check, or recent purchases may still be arriving.
- Keeps transaction-row metadata focused on category assignment or a
  consequential review state, plus merchant, amount, and date. Routine
  pending/posted status and source freshness do not appear on every row.

Accounts:

- Remains the deeper source of connection health.
- Shows bank-check recency per connection.
- Provides the same `Check for new activity` action.
- Shows any repair-needed state without exposing raw provider diagnostics.

Summary and budget detail:

- Continue showing budget reality.
- When bank-check state is stale, make one throttled foreground check automatically and keep the last useful answer visible while it runs.
- Qualify a retained answer with minimal freshness language; do not turn ordinary freshness into a card, warning, or user task.
- Reserve user involvement for a classified connection-repair condition and keep that repair in Accounts.
- Do not show stronger claims than the freshness state supports.

## Data And System Behavior

- Derive one shared freshness classification from connected-spend metadata.
- Preserve the distinction between Kwilt snapshot freshness and bank-sync freshness.
- Treat freshness as a property of the connected transaction inventory or budget snapshot, not of each immutable transaction row.
- Persist only an accepted projected Money snapshot, version its cache schema, scope it to the authenticated user, reject malformed cache documents, and clear the outgoing user's snapshot on sign-out or account switch.
- A cached snapshot may render transaction evidence but must not drive widgets or app-control enforcement until an authoritative server read succeeds.
- Treat row-level changes separately: pending transactions may settle, pending/posted duplicate handling may change visibility, and review/category state may change.
- Use the existing `sync-plaid-transactions` function for user-triggered checks.
- Budget may use the same function for one silent, throttled check when its current answer is stale.
- Throttle refresh attempts enough to avoid duplicate calls and provider/API abuse.
- Refresh the connected-spend snapshot after a successful or completed sync attempt.
- Keep last useful budget data visible when possible, with freshness/status copy.

## Copy Contract

Default steady-state copy should be extremely minimal:

- `Last updated: just now`
- `Last updated: 12 min ago`
- `Last updated: 2 hr ago`
- `Last updated: yesterday`

Use fuller copy only for action/result/error states:

Use:

- `Check for new activity`
- `Checking for new bank activity...`
- `No new activity found`
- `New transactions arrived`
- `Recent purchases may still be arriving.`

Avoid:

- `Real-time`
- `Instant`
- `Sync failed because Plaid...`
- `Your bank is wrong`
- `You need to reconnect` unless repair is actually required.

## Acceptance Criteria

- Transactions and Accounts expose a signed-in connected-user action to check for new activity.
- After one successful Money load, reopening Transactions renders the last trustworthy inventory without waiting for a network round trip.
- Cached inventory remains visible if the background refresh fails and is marked stale until an authoritative refresh succeeds.
- A different signed-in user can never hydrate the prior user's Money snapshot.
- Transactions shows freshness once at the inventory/list level, not on each transaction row.
- Refresh result copy distinguishes new rows, no new activity, failure, and delayed/stale states.
- Summary and budget detail can display a compact freshness boundary without clearing useful data.
- Summary does not ask the user to maintain ordinary transaction freshness.
- A stale Summary initiates at most one background check for the same plan version and last-sync receipt while mounted.
- The shared freshness model is covered by focused tests.
- Sync-result copy logic is covered by focused tests.
- No analytics or logs include merchant names, exact amounts, account masks, or raw provider payloads.
- A pending Amazon purchase assigned to Shopping appears as Shopping and reduces
  both current Shopping room and the current whole-plan answer immediately.
- A pending uncategorized outflow appears as `Needs review`, not `Not counted`.
- Pending inflows do not increase available money, and completed-period planning
  evidence remains posted-only.
- No surface displays `Temporary hold` without explicit transaction-level
  provider evidence or a user-confirmed designation.
- `npm run lint` and `npm run test:forecast` pass before TestFlight build.
- TestFlight verification confirms the installed app uses the deployed sync path.

## Exclusions

- Scheduled backend sync.
- Plaid webhook endpoint.
- Widget freshness behavior.
- Screen Time/app-control freshness gating.
- Plaid repair center.
- Monetization for refresh.
- Heuristic temporary-hold detection or copy.

## Spec Refinement

Clear enough to build with these assumptions:

- Transactions and Accounts retain manual checks, while Budget silently checks once when stale before any future scheduled/webhook sync exists.
- The action label should be `Check for new activity`, not `Refresh`, because it avoids promising instant bank truth.
- Accounts is the deeper health surface; Transactions and Summary should remain focused on budget reality.
- Freshness copy should appear only where it affects trust or interpretation, should be list/surface-level, and should default to a terse timestamp like `Last updated: 2 hr ago`.

Open implementation questions:

- What exact age buckets define `fresh`, `recent`, `stale`, and `unknown` for the first TestFlight release?
- Should Summary include bank-check action in the first slice, or only database snapshot refresh plus freshness copy?
- Should sync checks target the latest connection or all healthy connections for the signed-in user?

Deferred decisions:

- Whether to add scheduled sync or Plaid webhooks.
- Whether app-control conditions should be freshness-aware.
- Whether widgets need their own freshness SLA.
- Whether on-demand bank check has any future entitlement boundary.

## Completion Checklist

- Did this change affect the mapped job step? Yes, `connect-spend-source`.
- Did it add, remove, or materially alter a UX flow? Yes, it adds a user-triggered bank activity check and cross-surface freshness copy.
- Did it create evidence that should be added to `docs/job-delivery-map.yaml`? Only after runtime/TestFlight verification.
- Should friction or recommended next action change? Yes, if verification proves users can recover trust from missing recent transaction moments.
- Should the delivery score change, and what proof supports that? Move toward 4 only with installed-app evidence that refresh and freshness copy work against connected spend.
