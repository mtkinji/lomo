# Frame: Contextual Plan Kickoff

## What the user said

> The Explore guide should win because the user is inside Explore. If there were a bottom guide in another capability and the user is not in Plan, that other guide should probably appear in place of Plan. The daily planning prompt might only appear inside Plan, or become a notification the user can tap to enter planning.

## Restated in user voice

When I open Kwilt to do something specific, help me stay with that purpose. If planning my day would help, invite me at a moment and in a channel I can choose, so that I can decide what matters without Kwilt covering the work already in front of me.

## Target audience

`audience-burned-out-productivity-power-users`: people who already have enough productivity machinery and need decision relief without another system demanding upkeep.

## Representative persona

Marcus has opened Kwilt with a concrete intent, such as reviewing an Explore outing. He may still benefit from planning, but an unrelated prompt feels like the app prioritizing its routine over his reason for arriving.

- Current situation: he is already engaged in a capability-specific flow.
- What he is trying to do: finish the present job, then decide the next honest action.
- Emotional state or tension: receptive to useful guidance, resistant to productivity-tool interruption.
- What would make this feel wrong: a global planning prompt covering a more relevant contextual surface.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - Planning should reduce the “what now?” burden, not create a competing demand for attention.

## Job flow step

Marcus is at **Decide what to do next**, currently scored **3**. Plan and recommendations help, but “what now?” is not yet the product spine. The present global kickoff can appear before Kwilt knows whether planning is the job Marcus came to do.

## Active anchors

- `jtbd-move-the-few-things-that-matter` - the invitation should help Marcus choose an honest next action.
- `jtbd-trust-this-app-with-my-life` - capability-local context and notification attention must be respected.

## serves snippet

```yaml
serves: [jtbd-move-the-few-things-that-matter, jtbd-trust-this-app-with-my-life]
```

## Friction we're addressing

The root-level Plan kickoff is eligible on app foreground without considering which capability the user is in or whether that capability already owns a bottom guide. It can therefore cover a timely Explore recap with a generic daily invitation. The collision exposes a broader question: whether planning belongs as an app-wide interruption at all.

## System alignment

Constraint posture: `Bend the system`

Current system facts:

- Existing surface: `PlanKickoffDrawerHost` mounts globally and presents a scrimmed `BottomGuide` after foreground interactions.
- Existing user flow: daily, weekday, or weekly cadence is configured under Notifications; the current settings explicitly describe these prompts as in-app rather than push notifications.
- Existing domain/data model: `lastKickoffShownDateKey` suppresses repeat presentation for the day; notification preferences store enablement, cadence, and weekly day.
- Existing technical affordances: Kwilt already schedules and deep-links local notifications for other capabilities, and already exposes `isPlanKickoffVisible` to suppress selected Activity surfaces.
- Existing UX/copy conventions: foreground guidance should be calm, contextual, dismissible, and should not compete with a more specific active job.

Constraints to preserve:

- Do not force planning or punish dismissal.
- Do not lose the user’s current capability context.
- Do not create duplicate in-app and OS prompts for the same planning opportunity.
- Capability-local guides retain priority over opportunistic global guidance.

Constraints we may challenge:

- Plan kickoff as a root-level foreground overlay.
- The current assertion that planning prompts are always in-app rather than notifications.
- Treating app foreground as sufficient evidence that the user is ready to plan.

Design implication:

The solution should begin with attention ownership, not z-index. A capability-specific foreground surface owns the current session. Planning can become contextual inside Plan, an optional destination-bearing notification, or a deferred invitation that appears only when no stronger intent is active.

## Aspirational design challenge

How might we help Marcus notice a useful moment to plan and enter Plan intentionally, while preserving the capability context and purpose that brought him into Kwilt?

## Out of scope

- Redesigning the recommendation engine or the Plan workflow itself.
- Changing Explore recap content beyond what is necessary to establish presentation priority.
- Adding multiple new notification settings before a delivery model is chosen.

## Open question

Should planning readiness be inferred from being inside Plan, explicitly scheduled by the user, or supported by both without duplicating the invitation?
