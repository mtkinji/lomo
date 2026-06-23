# Converge: To-Do Dependencies

## Qualitative Scoring

| Option | Persona fit | JTBD fit | Trust/calm fit | Implementation fit | Notes |
| --- | --- | --- | --- | --- | --- |
| Attach Existing To-Do | Medium | Medium | High | High | Solves the immediate UI gap, but under-serves actionability. |
| Waiting On / Unlocks Relationship | High | High | High | Medium | Best fit if dependencies should reduce list noise and power Smart order. |
| Inline Prerequisite Capture | Medium | Medium | High | Medium | Good creation path, but misses existing-to-do attachment. |
| AI-Suggested Dependencies | Medium | Medium | Medium | Low | Valuable later, but too trust-sensitive for V1. |

## Chosen Direction

Choose **Waiting On / Unlocks Relationship**.

The first-class relationship model is the better product bet because the user is not only asking for a link affordance; they are asking for dependency. A dependency should change actionability: the blocked item should be quieter, the prerequisite should become more meaningful, and completion should unblock the parent in an inspectable way.

The UI can still reuse the existing linked-step language and the current related-Activity safety behavior around delete/restore. A relationship may render as a linked row inside Activity detail, but the durable model should know the difference between:

- a step that was converted into a to-do;
- an existing to-do attached as a prerequisite;
- a newly created prerequisite from the parent Activity.

## Accepted Trade-Offs

- V1 should support simple directed Activity dependencies, not arbitrary graph editing.
- The primary vocabulary should be "Waiting on" and "This unlocks," not "dependency," "blocked by," "critical path," or "predecessor."
- A parent Activity can become less recommended while waiting, but capture remains unaffected.
- Completion of a prerequisite can quietly update the parent actionability; it should not create urgent notifications by default.
- AI can suggest dependencies later, but V1 should be manual and inspectable.

## Rejected Trade-Offs

- Do not ship only a search-and-link button if the relationship has no effect on Waiting, Recommended, or actionability.
- Do not add a graph/map view in V1.
- Do not require users to convert a step before they can create a relationship.
- Do not silently create or rearrange dependencies from AI inference.
- Do not make dependency setup part of Activity capture.

## Stated Bet

We're betting that **dependencies will feel valuable when they make the list more honest about what is doable now**. If users only use the link for navigation and do not care about Waiting/Recommended behavior, we would revisit by collapsing V1 toward a lighter linked-to-do affordance.

## Success Signal

Users can attach or create a prerequisite from an Activity, later understand why the parent is waiting, complete the prerequisite, and see the parent become ready without having to configure a view or rebuild their list.
