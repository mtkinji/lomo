# Converge: todo-linked-goal-redundancy

## Chosen alternative
Alternative 1: Domain Row With Segmented Picker.

## Why
It collapses the redundant surfaces into one affordance:

- Showing: the top row displays the linked Goal title, or "Link a Goal" when empty.
- Navigating: tapping the linked Goal title area opens Goal detail in the current To-do stack so back returns to the To-do.
- Picking: tapping the trailing control opens the existing searchable Goal picker.
- Changing: the same picker updates or clears the Activity's `goalId`.

The refinement is to make that one row more legible: slightly taller, Goal-domain icon on the left, and visibly segmented picker control on the right.

## Capability delta
Today, the user has to reconcile two Goal controls on the same To-do detail page.

After this change, the user can look at one top chip to know the Goal state, tap it to choose a Goal if none is linked, or tap it to change the linked Goal.

Still intentionally not supported:
- A second Goal picker in the lower details form.
- Auto-selecting or inferring Goals.
- Requiring every To-do to have a Goal.

## Reductive design decisions
- Keep one visible Goal title.
- Keep one full-width Goal relationship row.
- Do not add helper copy.
- Do not create a new picker component.
- Remove the lower `Linked Goal` field.
- Use `navGoals` as the leading icon instead of `link`, because the row must clearly communicate that this is the parent Goal relationship or the affordance to add one.
- Segment the trailing picker affordance with a subtle divider or right well, not with a separate text button.
- Make the row modestly larger, but still subordinate to the To-do title and steps.

## Icon Decision
Use the learned Goals nav icon (`navGoals`) rather than the generic link icon.

`link` correctly says "relationship," but in this context it can imply a URL/copy-link affordance and does not tell the user what kind of parent object this is. The important job is Goal-ness: this To-do belongs under a Goal, or can be linked to one. `navGoals` is the strongest learned symbol for that object in the current app, so use it here even though the row does not navigate to the Goals inventory.

If copy-link becomes a product action later, it should live in the overflow menu or share sheet, not in this relationship row.

## Segmentation Decision
The right picker side should be visibly segmented because the row has two different tap outcomes. The left side navigates when linked; the right side changes the relationship. A subtle vertical divider plus a fixed-width right hit target keeps it one component while reducing surprise.

## Activation path
No education. The change should be discovered naturally when a user opens a linked To-do and notices the detail page feels calmer.

## Bet
We're betting that a slightly larger Goal-domain row with a segmented picker side will make the compound control feel intentional: one relationship, two clear actions. If that is not true, revisit an explicit "Goal" label before reintroducing a lower field.

## Success signal
In dogfooding, linked and unlinked To-dos should have one clear Goal relationship row, with no hesitation about how to navigate, link, or change the Goal, and without the row competing with the To-do title.
