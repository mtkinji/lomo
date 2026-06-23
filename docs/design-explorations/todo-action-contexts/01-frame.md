# Frame: To-Do Action Contexts

## What the user said
> I think my brain works differently because I want to see my to-do list when I go out of my house. I want to know what tasks I have away from home. When I sit down at my computer, I wanna be able to see my tasks grouped together that are for computer work. Uh, I just, like, yeah, I think that's what I got.

## Restated in user voice
When I enter a real-life mode, I want Kwilt to help me identify the next thing I should do with the least friction, based on what the app knows or what I quickly tell it, so that captured intentions turn into action without me having to scan the whole pile or maintain a complex organization system.

## Target audience
`audience-aspirational-family-organizers`: Everyday family organizers who want Kwilt to make ordinary family and personal commitments feel organized without requiring a productivity methodology.

## Representative persona
Maya: Maya is a mother helping her family use Kwilt because it has already proven useful in ordinary life. She is not trying to build an advanced task database; she wants ordinary life to feel less scattered.

- Current situation: Maya has a crowded Activity list with errands, household follow-ups, computer work, calls, scheduled items, and unanchored captures.
- What they're trying to become/do: Get to the next doable action from a real-life context, whether that happens in the app, from a prompt, from a widget, on desktop, or through another lightweight surface.
- Emotional state or tension: She wants Kwilt to match the way her brain naturally looks for tasks, but too much setup would make the app feel fussy.
- What would make this feel wrong to them: Treating context as a new taxonomy she must maintain, hiding tasks unless they are perfectly labeled, or implying the grouping feature was the wrong direction.

## Hero anchor
`jtbd-move-the-few-things-that-matter` - Help me make real progress in the few areas I most want to grow.

## Job flow step
`job-flow-maya-move-family-life-forward` scores "See what matters" and "Know the next doable action" as 2. Kwilt now has grouping work on this branch for list scanning by Goal, Schedule, and Status, but the customer feedback points to a different gap: Kwilt does not yet help the user identify the lowest-friction next action from the context she is in, especially when the app may only partially know that context.

## Active anchors
- `jtbd-move-the-few-things-that-matter` - Context should reduce noise around what can move now with minimal friction.
- `jtbd-carry-intentions-into-action` - The primary need is carrying a captured intention into the moment where it can be acted on.
- `jtbd-capture-and-find-meaning` - Existing lightweight signals like tags, location, Activity type, and notes should help without making capture heavier.
- `jtbd-trust-this-app-with-my-life` - Any inferred context must be inspectable, reversible, and optional.

## Friction we're addressing
Grouping helps Maya scan a visible set, but it does not decide the lowest-friction action for her current situation. "Away from home" and "at my computer" are action contexts, not merely display groupings. If Kwilt pushes every context into the grouping drawer, grouping becomes too broad and users still have to open the app, choose the right lens, and scan before Kwilt helps.

## System alignment
Constraint posture: `Extend the system`

Current system facts:
- Existing surface: Activities has system/custom views, filters, sorts, the new list grouping control, Recommended, and Quick Add. Adjacent delivery surfaces include widgets, notifications, desktop, and future agent surfaces.
- Existing user flow: A user can open Activities, switch views, filter/sort, group the current list, and create Activities without required Arc/Goal setup. The current flow still assumes an in-app visit for most organization help.
- Existing domain/data model: Activity already has `tags`, optional `location`, `type`, schedule fields, `priorityState`, and saved `ActivityView` config. `ActivityViewGrouping` currently supports `none`, `goal`, `schedule`, and `status`.
- Existing technical affordances: Filters can already match tags, type, Goal, schedule, and status. Location trigger enrichment and manual location editing already exist for Activities.
- Existing UX/copy conventions: Capture stays first. `None` is neutral. Grouping is presentation only. Recommended hides when the user explicitly reshapes the list.

Constraints to preserve:
- Grouping remains a scan/presentation setting, not a durable semantic model for every action context.
- Context must not require perfect tags before an Activity is valid.
- Tags may be useful evidence, but tag hygiene and tag-view setup should not be assumed behavior for a busy user.
- Place learning should be based on repeated task/location evidence and user confirmation, not silent address surveillance.
- Location permission must remain optional and tied to explicit location-trigger value.
- Smart order and Recommended should eventually use context, but should not silently relabel Activities or assume the user opened Kwilt just to scan a list.

Constraints we may challenge:
- The current `ActivityView` filterable fields may be too field-shaped for context. "At computer" can be handled first by opening Kwilt Desktop rather than by mobile-side Mac presence detection or raw tag views.
- The current grouping menu may not be the right entry point for context, even though grouped rendering can still apply when a context result is shown as a list.

Design implication:
Treat context as a layer that selects or recommends the next action, then let grouping organize the result only when the result is a visible list. The smallest useful version should reuse existing tags, type, location, schedule, Recommended, and views before adding a heavy new model. Mobile place inference should start from patterns like "the user often completes grocery/shopping tasks here" and ask before saving the place.

## Aspirational design challenge
How might we help Maya identify the next thing she should do with the least amount of friction based on her current context, whether Kwilt knows that context automatically or she supplies it lightly, while preserving capture-first behavior and keeping grouping as a valid scan lens rather than a new setup system?

## Out of scope
Replacing the grouping feature, requiring always-on location permission, building a full tag taxonomy manager, implementing desktop presence detection, forcing an in-app visit as the only success path, or allowing AI to silently rewrite Goals, tags, schedules, or location data.

## Open question
What is the smallest surface that can deliver the contextual next action: a view/chip, a Recommended module, a widget/notification, or a first-class `actionContext` model that Kwilt can infer and explain?
