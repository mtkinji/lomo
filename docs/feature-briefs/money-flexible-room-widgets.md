---
id: brief-money-flexible-room-widgets
title: Money Flexible-Room Widgets
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
serves: [jtbd-review-budget-reality-before-spending, jtbd-put-intention-before-impulse, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-money-living-limit-answer, brief-ios-budget-widgets]
exploration: docs/design-explorations/money-widgets-flexible-room
owner: andrew
last_updated: 2026-07-31
---

# Money Flexible-Room Widgets

## Context

Managed Month now produces one exact flexible-money answer in Budget. Unified
Kwilt already writes a display-safe Money snapshot to its App Group, but its
WidgetKit extension does not render Money widgets and the snapshot contains
category percentages without the corresponding dollars-left or whole-plan
answer.

## Target audience

`audience-aspirational-family-organizers` — people who want household money to
remain visible without turning it into routine administration.

## Representative persona

Maya wants one calm spending boundary near the moment she might act. Sometimes
that boundary is the whole month's flexible money; sometimes it is one category.
She should not have to open Budget or translate a percentage to recover it.

## Aspirational design challenge

How might we help Maya see the exact whole-month or category spending room she
cares about from her Home Screen, while preserving one trustworthy Money
calculation and requiring almost no setup?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — carry household intentions into
ordinary life without making budget maintenance the goal.

## Job flow step

This improves Step 5 of
`job-flow-maya-review-budget-reality-before-spending`: exact whole-plan flexible
money first, with dollars left by category as a second-order guide. Delivery is
currently 3/5 because the in-app answer exists locally but unified Kwilt does
not render the corresponding Money widgets.

## JTBD framing

When Maya glances at her phone before or between spending decisions, she wants
the exact spending boundary she chose, so she can carry intention into action
without opening and interpreting Budget. The widget must strengthen trust by
using the same facts, freshness, and privacy behavior as Money.

## Design

Ship two optional `systemSmall` Home Screen widgets:

1. **Flexible Money** shows the exact Managed Month amount left or over, month,
   and quiet freshness. It requires no Money configuration and opens Budget.
2. **Budget Category** selects one category and one presentation through native
   WidgetKit configuration: `Dollars left` or `Percent used`. New instances
   default to dollars; existing percentage instances remain percentage. It
   opens category detail.

Both widgets use one display-safe App Group snapshot produced by the app. Swift
renders supplied facts; it does not recalculate financial meaning. The payload
may include exact display cents, category name/id, bounded percent/pace state,
calculation state, deep link, and timestamps. It must not include transactions,
merchants, accounts, or planning evidence.

Required states are supported amount left, over, stale, missing plan, category
removed, privacy disabled, App Group unavailable, and gallery placeholder.
Missing data never renders as zero. Stale data retains the exact supported
value and shows age. Privacy-disabled state removes previously stored Money
facts.

The release does not add an in-app widget manager, plan changes, transaction
review, alerts, purchase advice, medium/large families, Lock Screen widgets, or
interactive Money mutations.

## Spec refinement

- Widget kinds: preserve `KwiltWidgets.money` for Budget Category continuity;
  add `KwiltWidgets.money.flexible` for Flexible Money.
- Snapshot evolution is additive and optional so older extension/app builds can
  decode one another during local iteration.
- Category widget configuration uses a Money category `AppEntity` and a display
  `AppEnum`; an unavailable selected category renders `Choose a category` and
  never substitutes another.
- Flexible Money reads a widget-ready projection from
  `MoneyPlanLimitAnswer`; WidgetKit performs formatting only.
- Category dollars left uses the category projection's exact `remainingCents`;
  negative values render as an exact over amount.
- Freshness is derived from the App Group state's write timestamp. WidgetKit
  timeline refresh is opportunistic and never claims real-time behavior.
- Proof requires an Xcode workspace build and real Home Screen widget add/edit/
  tap behavior. Metro does not prove the extension.

## Acceptance criteria

- The TypeScript snapshot projection publishes exact whole-plan and category
  display facts without transaction, merchant, or account detail.
- Flexible Money and Budget show identical exact values and answer states for
  one snapshot.
- Category widget values match category detail facts.
- Native configuration selects category and dollars/percent per widget.
- New category widgets default to dollars.
- Both widget kinds render every required non-ideal state without invented `$0`.
- Privacy clearing removes Money data from the shared snapshot.
- Widget tap deep links reach Budget or selected category.
- The native extension builds, installs, appears in the widget gallery, and can
  be added and edited on the iPhone 17 Pro Simulator.

## Success signal

Users can add either widget without instruction, explain the value correctly,
observe exact parity after opening Budget, and keep at least one widget through
repeated ordinary use without mistaking its value for account balance.

## Open questions

None for the first local learning release. Medium and Lock Screen families are
separate later decisions.
