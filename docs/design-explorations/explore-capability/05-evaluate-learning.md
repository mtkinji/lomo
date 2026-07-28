# Evaluate Learning: Explore capability

## Learning questions

- Does **See where you’ve been. Explore where you haven’t.** communicate both the personal-history value and the invitation to future discovery?
- Does one stationary clearing provide enough first-use value to make the recording-mode choice understandable?
- Do people choose automatic recording because they understand the benefit, rather than because the UI pressures them?
- Does removing navigation and search during first use make the introduction feel focused rather than trapped?
- Does the compact single-heading choice drawer explain the automatic/manual distinction without requiring a paragraph?
- Do the entering controls make the shift from introduction to usable map legible, including with reduced motion enabled?

- Does the 65-foot clear core and long feather feel like discovering territory rather than merely logging GPS?
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
