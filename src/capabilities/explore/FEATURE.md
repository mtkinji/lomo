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
  - explore-recap
status: shipping
last_reviewed: 2026-07-28
---

# explore

Turns explicitly recorded real-world movement into a private, persistent map of explored territory and meaningful Place visits.

## Surfaces in this folder

- `screens/ExploreMapScreen.tsx` - primary map, recording, fog, trail, and layer surface.
- `domain/` - point acceptance, explored-cell geometry, elevation presentation, privacy projections, and Place relationships.
- `runtime/` - explicit foreground/background session recording, bounded placemark resolution, recap delivery, and local persistence.

## Notes

Explore remains local-only. Both manual outings and the explicit Always Exploring mode continue through screen lock using an efficient background profile; recording mode never changes sharing, and remote family delivery remains unavailable until its trust and infrastructure contracts are implemented.
