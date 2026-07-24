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
last_updated: 2026-06-26
source_repo: mtkinji/kwilt-budget
source_sha: df383c3ac1538dff0a83b43a21ff3e45c024298b
---

> **Money source note:** Promoted from frozen standalone Money product documentation. Preserve its product reasoning, but verify route, implementation, delivery, and release claims against `src/capabilities/money/` and current runtime evidence.

# Accounts Inventory Shell

## Product Decision

Accounts is the standard object inventory for linked financial accounts in Kwilt Money. It owns connection setup, connection health, sync recency, and whether each account feeds budget lanes.

## Buildable Slice

- Add `Accounts` to bottom navigation.
- Add an Accounts tab route using the existing `KwiltPage` shell.
- Reuse the existing Plaid Link hook for the add action.
- Project fixture transactions into account inventory rows.
- Include view chips for `All`, `Linked`, and `Needs lane`.
- Include a sync action using the existing mock sync path.

## Acceptance Criteria

- Accounts appears in the main tab bar with an account-style icon.
- The page uses the Kwilt object inventory shell: header, local controls, count metadata, and repeated object rows.
- Account rows show label, connection health, last sync, linked budget lanes, transaction count, and recent activity.
- Add account invokes the existing Plaid Link start path.
- Sync updates the same provider sync state used elsewhere.
- The route typechecks with the existing `npm run lint` command.

## Spec Refinement

Clear enough to build as a shell. The deferred product decisions are account removal, Plaid repair, persisted account records, lane-assignment editing, and whether Budget should fully remove its current bank connection card after Accounts proves useful.
