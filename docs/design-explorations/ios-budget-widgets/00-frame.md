# Frame: ios-budget-widgets

## What the user said

> Simply having a % counter was enough to help me improve/control AI spend. Kwilt will eventually have a unifying desktop application across the suite of tools and this feature can be part of that, but for now I want to consider the use of iOS widgets to achieve the same effect.

## Restated in user voice

When I am near a spending choice, I want the current budget reality to be visible without opening a finance app, so that the number changes my behavior before the impulse becomes a purchase.

## Target audience

`audience-aspirational-family-organizers` - households trying to become more organized without adopting a productivity methodology.

## Representative persona

Maya: a parent or household lead who wants calm support for ordinary family decisions.

- Current situation: She has a few spending lanes that drift because purchases happen in small, easy moments.
- What she's trying to become/do: Keep household resources visible enough that family decisions stay intentional.
- Emotional state or tension: She does not want a dashboard chore, but she does want a number that gently changes behavior.
- What would make this feel wrong to her: A widget that shames her, asks her to manage categories, or pretends stale data is real-time truth.

## Hero anchor

`jtbd-put-intention-before-impulse` - help me put a meaningful action before the apps I drift into.

## Job flow step

From `job-flow-maya-review-budget-reality-before-spending`:

- Step 3: See the relevant lane meter before opening a connected app.
- Step 4: Understand the spend reality in plain language: percent used, remaining runway, and pace.
- Current delivery: the app can show this in the home/review screen, but it is not ambient outside the app.
- Gap: the user has to remember to open Kwilt Money; aispendtracker showed that an always-near percentage can change behavior with far less ceremony.

## Active anchors

- `jtbd-put-intention-before-impulse` - the widget should place spend reality in the path of an impulse.
- `jtbd-carry-intentions-into-action` - the chosen budget lane should follow the user into ordinary phone use.
- `jtbd-trust-this-app-with-my-life` - widget data must be transparent, fresh enough, reversible, and non-invasive.
- `jtbd-review-budget-reality-before-spending` - provisional local sub-job for the budget-specific version.

## Friction we're addressing

Opening a budget app is already a decision. The insight from aispendtracker is that a small percent counter can work because it removes that decision and lets the meter sit in the user's peripheral vision. For Kwilt Money, the missing behavior is not deeper analysis; it is a nearby, trustworthy budget glance.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: mobile home runway, budget rows, budget detail, and review/app-gate surfaces.
- Existing user flow: create or view a budget lane, see percent used / remaining / pace, optionally review before spending.
- Existing domain/data model: `BudgetLane`, `BudgetMeter`, `BudgetStatus`, period progress, spent/remaining labels, projected overage.
- Existing technical affordances: Expo app with native iOS project checked in; no widget extension currently exists.
- Existing UX/copy conventions: calm household resource language, direct state labels, no shame, no finance-dashboard sprawl.
- Platform fact: WidgetKit widgets are timeline-backed glance surfaces with system-mediated refresh, not always-live counters.

Constraints to preserve:

- The budget lane remains the user-facing object, not provider category.
- Widget output should be derived from the same meter model as the app.
- The first version should work for one or a few chosen lanes, not every possible budget.
- Stale or fixture-backed data must be labeled honestly.

Constraints we may challenge:

- The app-first assumption: for this job, the best first touch may be outside the app.
- The review-gate-first wedge: widgets may validate the meter value before Screen Time gating is fully wired.

Design implication:

This should be framed as an ambient budget meter, not a miniature budget app. The widget's job is to keep the useful number visible and route the user into the full app only when they need detail, correction, or action.

## Aspirational design challenge

How might we help Maya keep one important budget lane visible before spending moments, while preserving Kwilt's calm, user-owned, non-dashboard product language?

## Out of scope

- Full desktop app implementation.
- Real-time tick-by-tick spend updates.
- Household member widgets.
- Full widget configuration for every possible budget.
- Bank sync reliability work beyond what the current meter already supports.

## Open question

Should the first learning release use a home-screen widget, a lock-screen widget, or both?
