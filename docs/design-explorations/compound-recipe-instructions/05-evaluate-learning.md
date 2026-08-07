# Evaluate Learning: Compound Recipe Instructions

## Questions

- Does Recipe Home still read as five coherent pancake phases rather than a ten-item checklist?
- Does Cook Mode make the two mixing actions independently actionable without hiding that both belong to phase 2?
- Do next, back, repeat, timers, ingredients, media, resume, and accessibility remain trustworthy?

## Evidence

- Structural audit: all 500 bundled recipes compile from 2,410 phases to 5,497 non-empty, uniquely identified cues; the largest phase contains five cues.
- Simulator observation: Buttermilk pancakes reads as five numbered phases on portrait Recipe Home. Phase 2 keeps both bowl actions together.
- Simulator observation: landscape Cook Mode restored an older phase-only session into phase 2, action 1; Next advanced to action 2 without changing phase, then advanced to phase 3. Each action showed only its relevant ingredients.
- Automated evidence: contract, normalization, compiler, cue-builder, session-migration, Recipe Home, and Cook Mode tests pass. The full diff-aware verification gate also passes.
- Proof boundary: portrait Cook Mode was not separately captured in this pass because the checkout also contains active orientation work. The shared portrait component path is covered by typecheck/tests; landscape is the direct runtime proof.

## Decision rule

Keep the model if the whole Recipe scans cleanly, Cook Mode exposes one atomic action, and no resume or assistive-label regression appears. Revise presentation—not the shared identity model—if the hierarchy is too busy.

## Decision

Keep the shared phase/cue model. The detail-page hierarchy remains calm, the Cook Mode action is materially easier to follow, and the migrated session retained the cook's phase instead of resetting progress.
