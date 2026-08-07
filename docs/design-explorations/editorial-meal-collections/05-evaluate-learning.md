# Evaluate Learning: Editorial Meal Collections

## Learning questions

1. Do the invitations feel like useful food ideas rather than promotions?
2. Does `Why try it?` plus `Why is it doable?` make unfamiliar meals feel safe
   enough to consider?
3. Do people understand the difference between choosing some meals and
   reviewing the complete plan?
4. Does the handoff into Meal Planning feel continuous while making the unsaved
   boundary clear?
5. Are the prepared plans coherent enough to reduce work after users remove or
   swap meals?

## Evidence plan

Supporting evidence:

- a Collection is opened from a meaningfully encountered placement;
- at least one meal is selected and reaches plan review;
- the complete template path also reaches plan review during dogfood;
- the user can explain that the result is an editable draft, not a decision;
- a reviewed draft reaches finalization and successfully derives Groceries.

Disconfirming evidence:

- the cards are described as ads, clutter, or interruptions;
- users repeatedly open a page but cannot find a meal they believe they can
  make;
- users expect `Review the plan` to have already changed their household plan;
- users abandon at the existing-draft choice or Meal Plan editor;
- template coherence disappears after one ordinary swap.

## Instrumentation

Capture metadata-only events for Collection open, selection count change, plan
review start, and review source (`selection` or `template`). Reuse existing Meal
Plan finalized, Grocery compiled, and Cook completed events for downstream
progress. Do not capture meal titles, ingredient text, household identity,
dwell time, or passive taste conclusions.

Andrew's dogfood notes should record whether the offer was noticeable, whether
the meal set created appetite, where confidence broke, and whether the plan
saved decision work.

## Decision rule

After at least three real planning cycles across both adoption paths:

- **Proceed** when both paths reach reviewed drafts and at least one reaches
  finalized Groceries without authority confusion.
- **Simplify** to choose-some Collections if complete templates are rarely used
  or feel too prescriptive.
- **Revise** editorial facts and page composition if Collections open but meals
  do not reach review.
- **Retire placements** if they feel promotional or materially degrade normal
  browsing.

## Expected next action

If the bet holds, expand the authored catalog by job intent and add an editorial
validation workflow. Do not add personalization or remote publishing until the
human-curated loop is trusted.
