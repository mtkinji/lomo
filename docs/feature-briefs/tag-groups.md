---
id: brief-tag-groups
title: Tag Groups For To-Do Retrieval
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action, jtbd-capture-and-find-meaning, jtbd-trust-this-app-with-my-life]
related_briefs: [todo-organization-triage, todo-list-grouping-config]
owner: andrew
last_updated: 2026-06-25
---

# Tag Groups For To-Do Retrieval

## Context

A user wants to use tags to sort to-dos into practical groups like Groceries so she can pull that group up when she is at the store. Kwilt already stores tags on Activities, persists `activityTagHistory`, feeds tag history into AI workspace snapshots, supports tag filters in views, and lets Quick Add inherit tag filters. The gap is product shape: tags are metadata and advanced filter inputs, not simple openable groups.

## Target audience

Aspirational family organizers need ordinary family tasks to be findable in real-life contexts without learning a productivity system. This matters for users whose captured errands, household follow-ups, and commitments become useful only when they can retrieve the right subset at the right moment.

## Representative persona

Maya has a growing set of family to-dos in Kwilt. She is not trying to maintain a taxonomy; she wants "Groceries" to behave like a familiar group she can open at the store.

## Aspirational design challenge

How might we help Maya pull up a familiar group like Groceries at the moment she can act, while preserving capture-first simplicity and avoiding a power-user tagging system?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` - The demand spine is helping Maya make progress on ordinary commitments that keep family life moving.

## Job flow step

`job-flow-maya-move-family-life-forward` scores "Trust it won't disappear" as 3 and "See what matters" as 2. Tags can technically support retrieval, but only through advanced view/filter machinery and a vocabulary that can drift when AI creates multiple broad tags.

## JTBD framing

When I am in a real-life context like the grocery store, I want to open the relevant group of to-dos without rebuilding a view or remembering search syntax, so that captured family errands become useful at the moment I can act on them.

## Design

### Product posture

Build tag groups as filtering/saved-view lenses, not "group by tags" list sectioning. A tag group is a focused Activity surface backed by one tag filter. It is derived from existing tags and tag history, so it does not need a new backend inventory table in V1.

Filtering and grouping have separate jobs. Filtering answers "show me Groceries." Grouping answers "inside this visible list, section items by schedule, status, or goal." A multi-tag Activity can appear in multiple tag-filtered lenses across separate visits, but it should not be duplicated into multiple tag sections in the same list.

### Core behavior

- Derive tag-group candidates from `activityTagHistory` and current Activities.
- Let the user open a single tag group from the Activities list.
- Apply a tag filter equivalent to `field: "tags"`, `operator: "in"`, `value: ["Groceries"]`.
- In filter editing, choose tags from a searchable existing-tag picker instead of typing tag names into a blank text field.
- Keep Quick Add inside that group inheriting the tag so new items appear in the group.
- Improve Activity detail tags with existing-tag suggestions and compact chip behavior.
- Update AI/fallback tagging rules so reusable group labels win over broad synonyms.
- Leave saved/custom views as the richer filter container; tag groups are the lightweight on-ramp for common single-tag lenses.

### AI behavior

AI should prefer existing tag history before inventing a tag. When the user's intent is grouping or retrieval, AI should usually choose one primary reusable group tag and avoid spraying several generic tags. If the user has or names Groceries, the system should preserve Groceries instead of mapping it to errands.

### Data model

V1 reuses:

- `Activity.tags: string[]`
- `activityTagHistory`
- `ActivityView.filters`
- existing tag filter defaults for Quick Add

Do not add:

- tag hierarchy
- colors
- tag ownership/admin metadata
- primary-tag storage
- merge/archive/delete flows

### UI

The Activities surface should expose a compact Tags entry point once there is tag history. It can start as a drawer or menu of recent/frequent tag groups. Activity detail should keep freeform tags but no longer rely only on comma text; suggested reusable chips should be available from tag history.

### Rejected behavior

Do not add list grouping where one multi-tag to-do appears under every tag. Do not pick an invisible winner tag for grouping. Do not silently retag existing Activities. Do not make tags required at capture time.

## Success signal

A user can open Groceries, add a new grocery item inside that group, and find it later without creating a custom view. AI-created tags reuse the user's existing group vocabulary often enough that the user does not have to clean up variants.

## Spec refinement

Implementation should start with deterministic logic and tests because tag derivation, filter construction, fallback suggestion, and Quick Add inheritance affect user-visible behavior. UI can be implementation-first as long as branchy tag-ranking logic is extracted and tested.

Acceptance criteria:

- Tag-group candidates are ranked by useful existing signal, such as recent use, total use, and current open to-do count.
- A tag group always maps to exactly one tag value in a filter.
- Opening a tag group does not duplicate Activities under multiple tags.
- Quick Add inside a tag group persists the selected tag on new Activities.
- Existing tag suggestions appear before freeform creation in Activity detail.
- The Tags filter value row searches existing tag history/activity tags, supports selecting multiple tags as chips, and keeps partial-text matching as an explicit fallback operator.
- `grocery` and `groceries` preserve or suggest `Groceries`/`groceries` when that is the intended group, rather than collapsing to `errands`.
- AI prompt text and deterministic fallback both favor reuse and sparse grouping tags.

Open implementation questions:

- Where should the tag group entry point live in the Activities chrome?
- Should tag groups be core/free while advanced custom views remain Pro?
- Should tag labels be included in analytics at all, or only source/count metadata?

## Open questions

- Should frequently used tag groups eventually become system views?
- Does Kwilt need a true tag inventory table after user-visible rename/merge/archive becomes necessary?
- Should a later version support primary grouping tag plus secondary descriptive tags?
