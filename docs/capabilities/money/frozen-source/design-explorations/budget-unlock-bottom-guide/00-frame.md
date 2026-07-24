# Frame: budget-unlock-bottom-guide

## What the user said
> Hmm... now that I think about it, this would prob. be even better as a Kwilt Goals style bottom guide, the kind we use to pop the offer to plan your day.

## Restated in user voice
When Amazon is paused by Shopping, Maya wants the budget page to show the meter normally and offer one calm bottom choice, so she can decide whether to open the app without the pause card competing with the chart.

## Target audience
`audience-aspirational-family-organizers` - households trying to become more organized without adopting a productivity methodology.

## Representative persona
Maya: a parent or household lead who wants calm support for ordinary family spending decisions.

- Current situation: she hits a spend-triggering app and lands on the relevant budget detail.
- What she is trying to become/do: keep a household spending intention present at the exact moment impulse can take over.
- Emotional state or tension: slightly interrupted, not looking for a finance lesson.
- What would make this feel wrong to her: a big card that reads as a warning, a settings panel, or a punishment.

## Hero anchor
`jtbd-put-intention-before-impulse` - spending apps should wait behind a calm, chosen review.

## Job flow step
`choose-intentional-access` - Choose whether to open the spend-triggering app for now.

Current score: 3. The rehearsal traversal exists, but native Screen Time proof and a calmer first-viewport choice are still weak.

## Active anchors
- `jtbd-put-intention-before-impulse` - the blocked-app moment is the sharpest intention-before-impulse moment.
- `jtbd-carry-intentions-into-action` - the bottom guide turns a prior budget intention into a present choice.
- `jtbd-trust-this-app-with-my-life` - a money plus restriction surface needs to feel transparent, reversible, and non-shaming.
- `jtbd-review-budget-reality-before-spending` - local sub-job for seeing budget reality before spend-triggering access.

## Friction we're addressing
The inline dock solved wordiness, but it still steals vertical space from the chart. The chart is the budget reality; the app-pause choice should guide the user after they see that reality, not become another meter module.

## System alignment
Constraint posture: `Fit the system`

Current system facts:
- Existing surface: Budget Detail renders the hero image, meter, month selector, unlock dock, chart, and activity.
- Existing user flow: active app-pause context can route into Budget Detail with `unlockTarget` / target label state.
- Existing domain/data model: `BudgetReviewEvent` supports `opened_for_now` and `left_blocked`; Screen Time freshness treats open outcomes differently from stay-blocked outcomes.
- Existing technical affordances: Kwilt mobile has a `BottomGuide` used for `Plan your day`; Kwilt Money currently has `BottomDrawer`, but it is modal, scrimmed, and min-height 280px.
- Existing UX/copy conventions: "paused", "open for now", and "keep blocked" are acceptable; shame, permission, and parental-control language are not.

Constraints to preserve:
- Budget Detail remains the budget-reality surface.
- The user still gets two legitimate outcomes: open now or keep blocked.
- One visible reason is enough.
- The guide must not create a new settings surface or a new rule concept.

Constraints we may challenge:
- The unlock action does not need to live inline between the month selector and chart.
- Kwilt Money may need a small `BottomGuide` equivalent rather than reusing the existing modal `BottomDrawer` as-is.

Design implication:
Treat the app-pause affordance like a contextual guide, not a card. Let the chart keep the page's body, and let the bottom surface hold the decision.

## Aspirational design challenge
How might we help Maya choose intentional access from a paused app, while preserving Budget Detail as the budget-reality surface and making the choice feel like a calm guide instead of a warning card?

## Out of scope
- Changing Screen Time policy semantics.
- Building arbitrary app-pause rule logic.
- Adding recovery plans, coaching, or household approvals.
- Reworking the whole Budget Detail chart.

## Open question
Should the bottom guide auto-show only on deep-linked/active unlock tasks, or also when Budget Detail detects an active pause without a route source?
