# Evaluate Learning: Exploration Recap

## Learning questions

- Does a single recap preserve delight without pulling the phone out during the outing?
- Are automatically collected placemarks usually recognizable and correct?
- Is the background permission explanation clear enough to earn trust?
- Does one generic notification feel useful rather than mysterious?

## Evidence

Support: a signed-device walk survives screen lock, resolves several real Places, dedupes known Places, and the user understands why each visit appeared. Disconfirm: frequent street-address candidates, duplicate visits, surprise background recording, or a recap that feels like cleanup.

## Instrumentation

Keep first-release evidence local: accepted point count, sampled point count, candidate/confirmed counts, background permission result, session-close reason, and notification scheduling result. Do not send coordinates, Place names, routes, or visit timestamps to analytics.

## Decision rule

Keep automatic collection only if real-device walks are mostly correct and corrections are rare. Otherwise retain the batched recap and downgrade placemarks to optional suggestions.
