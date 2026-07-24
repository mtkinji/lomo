---
id: brief-budget-unlock-bottom-guide
title: Budget Unlock Bottom Guide
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
job_step: choose-intentional-access
serves: [jtbd-put-intention-before-impulse, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life, jtbd-review-budget-reality-before-spending]
related_briefs: [brief-budget-app-unlock-review, brief-screen-time-controls]
owner: andrew
last_updated: 2026-07-09
source_repo: mtkinji/kwilt-budget
source_sha: df383c3ac1538dff0a83b43a21ff3e45c024298b
---

> **Money source note:** Promoted from frozen standalone Money product documentation. Preserve its product reasoning, but verify route, implementation, delivery, and release claims against `src/capabilities/money/` and current runtime evidence.

# Budget Unlock Bottom Guide

## Context
The active app-pause affordance on Budget Detail has moved from a large card toward a compact item. The next product bet is that the right grammar is not an inline item at all: it is a Kwilt-style bottom guide, similar to the main Kwilt "Plan your day" guide.

The budget page should stay about budget reality. The app-pause guide should float near the decision point.

## Job Delivery
- Job: `review-budget-reality-before-spending`
- Step: `choose-intentional-access`
- Current score: 3
- Expected delivery change: 3 -> 3 for visual hierarchy alone; do not raise until the signed-device Screen Time path still proves Open for now vs Keep blocked.
- Evidence required: simulator screenshots of active guide, open receipt, and keep-blocked receipt on Budget Detail; later signed-device proof of native shield behavior.
- Map update trigger: after the guide is implemented and real Screen Time behavior remains verified.

## Product Decision
Use a bottom guide for active app-pause unlock tasks.

Canonical active guide:

```text
Amazon is paused
Shopping at 90%.

Keep blocked      Open Amazon
```

Canonical open receipt:

```text
Amazon is open
Open for 20 min.
```

Canonical blocked receipt:

```text
Amazon stays blocked
Choice saved.
```

## UX Rules
- Budget Detail renders the meter and chart as normal page content.
- The guide appears only for an active unlock task.
- The inline unlock dock is not shown at the same time.
- `Keep blocked` is text in the first release, not only an X icon.
- Dismissing the guide does not record `left_blocked`.
- The guide should be non-blocking or feel non-blocking; avoid a heavy modal scrim.
- The guide must leave enough bottom padding so chart/activity content is not hidden.

## System Direction
Kwilt Money's current `BottomDrawer` is not the right primitive as-is:
- It renders in a modal.
- It uses a scrim.
- It has a 280px minimum height.
- It blocks the canvas.

Preferred implementation:
- Add a small Money-local `BudgetBottomGuide`, or extend `BottomDrawer` with a non-blocking inline/dynamic mode.
- Borrow the behavior contract from main Kwilt `BottomGuide`: lightweight, page-level, bottom-hugging, optional dismissal, and no blocking backdrop.
- Keep the same `BudgetReviewEvent` and Screen Time reconciliation semantics.

## Acceptance Criteria
- Active unlock route shows a bottom guide instead of the inline dock.
- Guide copy fits on iPhone 17 Pro and smaller iPhone widths.
- `Open Amazon` records `opened_for_now`.
- `Keep blocked` records `left_blocked`.
- Dismiss/swipe does not record an outcome.
- Receipt state appears after either explicit action.
- Chart remains visible and visually primary with the guide present.
- No guide appears when there is no active unlock task.
- `npm run lint` passes.
- Simulator screenshot proves the hierarchy.

## Spec Refinement
Clear enough to build:
- The guide replaces only the active unlock dock.
- Copy and actions are defined.
- Domain behavior is unchanged.

Assumptions:
- Local page-visit dismissal is enough for the first slice.
- The first implementation does not need a persistent "do not show this again" preference.
- A Money-local guide wrapper is acceptable even though main Kwilt already has a richer guide primitive.

Needs user review after simulator proof:
- Whether the guide should use a light scrim, no scrim, or a barely visible canvas fade.
- Whether `Keep blocked` should remain a text button permanently or collapse later.
- Whether the guide should minimize after swipe or disappear for the visit.
