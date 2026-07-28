# Evaluate Learning: Exploration Recap

## Learning questions

- Does a single recap preserve delight without pulling the phone out during the outing?
- Are automatically collected placemarks usually recognizable and correct?
- Is the background permission explanation clear enough to earn trust?
- Does one generic notification feel useful rather than mysterious?
- Does Always Exploring preserve a continuous-looking path at an acceptable battery cost?
- Does a two-minute soft sleep and five-minute deep sleep preserve ordinary Ambient departures well enough?
- Does Adventure remain recognizable through queues, traffic lights, overlooks, trail breaks, and switchbacks?
- Can movement and accuracy modifiers improve battery use without adding a user-facing settings matrix?

## Evidence

Support: signed-device dog walks, errands, intentional walks, stop-and-go trips, and long dwells survive screen lock; routes remain recognizable; the recorder resolves several real Places, dedupes known Places, combines unseen outings, and the user understands why each visit appeared. Disconfirm: missed departures, switchback shortcuts, queue-induced sleep flapping, false indoor fog, frequent street-address candidates, duplicate visits, surprise background recording, a recap that feels like cleanup, or unacceptable incremental battery drain.

## Instrumentation

Keep first-release evidence local: accepted point count, sampled point count, inferred movement class, soft/deep-sleep transition, wake source, wake distance and delay, candidate/confirmed counts, background permission result, session-close reason, notification scheduling result, and controlled signed-device battery observations. Do not send coordinates, Place names, routes, or visit timestamps to analytics.

## Decision rule

Keep the adaptive policy only if controlled signed-device tests show a continuous useful Ambient path, a recognizably faithful Adventure path, and material stationary battery savings without unacceptable incremental drain. If deep-sleep wake is too coarse, retain soft sleep and delay or remove deep sleep from Adventure. Keep automatic collection only if real-device walks are mostly correct and corrections are rare; otherwise retain the batched recap and downgrade placemarks to optional suggestions.
