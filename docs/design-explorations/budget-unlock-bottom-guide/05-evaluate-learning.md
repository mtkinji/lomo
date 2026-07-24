# Evaluate Learning: budget-unlock-bottom-guide

## Learning Questions
- Does the bottom guide make the pause feel calmer than the inline item/card?
- Does Maya still understand why Amazon is paused without seeing a large inline reason card?
- Does `Keep blocked` feel like a legitimate choice when placed in a guide?
- Does the guide preserve the chart as the primary budget evidence?
- Does dismissal behavior feel trustworthy, or does it create uncertainty about whether the app stayed blocked?

## Evidence Plan
Supporting evidence:
- Simulator screenshots show the chart immediately visible with the guide present.
- Andrew prefers the guide screenshot over the inline item screenshot for the paused-app moment.
- In walkthrough, `Open Amazon` and `Keep blocked` are both understood in under a few seconds.
- The chart remains scrub-able/readable when the guide is visible or after it is dismissed.

Disconfirming evidence:
- The guide feels like an ad, prompt, or modal interruption.
- Users miss the reason because it is too far from the meter.
- `Keep blocked` reads as dismissing the guide rather than choosing to stay blocked.
- The guide covers too much of the chart or activity on small screens.

Brand-goodwill evidence:
- Copy reads supportive and reversible.
- No one describes the interaction as punitive or parental.
- The blocked outcome feels valid.

## Instrumentation
For the learning release:
- Keep existing `BudgetReviewEvent` outcomes.
- Add no new invasive tracking.
- Capture simulator screenshots for active, open receipt, and keep-blocked receipt states.
- Manual self-use notes should record whether the guide felt calmer than the inline dock.

Do not track:
- exact chart scrub positions,
- merchant-level behavior beyond the review event already needed for app-pause function,
- dismissal as if it were a spending decision.

## Decision Rule
Proceed to implementation/permanent brief update if the local build proves:
- the first viewport hierarchy is better than the inline dock,
- both actions remain clear,
- no key chart content is hidden,
- `npm run lint` passes.

Revise if:
- the guide needs too much new infrastructure,
- dismissal semantics remain ambiguous,
- the inline action strip is clearly simpler and just as calm.

Retire if:
- the guide makes the pause feel promotional or modal.

## Expected Next Action
Implement a small Money-local bottom guide for Budget Detail unlock tasks, verify in simulator, then compare screenshots against the current inline item.
