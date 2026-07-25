---
id: brief-transaction-truth-to-five
title: Transaction Truth To Five
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: match-transactions-to-lane
serves: [jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending]
related_briefs: [brief-transaction-rule-truth, brief-transaction-inventory-date-scope]
owner: andrew
last_updated: 2026-07-25
---

# Transaction Truth To Five

## Decision

Preserve unified Money's single-category path and add explicit atomic allocations for genuinely mixed posted outflows. Keep one bank event and one transaction row; every category meter receives only its allocation.

## Acceptance criteria

- Pure validation rejects pending, inflow, duplicate, non-positive, under-, and over-allocated splits.
- $184.96 can persist as $140.00 plus $44.96 against canonical source category IDs.
- Summary, category detail, forecast inputs, needs-review, and outside-plan totals reconcile exactly.
- Saved detail lists each allocation while Transactions retains one row.
- Assigning one category or `Not counted` later clears allocations atomically and clears incompatible prior meaning.
- RLS and RPCs enforce owner, active-category, posted-outflow, unique-category, and exact-sum truth.
- Authenticated save, reload/refetch, reversal, TestFlight, statement-cycle, and representative-household evidence govern score changes.

## Exclusions

Receipt capture, automatic item inference, recurring split rules, percentage allocation, a new dashboard, and merchant-level analytics.

## Score contract

Current: 4, medium-high confidence. Authenticated simulator save, terminate/relaunch,
refetch, correction, reversal, database reconciliation, and cross-surface proof now
show that the job step is strongly supported. Five still requires an installed
TestFlight build plus repeated statement-cycle and representative-household use
showing that the workflow stays easy and trustworthy outside the development loop.

## Evidence

- 2026-07-25: five distinct authenticated posted outflows were split across two
  canonical categories, persisted atomically, terminated/relaunched, and
  reconciled to their exact source amounts. Merchant and account identifiers
  are intentionally omitted from this evidence.
- The saved receipt survived app termination and authenticated reload/refetch.
- Transactions retained one bank row while both category detail surfaces and
  Summary received only their allocated shares.
- A correction replaced one allocation category and persisted after relaunch.
- Reversal to `Not counted` atomically removed allocations; the intended split
  was then restored and reconciled in the database.
- Four temporary five-merchant samples were restored to their exact prior
  unreviewed state after readback; the deliberate mixed-purchase split remains.
- Six focused suites passed 48 tests; the full repository suite passed 293 suites
  and 2,035 tests. App and test typechecks, product lint, architecture lint,
  whitespace checks, and all four Maestro flow syntax checks passed.
- `verify:changed` reaches an unrelated Unified Chat compatibility-fixture drift
  that reproduces on a detached `origin/main` checkout.
- No TestFlight build was started; release proof is intentionally paused.

## Remaining proof for five

- Build and submit unified Kwilt with this implementation to TestFlight.
- Install that exact build on a signed physical device and repeat save, relaunch,
  correction, reversal, and cross-surface reconciliation.
- Observe the behavior through a statement cycle and representative household
  use, including whether splitting stays understandable without finance admin.
