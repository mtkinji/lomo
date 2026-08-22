---
id: brief-budget-settings
title: Canonical Budget Settings
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
serves: [jtbd-review-budget-reality-before-spending, jtbd-trust-this-app-with-my-life]
related_briefs: [settings-surface-grammar, auto-budget-from-living-target, governed-household-money-plan]
owner: andrew
last_updated: 2026-08-21
---

# Canonical Budget Settings

## Context

Budget's ellipsis opened a narrow Money plan editor while global Settings exposed only privacy and household rows. The ownership model made durable Budget configuration unpredictable.

## Target audience

Aspirational family organizers need useful defaults and occasional maintenance without operating a finance system.

## Representative persona

Maya wants one place to change how the household budget works, then return to the current money decision.

## Aspirational design challenge

How might we help Maya maintain the household budget from one predictable place, while preserving useful defaults and category-level ownership?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` - Budget maintenance supports household priorities rather than becoming an end in itself.

## Job flow step

Establish plan and categories (4/5). Current controls are real, but global ownership and additive recovery are fragmented.

## JTBD framing

When Maya needs to change how the budget works, she wants one predictable settings page so she can preserve trustworthy money behavior without becoming a finance administrator.

## Design

- Main Settings contains one Money-section row titled `Budget`.
- Budget's ellipsis `Settings` action opens the same `SettingsBudget` route.
- Existing Money plan controls are composed directly into the Budget page.
- Category maintenance offers `Restore default categories` with confirmation.
- Restoration adds only missing canonical categories and plans. It preserves active custom categories, names, amounts, ordering, transaction assignments, and plan history.
- The page links to Privacy lock and Household access.
- Category-specific controls remain on category settings.

## UI contract

- Job: maintain durable Budget behavior without leaving the global settings model.
- Authority chain: explicit user direction -> Kwilt Settings grammar -> local Money persistence -> native conventions.
- Three-second read: Budget, then plan, categories, privacy and access.
- Primary action: none persistent; settings rows are peer maintenance actions.
- Reveal later: confirmation and result detail for restoring defaults.
- Scan order: title -> plan -> categories -> privacy/access -> history.
- Must not add: dashboard stats, destructive reset, bulk editor, duplicate Money plan destination.
- Reuse map: `SettingsPage`, `SettingsGroup`, `SettingsRow`, `SettingsDivider`, `Input`, `Button`, and existing Money plan services.
- Required states: loading, signed out, save pending, restore pending, restored, already complete, and error.
- Proof path: Settings > Budget and Budget > ellipsis > Settings on iPhone 17 Pro Simulator.

## Success signal

Both entry points open the same page, existing plan controls still work, and restoring defaults produces only missing canonical categories.

## Open questions

None for the first slice. A full category inventory remains deferred until a concrete management job requires it.

## Spec refinement

The restore operation must be an owner-scoped `security invoker` RPC and return an explicit created-category count. Automated tests must cover all-missing, partially missing, equivalent-tag-present, and already-complete sets. Native runtime proof is required before calling the UI complete.
