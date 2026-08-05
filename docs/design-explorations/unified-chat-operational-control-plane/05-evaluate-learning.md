# Evaluate Learning: Unified Chat operational control plane

## Learning questions

- Does a typed contract preserve action meaning more reliably than assistant-message reconstruction?
- Can capability-owned resolution prevent under-scoped “all” actions without overexposing unrelated records?
- Does deterministic outcome copy remain useful while eliminating contradictory claims?
- Can structural incident fixtures protect privacy while catching real regressions?

## Evidence plan

Supporting evidence:

- exact two-turn and retry fixtures pass through planning and context authorization;
- complete-inventory actions include every matching object and no unrelated object type;
- prepared, failed, and contradictory outcomes project deterministically;
- existing non-action question evidence budgets remain unchanged.

Disconfirming evidence:

- unrelated corrections inherit stale capability scope;
- ordinary single-object actions receive full inventories;
- deterministic outcome copy hides a useful clarification;
- signed runtime differs from source fixtures.

## Instrumentation

Persist contract version, target scope, prior-run referent, considered/included/omitted counts, proposal count, failed-tool count, and invariant codes. Do not persist additional private prose or duplicate capability data.

## Decision rule

Proceed to additional capability contracts after the Money incident corpus and existing related tests pass, then signed Simulator and TestFlight dogfood confirm the same behavior. Revert to native handoff for any capability whose target or completion semantics cannot be expressed deterministically.

## Expected next action

Add first-class grouped Money rename proposals only after this control-plane slice proves stable; then extend resolution metadata operation by operation rather than globally increasing context.
