# Yes-And: Explore Missions and Stories System

## Original idea

Let Explore suggest or receive Missions at Places, allow completion with photos or videos, and preserve the result as a family Story using shared media infrastructure.

## Adjacencies

**Yes, and what if a Story request were simply a Mission whose expected result is a Story?**

- Serves: `jtbd-capture-and-find-meaning`, `jtbd-invite-the-right-people-in`
- Job elevation: A family member can ask for a memory without inventing a separate request system.
- New value: “Tell me about the house you grew up in” uses the same invite, accept, reminder, result, and return loop as an Explore Mission.
- Cost delta vs. original: low
- Anti-pattern check: pass if the recipient chooses whether to accept and what to share.

**Yes, and what if the smallest Story were only one photo and one sentence?**

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: Preservation becomes realistic in the moment, not a delayed creative project.
- New value: Children and busy adults can finish a meaningful return without editing a production.
- Cost delta vs. original: low
- Anti-pattern check: pass; richer audio, video, and transcripts remain optional.

**Yes, and what if a familiar Place could reveal family context rather than another nearby attraction?**

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: Home becomes a source of memory and connection, not the boring opposite of travel.
- New value: A home Place can surface a family prompt, an old Story, or a Mission from someone trusted.
- Cost delta vs. original: medium
- Anti-pattern check: pass if Kwilt never infers that a sensitive address is shareable.

**Yes, and what if travel changed recommendations without changing the user’s durable idea of Home?**

- Serves: `jtbd-move-the-few-things-that-matter`, `jtbd-trust-this-app-with-my-life`
- Job elevation: Explore becomes useful in Japan and at home without building a travel-history profile.
- New value: Foreground region can scope nearby possibilities for the current session while Saved Places remain stable.
- Cost delta vs. original: medium
- Anti-pattern check: pass if travel is not inferred or persisted from distance alone.

**Yes, and what if a completed Mission could become a family keepsake without exposing a raw upload library?**

- Serves: `jtbd-capture-and-find-meaning`, `jtbd-invite-the-right-people-in`
- Job elevation: Completing something produces an object worth revisiting, not a dead task receipt.
- New value: Mission result, Place sheet, Stories library, and recipient return can all point to one Story.
- Cost delta vs. original: medium
- Anti-pattern check: pass if the user sees and approves the Story and audience before return.

**Yes, and what if media could be safely reused without becoming globally shared?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: The same photo can support a private To-do and a shared Story without duplicate uploads or surprising access.
- New value: One canonical asset, multiple typed references, and container-scoped grants.
- Cost delta vs. original: high
- Anti-pattern check: pass only if access is derived per authorized reference, not from one asset-wide visibility flag.

**Yes, and what if the Mission list became a gentle record of invitations, not a gamified inbox?**

- Serves: `jtbd-carry-intentions-into-action`, `jtbd-trust-this-app-with-my-life`
- Job elevation: A Mission can be accepted now, scheduled later, and revisited after completion.
- New value: Active, For You, Sent, and Completed create continuity without urgency theater.
- Cost delta vs. original: medium
- Anti-pattern check: pass if there are no streaks, unread-pressure counts, or sender surveillance.

## Job elevation

The larger opportunity is not a media graph or scavenger-hunt engine. It is a private **invitation-to-memory loop**:

`notice a possibility → accept an invitation → make it doable → live it → preserve meaning → return it to the right people`

## Frame recommendation

**Run the design-thinking loop with an expanded frame.**

Build around the invitation-to-memory loop. Keep Stories, Missions, Places, and To-dos as separate user-legible objects. Share media infrastructure and participation primitives underneath them, but do not expose the infrastructure as a new product destination.
