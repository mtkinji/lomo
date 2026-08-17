# Evaluate Learning: Chat Recipe Management

## Learning questions
- Does Chat reliably choose the correct Recipe and preserve every untouched field?
- Is a full Recipe proposal understandable without a second editor?
- Do users trust explicit create/update/delete approval and receipts?

## Evidence
Support: successful staged and approved actions, authoritative Recipe reload, correct return navigation, and no need to reconstruct the recipe in Recipes. Disconfirming: missing ingredients/steps, ambiguous target selection, repeated revised-proposal loops, or prose claiming success without a receipt.

## Instrumentation
Use existing private-safe Chat tool/proposal outcome telemetry and manual dogfood observation. Do not log titles, ingredients, instructions, notes, or source material.

## Decision rule
Promote after local and signed-device proof across create, update, stale-update rejection, reject/defer, and delete. Revise toward a Recipe-owned inline review surface if complete proposal cards are hard to inspect.

## Expected next action
Implement the local learning release, then perform Simulator/signed-device visual and persistence QA before changing the job-flow delivery score.
