# Diverge: ftux-goal-arc-onboarding

## Axis

Single-output vs. dual-output FTUX, and pre-save reveal vs. post-save landing.

## Alternative 1: Arc First, Goal Suggested

FTUX keeps creating only an Arc, but the reveal includes a suggested first Goal. The user can accept the Goal after Arc creation.

- Fit: Preserves current Arc-led architecture.
- Strength: Lowest implementation change.
- Weakness: Does not solve the concrete-first entry problem; the Goal can still be skipped.
- Best when: Current Arc creation mostly works and we only need a stronger handoff.
- Fails when: Users cannot create a resonant Arc from abstract questions.
- Anti-pattern check: pass, but under-solves the observed issue.

## Alternative 2: Goal First, Arc Offer

FTUX creates a concrete first Goal, then offers to create an Arc from it.

- Fit: Starts where users naturally are.
- Strength: Very understandable.
- Weakness: High drop-off risk before Arc creation; app can enter a context-light state.
- Best when: Completion rate for Goal creation is the only priority.
- Fails when: Kwilt needs identity context before the app feels coherent.
- Anti-pattern check: weak; optional Arc creation makes the identity layer secondary.

## Alternative 3: One Flow, Two Outputs

FTUX asks deterministic concrete-to-identity questions, then generates and saves both an Arc and a linked first Goal. The user lands on the Arc detail screen with the Goal visible.

- Fit: Uses existing Arc and Goal objects correctly.
- Strength: Avoids drop-off between Goal and Arc; teaches hierarchy through product behavior.
- Weakness: More generation/persistence complexity.
- Best when: First-run coherence matters more than minimal implementation.
- Fails when: Generated Arc and Goal feel redundant or mismatched.
- Anti-pattern check: pass if the Arc remains identity-shaped and the Goal remains concrete.

## Alternative 4: Two-Step Review Before Save

FTUX collects deterministic inputs, generates an Arc and Goal, then shows a pre-save review surface: "This is your direction" and "This is your first goal." User confirms or tweaks before saving.

- Fit: Gives agency before persistence.
- Strength: Reduces risk of saving bad identity language.
- Weakness: Adds another cognitive step before the user enters the product.
- Best when: Generation quality is uncertain.
- Fails when: The review screen feels like a form or setup wizard.
- Anti-pattern check: pass if concise; risk of onboarding drag.

## Alternative 5: Post-Save Arc Landing as Review

FTUX saves both objects, then lands on Arc detail with a first-run interstitial/coachmark that says the Goal is the first expression of the Arc. Tweak/edit affordances are available on the Arc page.

- Fit: Uses product surfaces as confirmation.
- Strength: Faster entry into real Kwilt.
- Weakness: Bad generation is persisted before review.
- Best when: Existing Arc detail editing is good enough.
- Fails when: Users need explicit confirmation before trusting the output.
- Anti-pattern check: pass if no forced modal and edits are easy.

## Divergence Read

Alternative 3 is the core model. The main design decision is how much review happens before save. V1 should combine Alternative 3 with a lightweight pre-save reveal, then land on Arc detail. That gives quality control without turning onboarding into a long editor.
