# Frame: tag-groups

## What the user said

> We are going to improve the tagging system so that users can effectively group by tags.
>
> The issue now is that most AI tagging adds multiple tags, and grouping in multi-tag scenarios introduces a bunch of complex logic to sort out.
>
> The insight is the one of my users says she wants to use tags to sort to-dos into groups like "Groceries" so that when she is at the store, she can pull up that group and have them all together.
>
> I feel like our tagging system is a bit immature. I don't know if tags get saved to a tag inventory, if the system has a preference or mechanics to push towards tag reuse, and I think the tag field itself may have some odd or immature height/spacing patterns.

## Restated in user voice

When I am in a real-life context like the grocery store, I want to open the relevant group of to-dos without rebuilding a view or remembering search syntax, so that captured family errands become useful at the moment I can act on them.

## Target audience

`audience-aspirational-family-organizers` - Aspirational family organizers need Kwilt to make ordinary family tasks feel findable and usable without power-user setup.

## Representative persona

Maya is a mother helping her family use Kwilt because it has already proven useful in ordinary life.

- Current situation: She has captured family errands and household to-dos over time.
- What she's trying to become/do: Keep family life moving without maintaining a task-management methodology.
- Emotional state or tension: She trusts capture, but crowded lists still require re-orientation.
- What would make this feel wrong to her: Asking her to design complex filters, manage multi-tag grouping rules, or accept AI-created labels she does not recognize.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - Maya needs help making real progress on ordinary commitments that keep family life moving.

## Job flow step

`job-flow-maya-move-family-life-forward`

- Step: Trust that the to-do will not disappear into a pile.
- Step: See what matters, what can wait, and what is blocked.
- Current product flow: Activities persist; system and custom views exist; tags can be filtered in views.
- Delivery score: 3 for "trust it won't disappear"; 2 for "see what matters."
- Gap: Views and tags can technically support retrieval, but the user has to know the right configuration and the tag vocabulary can drift.

## Active anchors

- `jtbd-move-the-few-things-that-matter` - Tag groups matter only if they help the user act on the few ordinary things that matter in context.
- `jtbd-carry-intentions-into-action` - The grocery-store moment turns captured intentions into immediate action.
- `jtbd-capture-and-find-meaning` - Capture stays valuable only if the user can find the item later without admin work.
- `jtbd-trust-this-app-with-my-life` - AI-created tags must be stable, explainable, and reusable enough to trust.

## Friction we're addressing

The product already stores activity tags and persists a tag-history index. The problem is that tags are still treated like lightweight metadata, while the user is asking for a simple retrieval object: "Groceries." Multi-tag list grouping would create confusing sectioning rules, especially when AI adds several tags per to-do. The better frame is tag groups, not arbitrary grouping by every tag on every item.

## System alignment

Constraint posture: `Fit the system`

Current system facts:

- Existing surface: Activities list, custom views, grouping drawer, filter drawer, Activity detail tags field, Quick Add dock.
- Existing user flow: A user can create tag filters through views; Quick Add inherits tag filters so new items appear in the current tag-filtered view.
- Existing domain/data model: `Activity.tags` is a string array; `activityTagHistory` persists tag usage, recent examples, and total uses.
- Existing technical affordances: AI workspace snapshots include tag history and instruct reuse; filters already support `field: tags`, `operator: in`; list grouping currently supports `none`, `goal`, `schedule`, and `status`.
- Existing UX/copy conventions: Avoid dashboards and productivity-app setup language; preserve capture-first behavior; keep AI changes transparent.

Constraints to preserve:

- Capture must never require choosing a tag.
- Tags remain simple strings for now.
- Custom views can stay the advanced machinery; the main retrieval path should be simpler.
- Grouping should not duplicate one multi-tag item into several sections in the default list.

Constraints we may challenge:

- The tag editor can move from comma text toward reusable chips and suggestions.
- AI can shift from "add up to five tags" toward "choose one primary grouping tag when the user intent is retrieval."
- A tag-filtered view can be presented as a "Tag Group" without creating a new domain object in V1.

Design implication:

V1 should make a single tag feel like a lightweight group: discoverable from tag inventory, reusable by AI, easy to open, and easy to add into from Quick Add. We should avoid "group by tags" sectioning until there is a strong reason to solve multi-membership display rules.

## Aspirational design challenge

How might we help Maya pull up a familiar group like Groceries at the moment she can act, while preserving capture-first simplicity and avoiding a power-user tagging system?

## Out of scope

- Multi-tag sectioning where one to-do appears under every tag.
- A full tag management/admin screen with merge, archive, color, and hierarchy.
- AI silently retagging existing to-dos.
- Location-triggered automatic opening of tag groups.

## Open question

Should tag groups be available to all users as core retrieval, even if advanced custom views remain a Pro tool?
