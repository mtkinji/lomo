# Diverge: Target-Backed Category Adjustment

## Axis
How much guidance appears before the user proposes a number, and whether target fit is preserved automatically or left entirely to the user.

## A. Consequence-Only Review
Keep the current amount input, then add living-target facts to the existing review screen.

- Best when: speed and implementation scope dominate.
- Fails when: the user still has no basis for choosing $300, $400, or $500.
- System fit: high.
- Trust: medium; it explains a guess but does not help form one.

## B. History Recommendation
Lead with one suggested amount from recent spending, then show target impact after selection.

- Best when: history is stable and representative.
- Fails when: the suggestion consumes room needed by fixed commitments or presents historical behavior as advice.
- System fit: medium.
- Trust: medium; one confident recommendation hides the real tradeoff.

## C. Two-Guidepost Decision
Before input, show `Recent spending suggests` and `Fits without moving another budget`. After input, summarize the resulting living percentage and name how the increase is funded: unused room, changes to flexible budgets, or an over-target amount.

- Best when: the user wants both a credible category amount and whole-plan meaning.
- Fails when: either guidepost is shown with weak or stale evidence.
- System fit: high-medium; most facts exist, but the preview contract must return plan facts and evidence guidance.
- Trust: high; it keeps evidence, constraint, and user choice separate.

## D. Full Plan Allocator
Route the user to a screen containing every category, the living target, and interactive allocation controls.

- Best when: the user intends a broad rebalance.
- Fails when: a common category correction becomes spreadsheet work.
- System fit: low-medium and high scope.
- Trust: potentially high, but too much interface for the activating moment.

## Direction
Carry C forward. Preserve D as a conditional escape hatch only when the user deliberately wants to change the broader plan.
