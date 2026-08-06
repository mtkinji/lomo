---
id: brief-money-category-ordering
title: Money Category Ordering
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
serves: [jtbd-review-budget-reality-before-spending, jtbd-trust-this-app-with-my-life]
related_briefs: [governed-household-money-plan, category-budget-planning]
owner: andrew
last_updated: 2026-08-04
---

# Money Category Ordering

## Context

Money categories already have a stable `sort_order`, but the integrated app has no user-facing or atomic way to change it. The Summary grid therefore reflects starter/database order rather than household attention.

## Target audience

Aspirational family organizers need the few spending areas they check most often to be easy to find without maintaining a finance taxonomy.

## Representative persona

Maya wants Housing, Groceries, or another currently important category to appear first without changing the plan itself.

## Aspirational design challenge

How might we help Maya put the household categories she checks first at the top of Money, while preserving calm scanning, month paging, and authoritative plan truth?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — the visual sequence should help the few relevant areas land first.

## Job flow step

Step 5 of `job-flow-maya-review-budget-reality-before-spending`, currently scored 3: Summary shows relevant reality, but the household cannot control which category is easiest to see.

## JTBD framing

When Maya reviews household Money, she wants the categories that matter most to appear first so she can understand relevant reality quickly and trust that Kwilt preserves her explicit choice.

## Design

Add `Reorder categories` to Summary's existing View menu. It opens a single-header bottom drawer containing a full-width draggable list. The drawer uses existing drag infrastructure and provides VoiceOver Move up/Move down actions. Done sends the complete active-category ID sequence to an owner-scoped atomic RPC. The drawer may show the optimistic sequence immediately, but success is announced only after the RPC confirms the exact set. On failure it preserves the local sequence and keeps the drawer open with a readable recovery message.

The saved order is the one sequence used by Summary, transaction category pickers, split allocation, and future category inventories. New categories append after the highest active `sort_order`. This release does not add groups, pins, per-month order, hidden categories, or AI ranking.

## Success signal

A category moved to first position remains first after refresh and relaunch, appears first in Summary and category pickers, and no category, plan, or transaction data changes besides `sort_order`.

## Spec refinement

- The client submits every active category ID exactly once; the server rejects missing, duplicate, foreign, or inactive IDs.
- The server locks the owner's active category rows and rewrites contiguous zero-based `sort_order` values in one transaction.
- No write occurs when the order is unchanged.
- Accessibility actions are required, not deferred.
- Direct grid dragging and category groups are explicitly deferred.

## Open questions

None for the accepted learning release.
