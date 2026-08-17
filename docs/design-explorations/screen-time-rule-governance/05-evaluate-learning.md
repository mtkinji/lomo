# Evaluate Learning: Screen Time Rule Governance

> Superseded by the acceptance evidence in
> `07-structured-rule-builder-contract.md`. The chosen structured builder now
> needs conformance verification, not a comparison against the inline prototype.

## Learning questions

- Does the user correctly distinguish My rules from Household rules without tabs or explanatory prose?
- Do scoped counts match what the user perceives as rules?
- Does one Money category policy read as a rule rather than a settings destination?
- Is **For me, pause [apps] when [condition]** sufficient for initial personal creation?
- Does Household Add rule route feel coherent even before the full shared builder is unified?

## Evidence plan

Supporting evidence:

- Andrew can name each visible rule, scope, condition owner, and state after a three-second scan.
- Creating each personal condition succeeds without needing to understand fixed modes.
- Existing personal and Money rules remain independently reachable and reversible.
- Household setup is clearly labeled and no longer counted as a rule.

Disconfirming evidence:

- The two collections feel like separate products.
- A Money row still reads as an aggregate capability setting.
- The builder feels like a disguised two-toggle flow.
- Household Add rule feels like a bait-and-switch because it routes to a materially different editor.
- Rule counts disagree with the user's mental count.

## Instrumentation

For the local learning release, use Simulator observation, screenshots, interaction notes, and existing setup analytics. Do not add production analytics until the final builder events and privacy-safe metadata are settled. Never log Apple tokens, app labels, child names, Money category names, or rule sentences.

## Decision rule

- Proceed if the inventory and personal builder are comprehensible and Household routing feels like the same capability.
- Revise the Household builder composition before broader release if the route feels discontinuous.
- Add tabs only if observed rule density makes the grouped scroll materially hard to use.
- Do not add free-form boolean logic in response to copy or hierarchy confusion.

## Expected next action

After local visual and interaction acceptance, exercise Apple selection and overlapping rules on a signed physical device, then decide whether the shared Household builder component is required before TestFlight.
