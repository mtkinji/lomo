---
feature: search
audiences: [audience-burned-out-productivity-power-users]
personas: [Marcus]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves:
  - jtbd-capture-and-find-meaning
  - jtbd-move-the-few-things-that-matter
  - jtbd-trust-this-app-with-my-life
briefs:
  - global-search-findability
status: shipped
last_reviewed: 2026-08-06
---

# search

Helps Marcus find captured meaning and relevant commitments without manually maintaining a perfect system.

## Surfaces in this folder

- `GlobalSearchDrawer.tsx` - global search entry point for To-dos, Goals, Arcs,
  Chapters, and Recipes. Capability inventories can open it pre-scoped to their
  object type; Recipe results retain food imagery and cooking metadata.
- `searchAlgorithms.ts` - ranking and matching logic for local search.

## Notes

Search exists because capture should be loose. It should help users recover meaning from imperfect inputs rather than force up-front classification.
