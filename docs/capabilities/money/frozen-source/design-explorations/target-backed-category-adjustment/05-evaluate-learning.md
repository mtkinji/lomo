# Evaluate Learning: Target-Backed Category Adjustment

## Learning questions
- Do the two guideposts help users choose, or create another calculation burden?
- Do users understand that recent spending is evidence rather than advice?
- Can users distinguish over-category spending from an over-target plan?
- Is automatic flexible reallocation expected and acceptable when named before save?
- Does `Save over target` preserve agency without making the target feel meaningless?

## Supporting evidence
- A user can answer, without prompting: what has already been spent, why the current amount exists, what the proposed amount does to 70%, and which other budgets move.
- The user does not ask whether the plan target or past transactions changed.
- The user can make the decision from the drawer without seeking a global dashboard.

## Disconfirming evidence
- Users treat the recent average as Kwilt's recommendation.
- Users cannot explain the difference between `room in plan` and `remaining in Shopping`.
- Users are surprised that another flexible category changes.
- Users want to compare categories before making any adjustment.

## Instrumentation
Observe task comprehension in simulator/TestFlight sessions. If event tracking is used, record only open, review, back, apply, cancel, outcome bucket, and number-of-affected-categories bucket. Do not record amounts, income, names, or copy fragments.

## Decision rule
Keep the compact flow if 4 of 5 observed tasks end with an accurate verbal explanation and no hidden-change surprise. Revise the guidepost labels if plan room and category remaining are confused. Add an optional full-plan comparison only if at least 2 of 5 users refuse to decide without it.
