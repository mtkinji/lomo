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
  - explore-earned-terrain-and-trace
  - explore-nearby-places
  - explore-recap
status: shipping
last_reviewed: 2026-08-01
---

# explore

Turns explicitly recorded real-world movement into a private, persistent map of explored territory and meaningful Place visits.

## Surfaces in this folder

- `screens/ExploreMapScreen.tsx` - primary map, recording, fog, trail, and layer surface.
- Its single Places drawer separates foreground-only Nearby suggestions from canonical My Places. Suggestions neither clear fog nor enter visit history or Missions.
- Every outing renders a bounded high-contrast evidence trace. Creating a Place adds a soft familiarity bloom at three times the normal reveal radius without asserting a park boundary or an unobserved path.
- `domain/` - point acceptance, explored-cell geometry, elevation presentation, privacy projections, and Place relationships.
- `runtime/` - explicit foreground/background session recording, bounded placemark resolution, recap delivery, and local persistence.

## Notes

Explore remains local-only. Both manual outings and the explicit Always Exploring mode are designed to continue through screen lock. Their internal Adventure and Ambient policies adapt sampling to motion and accuracy, sleep after credible stillness, and retain a low-power exit wake condition in deep sleep. Recording mode never changes sharing, and remote family delivery remains unavailable until its trust and infrastructure contracts are implemented. Locked-screen wake reliability and battery behavior still require signed-device field proof.
