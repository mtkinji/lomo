---
id: brief-tag-vocabulary-system
title: Tag Vocabulary System
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action, jtbd-capture-and-find-meaning, jtbd-trust-this-app-with-my-life]
related_briefs: [tag-groups, todo-list-grouping-config, todo-organization-triage]
owner: andrew
last_updated: 2026-06-26
---

# Tag Vocabulary System

## Context

Tag groups and tag filters help Maya retrieve to-dos like Groceries, but the system still assumes a small, clean vocabulary. As tag count grows, Kwilt needs to help the user reuse existing tags while creating to-dos, search the full tag vocabulary while filtering or browsing, and eventually clean up tag drift without asking Maya to maintain a taxonomy.

## Target audience

Aspirational family organizers need ordinary household and family tasks to stay findable in real-life contexts. Tags matter when they behave like familiar handles: Groceries, School, Home, Calls, Errands.

## Representative persona

Maya has a growing family to-do list. She wants to feel more organized, but she does not want to administer a task-management system or teach family members a tagging methodology.

## Aspirational design challenge

How might we help Maya keep family to-dos retrievable through familiar tags like Groceries, while preserving capture-first simplicity and avoiding a power-user taxonomy chore?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` - The demand spine is helping Maya make progress on ordinary commitments that keep family life moving.

## Job flow step

`job-flow-maya-move-family-life-forward` scores "Trust it won't disappear" as 3 and "See what matters" as 2. Tags can improve both steps if they become reusable retrieval handles rather than ad hoc strings.

## JTBD framing

When Maya is capturing or organizing ordinary family to-dos, she wants Kwilt to remember and surface the tags she already uses, so that recurring groups like Groceries stay findable without making her maintain a productivity taxonomy.

## Design

### Product posture

Treat tags as a reusable vocabulary layer across capture, filtering, and retrieval. Do not start with a heavy tag manager. The first product move is to make existing tags easier to find and reuse wherever tags are added or selected.

### Core behavior

- Activity detail tag entry searches existing tags before creating new ones.
- The tag-group drawer keeps the top five tags visible and offers a searchable "View all" browser for larger vocabularies.
- The Filter drawer tag value picker uses the same tag option ranking as Activity detail.
- AI tag suggestions and deterministic fallback suggestions prefer matching existing tags before inventing new ones.
- New tag creation remains available, but only after existing matches have been presented.

### Ranking

Rank tag suggestions by:

1. Exact/prefix text match.
2. Active open to-do count.
3. Recent use.
4. Total use.
5. Stable alphabetical fallback.

### Data model

V1 can keep using:

- `Activity.tags: string[]`
- `activityTagHistory`
- existing tag filters and tag groups

The implementation should centralize tag option building so a later inventory object can replace the backing source without redesigning every surface.

Future inventory fields, if needed:

- id
- label
- normalized key
- aliases
- hidden/archived state
- total use
- active count
- last used
- recent examples

### Rejected behavior

- No required tags at capture.
- No nested tags.
- No tag colors/descriptions in V1.
- No silent bulk retagging.
- No tag health dashboard or cleanup queue.

## Success signal

A user with more than 20 tags can add a grocery-related to-do, select the existing Groceries tag from search, and later open the Groceries group from the tag browser without manually typing a filter.

## Spec refinement

Build from shared pure logic first. Tag option ranking, exact-match detection, dedupe, and "use new tag" behavior should be test-covered before wiring UI surfaces.

Acceptance criteria:

- Activity detail exposes existing-tag search while editing tags.
- Tag suggestions dedupe case-insensitively and preserve canonical display labels.
- New tag creation is available only as an explicit fallback row/action.
- Tag Groups drawer supports search across all known tags, not only the top five.
- Filter drawer and Activity detail use the same tag option ranking helper.
- AI/fallback tag suggestions prefer existing tags when a likely match exists.
- Raw tag labels are not logged in analytics by default.

Open implementation questions:

- Should tag search live inline below the Activity detail chip input, in a drawer, or in a compact popover-style list?
- Should "hidden" tags be part of the first inventory-like model, or wait for rename/merge/archive work?
- Should exact aliases like Grocery -> Groceries be deterministic for common singular/plural pairs, or user-confirmed only?

## Open questions

- What usage threshold proves we need true rename/merge/archive?
- Should some tags be pinnable as Activity view shortcuts?
- Should family/shared Activities eventually have shared tag vocabulary rules?
