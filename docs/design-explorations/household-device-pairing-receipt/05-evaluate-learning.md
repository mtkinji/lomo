# Evaluate learning: Household device pairing receipt

## Learning questions

- Does automatic confirmation remove uncertainty without needing a progress explanation?
- Is Share discoverable enough in the header?
- Does moving account attachment to the receiving device preserve the caregiver's mental model?

## Evidence

Supporting evidence is a real two-device claim where the caregiver waits, sees the connected state within one polling interval, and needs no manual refresh. Disconfirming evidence is repeated Share confusion, premature exits, or users expecting the confirmation to mean Apple controls are already active.

## Instrumentation

For the learning release, use focused tests, RPC/Edge logs, and direct Simulator/physical-device observation. Do not add child-level behavioral analytics for this small setup refinement.

## Decision rule

Keep the pattern if one real two-device claim completes automatically and the hierarchy reads as a pairing receipt. Revise the Share placement or explanatory copy if direct observation shows confusion; do not add back the three-button stack.

## Expected next action

Run the claim on a second signed device, then reflect the observed evidence into the Household job-flow score only if the full participation step materially improves.
