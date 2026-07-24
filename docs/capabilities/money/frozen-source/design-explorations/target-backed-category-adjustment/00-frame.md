# Frame: Target-Backed Category Adjustment

## What the user said
> I am over budget, but the budget may never have been set correctly. I do not know what Shopping should be to meet my 70% living target, or how far off target I would be if I raised it from $200 to $400.

## Restated in user voice
When a category limit feels unrealistic, Maya wants help choosing a more believable amount and seeing exactly what that choice does to her living target, so that fixing one misleading meter does not quietly make the rest of the plan less trustworthy.

## Target audience and persona
`audience-aspirational-family-organizers`, represented by Maya: a household lead who wants calm support for ordinary money decisions, not a finance methodology.

## Hero anchor
`jtbd-carry-intentions-into-action` - turn the chosen living percentage into category amounts that remain understandable when reality changes.

## Active anchors
- `jtbd-carry-intentions-into-action` - the 70% choice must remain connected to category amounts.
- `jtbd-trust-this-app-with-my-life` - actual spending, planned amounts, and proposed changes must stay distinct.
- `jtbd-review-budget-reality-before-spending` - a category meter is only useful when its denominator is credible.

## Friction
The current flow starts with a blank dollar decision and delays explanation until `Review change`. It can show which category allocations will move, but it does not first answer why the current amount exists, what recent spending suggests, how much room remains inside the 70% target, or what the resulting plan percentage will be.

Being `over budget` is an actual-versus-plan fact. Being `over the living target` is a plan-versus-income fact. The interface must never collapse those into one warning.

## System alignment
Constraint posture: `Fit the system`, while making its automatic allocation behavior explicit.

Current system facts:
- Category settings already opens an amount drawer and can preview a hypothetical override.
- The living-plan model already has supported income, living percentage, target amount, planned amount, unassigned room, over-target amount, category allocation source, and before/after category changes.
- A user-set amount becomes a durable override. Flexible categories may adjust to keep the living target; fixed costs and user overrides are preserved.
- The preview response currently exposes changed categories but not the before/after plan facts needed to explain the target outcome.

Constraints to preserve:
- Start from the category where the user notices the problem.
- Do not shame overspending or block an intentional over-target plan.
- Do not imply that changing a budget changes money already spent.
- Do not invent a single “correct” amount when spending evidence and target capacity disagree.
- Never move another budget without naming it before save.

## Aspirational design challenge
How might we help Maya choose a believable Shopping amount and understand its effect on her 70% living target, while keeping actual spending, plan math, and automatic reallocations plainly separate?

## Out of scope
Financial advice, a full allocation dashboard, month-only exceptions, and changing the living percentage inside this category flow.
