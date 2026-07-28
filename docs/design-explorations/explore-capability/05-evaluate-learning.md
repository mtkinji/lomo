# Evaluate Learning: Explore capability

## Learning questions

- Does the 100-foot reveal feel like discovering territory rather than merely logging GPS?
- Is the altitude color readable and meaningful without becoming a score?
- Do users understand recording, sharing, and viewing as separate controls?
- Does explicit session recording create enough value before background tracking exists?
- Does the canonical Place relationship feel coherent with task-oriented Places?

## Evidence

Supporting evidence: a real outing produces recognizable retained territory; users can explain visibility correctly; relaunch does not lose the map; the user wants to repeat or share an adventure.

Disconfirming evidence: fog rendering obscures navigation, GPS noise creates false territory, starting a session feels like admin, or users assume family members are visible when no shared backend exists.

## Instrumentation

Use local/manual evidence for the first build: session start/stop, accepted vs rejected point counts, permission result, persistence reload, screenshots, and direct feedback. Do not send coordinates, altitude, Place identities, route geometry, household identifiers, or timestamps to analytics.

## Decision rule

Proceed to background and family infrastructure only after a real-device outing proves the personal loop and privacy comprehension. Otherwise refine the map rendering, point acceptance, or activation before expanding scope.
