# Job Delivery Review - 2026-07-22

## Decision

The next highest-leverage move remains `verify` on
`match-transactions-to-lane`: prove that a signed-in Sandbox transaction
correction persists after reload or refetch and changes the relevant budget
meter.

## Why

`job-delivery:next` still ranks `choose-intentional-access` reflection first,
but its suggested implementation slice is stale relative to current source:
Budget Detail can reach App Controls, App Controls can rehearse review, Review
has explicit `Open for now` and `Leave blocked` outcomes, and signed-device
Amazon unblock proof already moved this step to 4/5.

The fuller review correctly keeps the unresolved trust risk on transaction
truth. Maya can only trust the meter before spending if corrected or excluded
transaction evidence survives beyond local UI state and updates every meter
surface that depends on it.

## Current-State Evidence

- `npm run job-delivery:check` passed.
- `npm run job-delivery:next` selected app-gate reflection.
- `npm run job-delivery:review` selected live transaction correction proof.
- Current source improves transaction review follow-through by prompting for a
  merchant rule only after a saved outflow category change, instead of keeping a
  persistent rule panel on transaction detail.
- `npm run test:forecast` passed, including transaction rule prompt and live
  snapshot assertions.
- `npm run test:living-plan` and `npm run test:living-plan-adjustment` passed,
  proving the current target-backed amount adjustment helpers locally.

## Current Workflows

`transaction-review-to-trustworthy-meter` is still the workflow to verify:

Account sync -> Needs review filter -> transaction correction -> similar rule
decision -> budget meter update after reload or refetch.

`app-gate-rehearsal` remains signed-device verified for the Amazon unblock path,
but receipt/history confidence still needs repeated native use before another
score move.

## Why Not The Next Candidate

Do not spend this loop on the app-gate reflection first. The core app-gate
traversal has stronger proof than the transaction truth layer, and the map's
remaining app-gate recommendation is now about reflection and trust history,
not a missing implementation surface.

Do not move to `see-budget-reality` or the iOS widget loop yet. Ambient budget
visibility is strategically valuable, but it depends on the meter being backed
by durable reviewed transaction truth.

## Map Decision

No score change today. The local code and smoke evidence narrows the
implementation risk, but it is not the runtime proof required by the maintenance
rules.

A future map update is warranted after the authenticated Sandbox proof passes or
fails:

- pass: update `match-transactions-to-lane` evidence to observed runtime proof
  and revise the local-mirroring friction;
- fail: record the exact persistence, refetch, or meter-propagation gap as the
  next implementation issue.
