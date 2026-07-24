---
id: feature-ios-budget-widgets
title: iOS Budget Widgets
status: concept-ready
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-put-intention-before-impulse
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: see-budget-reality
serves: [jtbd-put-intention-before-impulse, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending]
related_briefs: [brief-screen-time-controls]
exploration: docs/design-explorations/ios-budget-widgets
owner: andrew
last_updated: 2026-07-03
---

# iOS Budget Widgets

## Summary

Kwilt Money should test an integrated iOS widget system for custom budget lanes: Home Screen widgets, Lock Screen widgets, interactive review/app-control actions, reliable Plaid-backed freshness, and Screen Time/app-control state.

The concept comes from aispendtracker: a tiny percent counter was enough to help control AI spend because it made usage visible before the user had to go looking for it.

## User Problem

Budget apps usually require a deliberate check. The spending moment often happens faster than that. Maya needs the relevant budget reality to be visible close to ordinary phone use, without turning household budgeting into a dashboard habit.

## Chosen Concept

Start with the clock-inspired percent tile as the core unit, then support multiple pinned budget lanes across Home Screen and Lock Screen.

The widget shows:

- budget lane name,
- large `% used`,
- budget icon,
- perimeter progress ticks,
- calm pace/state color,
- freshness label.

Tapping the widget opens the relevant budget lane or review surface.

When a lane has an app-control rule, the widget can also expose the lightest safe interactive action, such as opening the review flow or recording the user's chosen review outcome through an AppIntent.

## Product Principles

- Ambient, not analytical.
- Percent-first, with dollars for grounding.
- Pace-aware, not only limit-aware.
- Fun and modern, borrowing the iOS clock-widget grammar of central value plus edge ticks.
- Honest about freshness.
- Reliable enough to trust: Plaid sync and app-control state must match the app.
- Useful before app open: Lock Screen matters for the first test.
- Multiple lane capable: custom budget categories are the product object.
- No transaction details on the widget.
- No shame copy.
- No mini-dashboard in V1.

## Learning Release

Release channel: local build, then TestFlight.

Build Home Screen and Lock Screen widgets backed by display-safe snapshots derived from `BudgetMeter`, with reliable Plaid sync and app-control state feeding those snapshots.

Must be real:

- WidgetKit extension.
- Shared widget snapshot storage.
- Multiple selected lanes.
- Central percent and tick-border rendering.
- Lock Screen accessory rendering.
- AppIntent-powered interactive action.
- Plaid Link/token exchange/cursor sync/webhook reliability.
- Background refresh path for keeping snapshots current.
- App-control and Screen Time state in snapshots.
- Deep link into the lane.
- Freshness copy.

Can be thin:

- Only one interactive action at first.
- One Lock Screen lane at first.
- Basic styling beyond the clock-inspired tile.

Excluded:

- Desktop menu-bar app.

## Acceptance Criteria

- A selected budget lane can produce a widget-safe snapshot.
- The widget renders the selected lane's percent used, remaining amount, pace state, and freshness.
- The active tick count reflects percent consumed and uses the lane's current state color.
- Multiple lanes can be pinned for widgets without showing transaction details.
- Lock Screen widget renders a display-safe lane state.
- Interactive widget action updates or routes through the same app-control/review model used in-app.
- Plaid webhooks/cursor sync update meters and widget snapshots within the stated freshness window.
- App-control/Screen Time state shown in the widget matches actual app behavior.
- Tapping the widget opens the relevant budget lane or safe fallback.
- Widget storage excludes transaction rows and merchant details.
- Stale or missing data is represented honestly.

## Spec Refinement

Implementation is not yet build-ready, but the first-test scope is no longer a tiny single-widget proof.

Decisions to confirm before coding:

- Which Home Screen and Lock Screen families ship first.
- Which single AppIntent action ships first.
- Whether tapping opens lane detail, the spend-review screen, or the app-control surface for gated lanes.
- Whether lane selection lives on budget detail, settings, or both.
- Which App Group identifier to use for shared widget storage.
- What freshness SLA is honest for Plaid-backed widget state.
- How Screen Time/App Control state is represented when authorization is missing or disabled.

Implementation risks:

- Expo/native project maintenance for a WidgetKit extension.
- Widget refresh behavior may make "updated just now" copy unreliable unless carefully controlled.
- Lock Screen privacy requires display-safe defaults.
- Interactive widget actions must not accidentally bypass user-owned app-control rules.
- Plaid webhooks, background refresh, and widget reloads need explicit failure states.
- Widget layout must stay useful without transaction-level explanation.

Verification evidence:

- Local iOS build installs with the widget extension.
- Widget renders non-placeholder data on a simulator or device.
- Lock Screen widget renders display-safe budget state.
- Interactive widget action routes or updates app-control state correctly.
- Plaid sync/webhook path recomputes a meter and refreshes widget snapshots.
- Screen Time/app-control state shown in widget matches app behavior.
- Deep link works from widget to app.
- Type/lint checks pass for the shared snapshot generation code.
- Manual visual check confirms text fits in the widget at supported sizes.
