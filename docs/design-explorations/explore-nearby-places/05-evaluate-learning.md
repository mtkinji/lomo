# Evaluate Learning: Explore Nearby Places

## Learning questions

- Do Nearby and My Places feel like two views of one system rather than application modes?
- Are three to five suggestions enough to create useful curiosity without map clutter?
- Does half a mile work in a dense city, and do quarter-mile/one-mile choices cover useful correction?
- Do users understand that a hollow recommendation pin is not a visited Place?

## Evidence

Use direct signed-device observation: searches requested, returned-result count, time to first result, selection/pin synchronization, radius changes, provider errors, and qualitative correction. Do not send coordinates, names, routes, or visit history to analytics.

## Decision rule

Keep the slice if nearby search returns useful candidates in varied environments, users can switch collections without explanation, and no one mistakes suggestions for visited history. Improve provider breadth or ranking before adding Missions or personalization if relevance is weak.
