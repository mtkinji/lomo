---
id: brief-accounts-inventory-shell
title: Accounts Inventory Shell
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: connect-spend-source
serves: [jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending]
related_briefs: [brief-plaid-transaction-backed-meter, brief-lane-gate-onboarding]
owner: andrew
last_updated: 2026-08-24
source_repo: mtkinji/kwilt-budget
source_sha: df383c3ac1538dff0a83b43a21ff3e45c024298b
---

> **Money source note:** Promoted from frozen standalone Money product documentation. Preserve its product reasoning, but verify route, implementation, delivery, and release claims against `src/capabilities/money/` and current runtime evidence.

# Accounts Inventory Shell

## Product Decision

Accounts is the standard object inventory for linked financial accounts in Kwilt Money. It owns connection setup, connection health, sync recency, and whether each account feeds budget lanes. Its durable management entry belongs in Settings, while Budget and other Money workflows may launch connection or recovery actions at the moment they are useful.

Accounts no longer appears in the global capability menu. The Settings route and Budget's contextual entry motions proved sufficient to keep management available without competing with recurring Money work.

## Buildable Slice

- Keep Accounts available as a capability-owned destination without a global capability-menu row.
- Add `Accounts` under Settings → Money, routing to the capability-owned inventory with a clear return to Settings.
- Give Budget one stateful header slot: connect another account at rest, report checking during pull-to-refresh, show a five-second `Just now` receipt after a successful connected-account sync, and preserve a tappable failure or stale status when attention is required.
- Add `Accounts & connections` to Budget's overflow menu and open a compact provenance drawer with connected-account count, freshness, direct connection, and account management.
- Reuse one connection orchestration path for Plaid handoff, Money reconciliation, safe errors, and cancellation.
- Return successful Budget-launched connections to the account-provenance drawer with a concise receipt.

## Acceptance Criteria

- Accounts is absent from the global capability menu.
- Settings → Money exposes `Accounts` and returns to Settings when opened there.
- Budget's non-pristine resting header exposes one compact `Connect` action that invokes the shared connection flow directly; pristine Money relies on its stronger empty-state action instead.
- Pull-to-refresh replaces the resting action with checking, success, or failure feedback. `Just now` appears only after connected-account reconciliation with provider sync completes and returns to `Connect` after five seconds.
- Existing stale or degraded Money evidence may temporarily outrank the resting connection action.
- Budget's overflow exposes `Accounts & connections` and opens the provenance drawer without requiring a trip through Settings or the inventory first.
- The page uses the Kwilt object inventory shell: header, local controls, count metadata, and repeated object rows.
- Account rows show label, connection health, last sync, linked budget lanes, transaction count, and recent activity.
- Every connection entry invokes the same native Plaid Link and post-link reconciliation path.
- Sync updates the same provider sync state used elsewhere.
- Focused interaction tests and the diff-aware completion gate pass.

## Spec Refinement

This remains a reversible learning slice. Account removal, Plaid repair, persisted account records, and lane-assignment editing remain deferred. Accounts has now moved out of the main capability menu because its moment-of-need, Budget, and Settings motions provide the intended access model.
