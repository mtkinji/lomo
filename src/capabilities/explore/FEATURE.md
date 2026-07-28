---
feature: explore
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves:
  - jtbd-capture-and-find-meaning
  - jtbd-invite-the-right-people-in
  - jtbd-trust-this-app-with-my-life
briefs:
  - explore-capability
status: shipping
last_reviewed: 2026-07-27
---

# explore

Turns explicitly recorded real-world movement into a private, persistent map of explored territory and meaningful Place visits.

## Surfaces in this folder

- `screens/ExploreMapScreen.tsx` - primary map, recording, fog, trail, and layer surface.
- `domain/` - point acceptance, explored-cell geometry, elevation presentation, privacy projections, and Place relationships.
- `runtime/` - foreground location recording and local persistence.

## Notes

The first learning release is local and foreground-only. Remote family delivery and background recording remain intentionally unavailable until their trust and infrastructure contracts are implemented.
