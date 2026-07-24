# Frame: Category Budget Planning

## What the user said
> So what job might this do that this category's settings page can't? Is it even needed at all?

## Restated in user voice
When Maya is looking at a category, she wants to know whether she is maintaining category behavior or changing the household spending plan, so that a small edit does not quietly break the living target she chose.

## Target audience
`audience-aspirational-family-organizers`: households trying to become more organized without adopting a finance or productivity methodology.

## Representative persona
Maya is a parent or household lead who wants calm support for ordinary family decisions.

- Current situation: she is using category meters to keep household spending aligned with intent.
- What she's trying to do: keep the plan truthful without turning every category into a finance project.
- Emotional state or tension: she wants control, but distrusts hidden math and duplicate settings.
- What would make this feel wrong: a drawer that looks fast but changes important plan assumptions without explaining the effect.

## Hero anchor
`jtbd-carry-intentions-into-action` - help me carry intentions into trusted follow-through without managing every step myself.

## Job flow step
`see-budget-reality`: Budget Detail already shows percent, dollars, pace, and projection. The gap is that category limits are not yet visibly tied to the living target or adjustment consequences.

## Active anchors
- `jtbd-carry-intentions-into-action` - budget amounts should carry the living target into category-level decisions.
- `jtbd-trust-this-app-with-my-life` - money edits must be transparent and reversible.
- `jtbd-review-budget-reality-before-spending` - category reality should stay legible before spending decisions.

## Friction we're addressing
The quick-edit drawer duplicates the newer Category settings page while doing a more important job poorly. Naming is a maintenance setting. Amount adjustment is a planning/allocation decision. Combining both in a generic drawer makes neither job clear.

## System alignment
Constraint posture: `Fit the system`

Current system facts:
- Existing surface: Budget Detail has an object page and an overflow row into Category settings.
- Existing user flow: Category settings owns rollovers, forecast source, and Screen Time controls.
- Existing domain/data model: category budgets have name, budget cents, rollover flags, forecast fields, and app-control policies.
- Existing technical affordances: `updateBudget` can persist local category changes; the future living-plan model is documented but not built.
- Existing UX/copy conventions: settings pages are grouped, quiet maintenance surfaces; Budget Detail is the primary inspection and decision surface.

Constraints to preserve:
- Keep Category settings as the maintenance surface.
- Keep Budget Detail focused on current reality and action.
- Do not invent a new planning model until living-target allocation is real enough to explain.

Constraints we may challenge:
- The title edit affordance should not open a drawer if the drawer does not own a distinct job.

Design implication:
Retire the quick-edit drawer. Route category maintenance to Category settings. Plan a separate amount-adjustment flow for allocation once it can show source, target impact, and rebalancing.

## Aspirational design challenge
How might we help Maya distinguish maintenance edits from household plan changes, while preserving a calm Category settings grammar and a trustworthy Budget Detail moment?

## Out of scope
Full MonthlyLivingPlan domain implementation, automatic rebalance math, and production analytics.

## Open question
What minimum amount-planning evidence is enough before we add an `Adjust amount` action from Budget Detail?
