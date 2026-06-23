# Frame: To-Do Organization Triage

## What the user said
> Last night, one of my customers lamented, "I have so many to-dos in Kwillt... I need a better way to organize them."
>
> She didn't know about the views system, and hadn't really tried it out yet. But at the same time, the views system doesn't really respond to what she needs.
>
> I think we need to treat this as a full-on design thinking sprint.

## Restated in user voice
When my Kwilt to-dos have accumulated into a pile, I want the app to already know what deserves attention, what can wait, and what needs clarification, so that I can keep moving the few things that matter without rebuilding another task-management system.

## Target audience
`audience-aspirational-family-organizers`: Everyday family organizers who are using Kwilt because it helps and want the app to make family/personal to-dos feel more organized without requiring a productivity methodology.

## Representative persona
Maya: Maya is a mother helping her family adopt Kwilt because it has already been useful. She is not a productivity power user; she wants the app to help her become more organized in ordinary family life.

- Current situation: Maya has many Activities in Kwilt, some scheduled, some blocked by family or outside constraints, some unanchored, and some connected to active Goals.
- What they're trying to become/do: Keep family and personal commitments visible enough that the next doable action is obvious.
- Emotional state or tension: She is hopeful because Kwilt has helped, but the to-do list is starting to feel like it needs more organization.
- What would make this feel wrong to them: Power-user setup language, a generic productivity dashboard, or AI silently reorganizing family commitments.

## Hero anchor
`jtbd-move-the-few-things-that-matter` - Help me make real progress in the few areas I most want to grow.

## Job flow step
Maya job flow steps "See what matters" and "Know the next doable action" are both scored 2. Kwilt captures to-dos well, but crowded Activities do not yet organize themselves around priority, actionability, scheduling, and family constraints.

## Active anchors
- `jtbd-move-the-few-things-that-matter` - The work should reduce list noise and make important commitments visible.
- `jtbd-carry-intentions-into-action` - The organizing pass should end in a concrete next move, not just a cleaner archive.
- `jtbd-capture-and-find-meaning` - Capture must stay lightweight and unanchored Activities must remain first-class.
- `jtbd-trust-this-app-with-my-life` - AI or bulk organization must be previewed, reversible, and calm.

## Friction we're addressing
The existing views system lets users filter and sort Activities, including system views for All to-dos, Due today, and Past due, plus custom views for Pro users. But Maya's need starts one layer earlier: she should not have to know what organizational shape would help. Kwilt should infer priority/actionability first, then let views reflect that judgment in plain everyday language.

## Aspirational design challenge
How might we help Maya open a crowded Activity list, find it already organized around the next honest, possible action, and easily re-prioritize when she knows better, while preserving capture-first behavior and avoiding productivity-app setup work?

## Out of scope
Desktop-first power views, global project-management dashboards, automatic Arc/Goal reassignment, and fully autonomous AI cleanup.

## Open question
Should the global priority model be computed at read time, persisted as re-prioritizable Activity metadata, or split between computed defaults and explicit user changes?
