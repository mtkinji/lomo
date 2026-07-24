---
id: brief-settings-surface-grammar
title: Settings Surface Grammar
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: choose-intentional-access
serves: [jtbd-put-intention-before-impulse, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life]
related_briefs: []
owner: andrew
last_updated: 2026-07-08
source_repo: mtkinji/kwilt-budget
source_sha: df383c3ac1538dff0a83b43a21ff3e45c024298b
---

> **Money source note:** Promoted from frozen standalone Money product documentation. Preserve its product reasoning, but verify route, implementation, delivery, and release claims against `src/capabilities/money/` and current runtime evidence.

# Settings Surface Grammar

## Summary

Create a calmer, reusable settings grammar for Kwilt Money, proved first on category settings. The page should behave like a maintenance surface: grouped rows, quiet title, small helper text, and consistent toggles, while keeping the category-specific Screen Time sentence compact and editable.

## Job Delivery

- Job: `review-budget-reality-before-spending`
- Step: `choose-intentional-access`
- Current score: 1
- Expected delivery change: 1 -> 2 if the category settings surface makes app/category pause configuration legible and category-owned.
- Evidence required: simulator proof for Shopping with selected apps and Groceries with no inherited app pause rule.
- Map update trigger: after local simulator review confirms the settings grammar and app-pause ownership.

## User Problem

Maya is not trying to operate a finance dashboard. When she opens category settings, she wants to adjust behavior safely and get back to the budget moment. The current UI uses too much primary-page hierarchy for routine settings, so controls feel heavier and less predictable than they should.

## Product Bet

We're betting that a native-literate but Kwilt-warm settings grammar will make high-trust configuration feel calmer and more predictable. If it still feels heavy, we'll revisit by summarizing Screen Time trigger editing behind a row or drawer.

## Experience

- `Category settings` opens a page titled `{Category} settings`.
- The page uses a muted settings canvas and grouped white controls.
- Budget Plan includes a rollover toggle.
- Forecast appears as a settings row that can lead to forecast configuration.
- Screen Time Controls appears as a settings group. For categories with app-pause rules, it includes a compact sentence field and trigger rows. For categories without rules, it states that no app pause rule exists.
- Helper text explains consequences below groups rather than making every row a card.

## Design Rules

- Use settings pages for behavior, permissions, defaults, and category configuration.
- Use object pages for primary inspection and decision moments.
- Use cards for content objects, repeated inventory items, summaries, modals, and framed tools.
- Use grouped rows for settings.
- Use section labels only when they aid scanning.
- Use 16-17pt regular row labels with secondary value/helper text in smaller gray type.
- Use one toggle style across Kwilt and Kwilt Money.
- Keep sentence-form controls compact inside settings surfaces.

## Build Scope

Included:

- Local Budget settings primitives if needed.
- Category settings page restyling.
- Rollover toggle remains real and persisted.
- Screen Time controls use compact grouped styling.
- Forecast source is represented as a settings row.

Excluded:

- Full main-Kwilt settings migration.
- Shared package extraction.
- New analytics.
- New domain model changes beyond existing settings persistence.

## Spec Refinement

Implementation should prove the grammar locally before broad reuse. The smallest buildable version can define local components in `app/app-control/[budgetId].tsx`: `SettingsGroup`, `SettingsRow`, `SettingsToggle`, and helper text. If the rendered page feels right, extract later.

Acceptance criteria:

- Header reads `{Category} settings` with settings-level hierarchy, not object-page hierarchy.
- Page uses grouped settings rows instead of one card per setting.
- Rollover is visible and persists when toggled.
- Forecast source is visible as a settings row.
- Shopping shows compact Screen Time app-pause controls.
- Groceries does not show Shopping's selected app/category targets.
- `npm run lint -- --pretty false` passes.
- Simulator screenshots are captured for at least Shopping and Groceries.
