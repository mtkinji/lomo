---
id: brief-global-search-findability
title: Global search findability
status: shipped
audiences: [audience-burned-out-productivity-power-users]
personas: [Marcus]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves: [jtbd-capture-and-find-meaning, jtbd-move-the-few-things-that-matter, jtbd-trust-this-app-with-my-life]
related_briefs: []
owner: andrew
last_updated: 2026-05-09
---

# Global Search Findability

## Context

Kwilt's capture-first posture only works if users can recover what they captured later. Global search is the shipped findability surface that helps users locate relevant Arcs, Goals, Activities, and supporting context without maintaining a perfect hierarchy.

## Target audience

`audience-burned-out-productivity-power-users` has often been burned by systems that require constant filing, tagging, and cleanup. Search matters because Marcus needs loose capture to stay useful after the moment has passed.

## Representative persona

Marcus remembers part of a commitment, note, activity, or goal, but not where he placed it. He needs search to help him recover the meaningful item quickly and trust that capture will not disappear into the system.

## Aspirational design challenge

How might we help Marcus find captured meaning from imperfect inputs, while preserving Kwilt's low-maintenance posture?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — Search supports the main job by making important commitments retrievable when Marcus is deciding what to move next.

## Job flow step

`job-flow-marcus-move-the-few-things-that-matter` names "Capture progress without maintaining the system" and "Review whether the work is still worth doing" as key steps. Search helps those steps by making captured work recoverable without up-front classification.

## JTBD framing

When Marcus cannot remember where something lives, he needs Kwilt to find the useful signal without asking him to rebuild the system. Search serves `jtbd-capture-and-find-meaning` by preserving value after loose capture, and `jtbd-trust-this-app-with-my-life` by proving the system can hold real context without losing it.

## Design

The Search feature includes the global search drawer and local ranking/matching logic. It should search across meaningful user objects and prioritize results that help the user continue work, inspect context, or return to what matters.

Search should be forgiving. It should support partial words, imperfect memory, and object names that evolve over time. It should not require users to know whether something is technically an Arc, Goal, Activity, or Chapter before they search.

The public docs translation should explain what search can find, how to use it, and why loose capture remains safe when search works well.

## Success signal

Marcus can recover a relevant captured item from a partial memory and continue moving the work without creating a new duplicate or abandoning the system.

## Open questions

- Which object types should be included in the first public search explanation?
- When should search become semantic or AI-assisted versus staying simple and local?
