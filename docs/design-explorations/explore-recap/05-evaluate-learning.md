# Evaluate Learning: Exploration Recap

## Learning questions

- Does a single recap preserve delight without pulling the phone out during the outing?
- Are automatically collected placemarks usually recognizable and correct?
- Is the background permission explanation clear enough to earn trust?
- Does one generic notification feel useful rather than mysterious?
- Does Always Exploring preserve a continuous-looking path at an acceptable battery cost?

## Evidence

Support: a signed-device walk survives screen lock, resolves several real Places, dedupes known Places, combines unseen outings, and the user understands why each visit appeared. Disconfirm: frequent street-address candidates, duplicate visits, surprise background recording, a recap that feels like cleanup, or unacceptable incremental battery drain.

## Instrumentation

Keep first-release evidence local: accepted point count, sampled point count, candidate/confirmed counts, background permission result, session-close reason, notification scheduling result, and controlled signed-device battery observations. Do not send coordinates, Place names, routes, or visit timestamps to analytics.

## Decision rule

Keep Always Exploring only if controlled signed-device tests show a continuous useful path without unacceptable incremental drain. Keep automatic collection only if real-device walks are mostly correct and corrections are rare; otherwise retain the batched recap and downgrade placemarks to optional suggestions.
