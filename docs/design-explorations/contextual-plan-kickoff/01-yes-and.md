# Yes-And: Contextual Plan Kickoff

> Historical exploration. The [2026-09-24 app-wide strategy](03-app-wide-engagement-strategy.md) expands the scope and clarifies that delivery prevents duplicate interruptions, not access to useful content. Explicit outcomes and preferences, rather than assumed notification visibility, resolve an opportunity.

## Original idea

Let the capability the user is currently using own the foreground guide, and move daily planning guidance either inside Plan or into an intentional notification that opens Plan.

## Adjacencies

### Yes, and what if every foreground guide had one attention owner?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Kwilt protects the purpose that brought the user into the app instead of letting unrelated features compete for the same moment.
- New value: A shared occupancy rule prevents Plan, Explore, Screen Time, paywalls, prompts, and future capability guides from stacking.
- Cost delta vs. original: medium
- Anti-pattern check: pass; this removes clutter and surprise interruption.

### Yes, and what if Plan kickoff became a destination rather than an overlay?

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: Marcus chooses to enter a planning moment instead of having planning imposed over another task.
- New value: The invitation can live inside Plan, in a notification, or as a quiet destination indicator without duplicating the planning workflow itself.
- Cost delta vs. original: low
- Anti-pattern check: pass if the invitation remains optional and calm.

### Yes, and what if readiness came from a chosen time rather than app foreground?

- Serves: `jtbd-move-the-few-things-that-matter`, `jtbd-trust-this-app-with-my-life`
- Job elevation: Planning arrives when the user has said it is useful, not whenever Kwilt happens to become active.
- New value: Existing daily, weekday, and weekly cadence preferences can acquire an actual delivery time and support a dependable ritual.
- Cost delta vs. original: medium
- Anti-pattern check: pass if time is explicitly chosen or conservatively defaulted, never framed as overdue.

### Yes, and what if a capability-local guide deferred—not consumed—the planning opportunity?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: The user can finish the present job without permanently losing a planning invitation they still wanted.
- New value: One opportunity can move between eligible states without stacking, double-delivering, or pretending it was shown when it was merely blocked.
- Cost delta vs. original: medium
- Anti-pattern check: pass if deferral expires quietly and does not become a nag queue.

### Yes, and what if the invitation appeared only when Plan has something worth deciding?

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: The prompt offers real decision relief rather than asking the user to open an empty ritual.
- New value: Availability can depend on truthful inputs such as recommendations or calendar context, with copy that previews the actual value waiting in Plan.
- Cost delta vs. original: medium
- Anti-pattern check: pass if evidence is stated humbly and the absence of recommendations never produces pressure.

### Yes, and what if one planning opportunity had one cross-channel receipt?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: Marcus can act, dismiss, or ignore once without the same request reappearing through another channel.
- New value: A durable opportunity state can deduplicate an OS notification, an in-Plan guide, and any future quiet indicator.
- Cost delta vs. original: medium
- Anti-pattern check: pass; deduplication reduces attention extraction.

### Yes, and what if the notification deep-linked into useful planning state?

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: Tapping the invitation immediately reaches the recommendations and calendar context needed to choose the next action.
- New value: The notification becomes a doorway into a bounded job rather than a generic reminder to open Kwilt.
- Cost delta vs. original: low
- Anti-pattern check: pass if the notification promises only what Plan can actually show.

## Job elevation

The larger opportunity is not “send a planning reminder.” It is to make Kwilt attention-aware: the app recognizes the user’s active purpose, offers planning through an intentional doorway, and records one respectful outcome for each planning opportunity.

That elevation should remain bounded. This work does not need a universal notification center, a visible prompt queue, or AI inference about the user’s mood. It needs a small presentation contract and one truthful Plan opportunity lifecycle.

## Frame recommendation

**Run the design-thinking loop with the original frame.** The frame already contains the meaningful expansion: capability-local attention ownership plus intentional Plan entry. Carry two adjacencies into divergence as requirements rather than widening the project:

1. One foreground bottom surface at a time, with capability-local context ahead of opportunistic Plan guidance.
2. One planning opportunity receipt across in-app and notification delivery, so deferral never becomes duplication.
