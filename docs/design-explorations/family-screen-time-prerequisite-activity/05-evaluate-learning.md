# Evaluate Learning: Family Screen Time Prerequisite Activity

## Learning questions

- Does a caregiver naturally state the child, prerequisite, minutes, and target in one Chat request?
- Does the proposal make foreground-use evidence understandable without sounding like surveillance?
- Does the child understand what opens Games and when the rule resets?
- Does the Device Activity threshold behave reliably while Kwilt is closed, offline, or relaunched?

## Evidence plan

Supporting evidence:

- the example request produces the intended proposal without manual rewriting;
- the caregiver approves after reading one sentence;
- Charlie can explain the rule and the next action;
- signed-device receipts show the expected policy version applied and the local threshold transition occurs on repeated days;
- routine caregiver unlock requests decline.

Disconfirming evidence:

- caregivers expect content verification or a detailed usage ledger;
- app-selection repair makes Chat feel like setup theater;
- threshold callbacks are late, duplicate, reset incorrectly, or leave a target shielded;
- families immediately need nested or multi-prerequisite logic to express ordinary agreements.

## Instrumentation

Record only proposal kind, approval outcome, threshold-minute bucket, target count, policy version, and delivery outcome. Never record Apple tokens, readable app identities, child usage minutes, content, or a per-app history.

## Decision rule

Keep and expand the criterion only after a signed-device multi-day test completes without incorrect shielding and the family reports fewer routine unlocks. Simplify or retire it if the rule is misunderstood as reading verification or native delivery cannot be made dependable.

## Expected next action

After source verification, run one signed-development-device drill, then an allowlisted TestFlight family trial before changing the job-flow delivery score.
