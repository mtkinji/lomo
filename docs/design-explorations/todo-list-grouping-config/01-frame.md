# Frame: To-Do List Grouping Config

## What the user said
> I want to add a "Grouping" config to the to-do list. Help me start by writing the feature spec

## Restated in user voice
When my Kwilt to-dos have become crowded, I want to choose the shape that makes the list easiest to scan right now, so that I can find the next meaningful action without maintaining another task-management system.

## Target audience
`audience-aspirational-family-organizers`: Everyday family organizers who want Kwilt to make ordinary family and personal to-dos feel organized without requiring a productivity methodology.

## Representative persona
Maya: Maya is a mother helping her family use Kwilt because it has already proven useful in ordinary life. She is not a productivity power user and does not want to tune a complex view system before she can act.

- Current situation: Maya has many Activities, some tied to Goals, some scheduled, some waiting on other people, and some intentionally unanchored.
- What they're trying to become/do: Re-enter the list, understand the shape of the work, and move one honest next action.
- Emotional state or tension: She wants help feeling organized, but too many filters and settings would make Kwilt feel like another system to manage.
- What would make this feel wrong to them: Defaulting to a dense project-management view, treating ungrouped work as failure, or letting grouping fight with Smart order and Recommended.

## Hero anchor
`jtbd-move-the-few-things-that-matter` - Help me make real progress in the few areas I most want to grow.

## Job flow step
`job-flow-maya-move-family-life-forward` scores "See what matters" and "Know the next doable action" as 2. Kwilt can capture to-dos and has system/custom views, but crowded lists do not yet offer a clear presentation model for scanning by Goal, schedule, status, or other meaningful dimensions.

## Active anchors
- `jtbd-move-the-few-things-that-matter` - Grouping should reduce list noise around important commitments.
- `jtbd-carry-intentions-into-action` - Grouping should help the user get to a doable action, not only organize for its own sake.
- `jtbd-capture-and-find-meaning` - Activities without a Goal or schedule must remain first-class grouping outcomes.
- `jtbd-trust-this-app-with-my-life` - Grouping should be predictable, reversible, and honest about what it changes.

## Friction we're addressing
Smart order can make the default list feel helpful, but a user may still need a visual lens for scanning a crowded set. Existing custom views and sorts answer part of that need, but grouping is a separate presentation concern: it changes sectioning, not the underlying Activity state or the sort/rank logic. Without clear rules, grouping could accidentally undermine Smart order, Recommended, or the calm Activities model.

## Aspirational design challenge
How might we help Maya choose a simple, trustworthy sectioning lens for a crowded to-do list, while preserving capture-first behavior and keeping Smart order as the default organizing intelligence?

## Out of scope
Kanban board redesign, desktop-only power views, AI-generated grouping suggestions, bulk Activity mutation, new Goal/Arc assignment flows, and making grouping the default for All to-dos.

## Open question
Should grouping be stored as a per-view configuration only, or should the Activities screen also remember an unsaved local grouping preference for system views?
