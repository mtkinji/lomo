# Evaluate Learning: Contextual Recipe Recommendations

## Learning questions

- Does 9:00 feel like a truthful breakfast cutoff in ordinary use?
- Does two dinner slots for every lunch slot match what people intend to plan?
- Do favorites and personal recipes still surface often enough inside context?

## Evidence

Supportive evidence: morning and afternoon dogfood produces immediately usable
Ideas without repeated manual skipping of breakfast cards.

Disconfirming evidence: users routinely want breakfast planning after 9:00,
lunch rarely appears when wanted, or the contextual list feels less personal
than deliberate browsing.

## Decision rule

Keep the deterministic model if it improves plausibility across several real
planning sessions. Adjust the cutoff or slot sequence if the timing is wrong.
Only add recency, household input, pantry, or budget signals as separately
authorized, explainable inputs with their own evidence.

## Instrumentation

Use Andrew's dogfood observations and existing add-to-Plan behavior. Do not add
new personal-time telemetry solely for this refinement.
