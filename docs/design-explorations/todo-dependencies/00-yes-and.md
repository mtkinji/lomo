# Yes-And: To-Do Dependencies

## Original Idea

Create dependencies between to-dos. Kwilt already has linked to-dos when a checklist step is converted into a standalone Activity, but there is no way to add a linked to-do outside that conversion path.

## Adjacencies

**Yes, and what if it could...** let the user attach an existing to-do as a prerequisite from any Activity.

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: follow-through gets easier because Kwilt can show what must happen first without requiring a new planning system.
- New value: the current linked-step model becomes usable after capture, not only during step conversion.
- Cost delta vs. original: low
- Anti-pattern check: pass; keep it as a plain relationship, not a dependency graph dashboard.

**Yes, and what if it could...** create a new dependent to-do inline without forcing the user to leave the current Activity.

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: a fragile prerequisite can be captured in the moment and made actionable later.
- New value: "I need to do this first" becomes a fast capture gesture rather than a detour.
- Cost delta vs. original: medium
- Anti-pattern check: pass if capture remains lightweight and optional.

**Yes, and what if it could...** mark blocked work as waiting because another Kwilt to-do is not done yet.

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: the list can separate "important but not ready" from "do next," reducing false urgency.
- New value: dependency relationships become an actionability signal for Smart order, Recommended, Waiting, and scheduling.
- Cost delta vs. original: medium
- Anti-pattern check: pass; language should be "Waiting on..." rather than project-management terms like critical path.

**Yes, and what if it could...** show dependency status inside both to-dos without making the relationship symmetrical.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the user can inspect why a to-do is waiting and where completing it will unblock progress.
- New value: "This unlocks..." and "Waiting on..." give orientation without a separate dependency map.
- Cost delta vs. original: medium
- Anti-pattern check: pass if the relationship is transparent, reversible, and deletion-safe.

**Yes, and what if it could...** let AI suggest a dependency only as a reviewable proposal when it sees language like "after," "once," or "waiting for."

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: the app can notice hidden sequencing without silently reorganizing the user's life model.
- New value: dependency capture can improve over time without becoming opaque automation.
- Cost delta vs. original: high
- Anti-pattern check: pass only with explicit confirmation; silent dependency creation would fail the trust bar.

**Yes, and what if it could...** preserve existing linked-step behavior while making the underlying relationship more general.

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: current linked to-dos remain stable while Kwilt gains a broader relationship model.
- New value: converted steps, existing-to-do dependencies, and newly created prerequisites can share one mental model.
- Cost delta vs. original: medium
- Anti-pattern check: pass if migration is backward-compatible and old linked rows do not change meaning.

## Frame Recommendation

**Run design-thinking-loop with an expanded frame** - the original idea is not just "add a link button." The better frame is **Activity dependencies as an actionability layer**: a user can say one to-do is waiting on another, and Kwilt can use that relationship to explain what is blocked, what is ready, and what completion will unlock.
