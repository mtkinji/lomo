# Frame: budget-reality-gate

## What The User Said

> This app project needs a deep dive design loop to get the basic value unit landed. We need personas (preference is to use a shared persona catalog from Kwilt mobile), we need their JTBD (scaffolded into the app like we do with Kwilt Mobile), etc.

## Restated In User Voice

When I am about to open a spending app that can quietly push the household off
track, I want Kwilt Money to show me the live lane reality first, so the next
tap is intentional rather than automatic.

## Target Audience

`audience-aspirational-family-organizers`: households trying to become more
organized without adopting a productivity methodology.

## Representative Persona

Maya: a parent or household lead who wants calm support for ordinary family
follow-through.

- Current situation: family spending leaks through ordinary convenience apps, especially household extras.
- What she is trying to become/do: keep the household within chosen lanes without becoming a finance hobbyist.
- Emotional state or tension: she wants practical guardrails, but money and restrictions can easily feel shamey or controlling.
- What would make this feel wrong: dashboards, punishment, surveillance, hidden rules, or tuning a complicated budget system.

## Hero Anchor

`jtbd-move-the-few-things-that-matter` - Maya wants real progress on the ordinary commitments that keep family life moving.

## Job Flow Step

Local job flow: `job-flow-maya-review-budget-reality-before-spending`.

Underserved step: see the current lane meter and choose intentional access before a spend-triggering app opens.

Current offering: a hard-coded meter, review screen, and in-memory review event.

Delivery score: 2 overall. The interaction exists as a scaffold, but it is not yet a coherent value unit with setup, persistence, or actual Screen Time unlock.

Gap: the app needs to make the review moment feel like the product, not plumbing for a future blocker.

## Active Anchors

- `jtbd-put-intention-before-impulse` - the spending app should wait behind an intentional pause.
- `jtbd-carry-intentions-into-action` - the household budget intention needs help at the moment it would otherwise be forgotten.
- `jtbd-trust-this-app-with-my-life` - money plus app restrictions demand clear, reversible, humble behavior.
- `jtbd-review-budget-reality-before-spending` - provisional local sub-job for the app's first value unit.

## Friction We're Addressing

Traditional budget apps are retrospective. By the time a category report shows
the problem, the spending decision already happened. Kwilt Money's wedge is the
moment before the spend-triggering app opens: short, concrete, and close enough
to change behavior.

## System Alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: Expo app with a home meter screen, review screen, and settings tab.
- Existing user flow: open home, inspect the scaffolded lane, tap review before opening Amazon, record review.
- Existing domain/data model: `BudgetLane`, `BudgetMeter`, `AppGateTarget`, and `BudgetReviewEvent`.
- Existing technical affordances: local fixture repository, Supabase seam, future Screen Time seam, Expo Router.
- Existing UX/copy conventions: calm headline, concrete meter, "open for now" language, no shame copy.

Constraints to preserve:

- Use the shared Kwilt mobile persona and JTBD ids where possible.
- Keep capture/review user-owned; do not silently block or relabel behavior.
- Avoid finance-dashboard sprawl.
- Avoid punitive Screen Time framing.

Constraints we may challenge:

- A single hard-coded lane is acceptable for scaffold, but the real model needs user-owned lanes and app-to-lane mappings.
- The review screen needs a first-class "leave blocked" outcome, not only unlock.

Design implication:

The first value unit should be "one configured meter-to-app rule, one
intentional review," with persistence and a truthful access result. The product
model should allow multiple meters such as DoorDash, Amazon household, and
Amazon work, but the first learning slice should not expand into bank sync,
household sharing, category automation, or a full budgeting system yet.

## Aspirational Design Challenge

How might we help Maya put a calm budget-reality pause before spend-triggering
apps, while preserving Kwilt's trust, agency, and non-productivity-app voice?

## Out Of Scope

- Bank integrations and automatic transaction categorization.
- Shared household roles.
- Full multi-lane budget planning and optimization.
- Email summaries.
- Production App Store entitlement work beyond the first Screen Time seam.

## Open Question

Should the first test be a local/TestFlight self-use build with fixture-backed data, or a production-hidden slice backed by real Supabase rows?
