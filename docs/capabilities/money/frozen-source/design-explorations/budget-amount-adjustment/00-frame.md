# Frame: Budget Amount Adjustment

## What the user said
> I need a way to change the budget amount, this is a key feature and not available now. Setting a "good" budget number is a complex job that requires balancing spend relative to other categories - which might make it a candidate for global settings, not just category settings. We should explore that question.

## Restated in user voice
When Maya sees that a category amount is wrong, she wants to change it without accidentally breaking the household plan, so that the number feels owned, explainable, and still connected to the rest of the month.

## Target audience
`audience-aspirational-family-organizers`: households trying to become more organized without adopting a finance methodology.

## Representative persona
Maya is a parent or household lead who wants calm support for ordinary family decisions.

- Current situation: she has category meters, connected spending, and app-pause controls, but a wrong monthly amount can make every downstream signal feel suspect.
- What she's trying to do: make one category realistic while keeping the whole plan believable.
- Emotional state or tension: she wants control, but does not want to become the family's budget analyst.
- What would make this feel wrong: a plain dollar field that accepts a new amount without saying what moved, what stayed fixed, or whether the plan now exceeds the living target.

## Persona Empathy Statements
- "I am not trying to optimize every dollar. I just need this category to stop lying to me."
- "If I raise Housing, I need to know whether that uses buffer, pushes us over target, or means something else needs to come down."
- "A category setting should let me maintain the category. A plan change should explain the plan."
- "I might know the right number for one category, but I do not always know what that means for the whole month."
- "I trust the app more when it shows the consequence before it saves the change."
- "Sometimes I need a quick correction now, and sometimes I need a real rebalance conversation with myself."

## Hero anchor
`jtbd-carry-intentions-into-action` - help me carry intentions into trusted follow-through without managing every step myself.

## Job flow step
`see-budget-reality`: Budget Detail already shows category reality. The gap is that a wrong monthly amount cannot be corrected in a way that preserves trust in the rest of the plan.

## Active anchors
- `jtbd-carry-intentions-into-action` - category amounts should help the household plan carry into daily decisions.
- `jtbd-trust-this-app-with-my-life` - money edits must be transparent, reversible, and consequence-aware.
- `jtbd-review-budget-reality-before-spending` - the meter should stay believable before spending decisions.

## Friction we're addressing
The current settings page shows `Monthly amount` as context but offers no way to change it. That is honest about the missing target-backed planning flow, but it leaves the user stuck when the amount is plainly wrong. The product needs an affordance now, but the affordance should not teach users that budget amounts are isolated settings.

## System alignment
Constraint posture: `Extend the system`

Current system facts:
- Existing surface: `app/app-control/[budgetId].tsx` shows Category settings with `Budget Plan`, `Monthly amount`, rollovers, forecast, and Screen Time controls.
- Existing user flow: Budget Detail routes category maintenance into Category settings; forecast source still opens from detail through a drawer target.
- Existing domain/data model: category budgets have `budgetCents`, forecast settings, rollover settings, and Screen Time policy overrides. `MonthlyLivingPlan` is specified but not built as a first-class object.
- Existing technical affordances: category amounts can be stored, but target impact, allocation receipts, and reconciliation are not yet real enough to make automatic rebalancing truthful.
- Existing UX/copy conventions: settings pages are quiet grouped maintenance surfaces; Budget Detail is where current reality and action live. Copy should tell the truth, offer one useful next step, and avoid shame or finance-coach language.

Constraints to preserve:
- Category settings can show and initiate amount maintenance.
- Budget Detail should remain the primary reality surface.
- Kwilt should not silently rebalance user-edited categories.
- The first release must distinguish `this category amount` from `the whole living plan`.

Constraints we may challenge:
- The `Monthly amount` row may need to become an actionable row before the full global planning page exists.
- A category-owned entry point may open a plan-aware flow, not another settings page.

Design implication:
Treat amount editing as a contextual plan adjustment, not a global settings-only feature. The user should be able to start from the category number they are looking at, see the whole-plan consequence before saving, and optionally jump to a fuller plan review when the category change exposes a broader imbalance.

## Aspirational design challenge
How might we help Maya fix a wrong category amount from the place she notices it, while preserving trust that every saved amount still belongs to the household plan?

## Out of scope
Automatic plan rebalancing, multi-person household negotiation, and full `MonthlyLivingPlan` generation.

## Open question
What is the smallest true target-impact signal we can show before saving a category amount?
