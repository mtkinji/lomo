---
feature: explore
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves:
  - jtbd-move-the-few-things-that-matter
  - jtbd-capture-and-find-meaning
  - jtbd-invite-the-right-people-in
  - jtbd-trust-this-app-with-my-life
briefs:
  - explore-capability
  - kwilt-labs-capability-gating
  - explore-recorded-path-playback
  - explore-earned-terrain-and-trace
  - explore-durable-history
  - explore-nearby-places
  - explore-recap
status: shipping
last_reviewed: 2026-08-01
---

# explore

Turns deliberate real-world movement into trustworthy Recorded Paths while sparse automatic observations build a private, persistent map of broadly explored territory and meaningful Place visits.

## Surfaces in this folder

- `screens/ExploreMapScreen.tsx` - primary map, recording, fog, trail, and layer surface.
- Its single Places drawer separates foreground-only Nearby suggestions from canonical My Places. Suggestions neither clear fog nor enter visit history or Missions.
- Deliberate Recorded Paths render a bounded high-contrast evidence trace. Automatic observations create isolated broad Silver Mist clearings and never assert an unobserved path. Creating a Place adds a soft familiarity bloom without asserting a park boundary.
- A single completed deliberate Recorded Path recap can replay its continuous presentation route and fog reveal while an elevation-by-distance profile tracks or scrubs the same playback position. Raw samples stay intact; bounded Apple directions can reconstruct plausible quarter-mile misses without exposing “Adventure” language.
- `domain/` - point acceptance, explored-cell geometry, elevation presentation, privacy projections, and Place relationships.
- `runtime/` - explicit foreground/background session recording, bounded placemark resolution, recap delivery, and local persistence.

## Notes

Explore remains local-first. Signed-in owner history is durably synchronized without changing location acquisition, while map rendering and offline capture continue from the device store. Deliberate recordings and automatic atlas building are designed to continue through screen lock, but they make different promises: Adventure requests dense observations for a trustworthy path; Ambient retains sparse observations that clear fog without forming a route. Both policies sleep after credible stillness and retain a low-power exit wake condition in deep sleep. Recording mode never changes sharing, and remote family delivery remains unavailable until its separate trust and revocation contracts are implemented. Locked-screen wake reliability, route fidelity, restore scale, and battery behavior still require signed-device field proof.
