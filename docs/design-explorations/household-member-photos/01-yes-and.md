# Yes-And: Household Member Photos

## Decision

Skip expansion and keep the original frame.

## Rationale

This is a bounded refinement of the accepted Household Person foundation, not
a new family-profile capability. The obvious adjacencies—birthdays, food needs,
contact import, gifting context, and richer People records—have already been
framed in `household-people-and-meal-count`. Pulling them into this slice would
delay the sharp job of making household identity recognizable and would risk
turning one optional image into profile-administration pressure.

## Job-elevation note

The small feature still elevates the job from “show a name beside household
work” to “let each person recognize their bounded place in the family
experience.” That serves `jtbd-invite-the-right-people-in` and
`jtbd-trust-this-app-with-my-life` without expanding what Household membership
shares.

## Guarded future adjacencies

The resolved photo may later appear anywhere that already has explicit
Household-person authority: the active-member switcher, Chores attribution,
child-owned To-dos, meal contribution, Games seats, or Screen Time explanation.
Those are consumers of one Person projection, not separate photo features.

## Frame recommendation

**Run the design-thinking loop with the original frame.** Diverge only on the
capture and editing interaction, storage boundary, and connected-account
precedence behavior.
