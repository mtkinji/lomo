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

Turns deliberate real-world movement into trustworthy Recorded Paths while sparse automatic observations independently build a private, persistent map of broadly explored territory and meaningful Place visits.

## Surfaces in this folder

- `screens/ExploreMapScreen.tsx` - primary map, recording, fog, trail, and layer surface. New locations follow automatically until a map gesture suspends following; the location arrow explicitly resumes it.
- Its single Places drawer separates foreground-only Nearby suggestions from canonical My Places. Suggestions neither clear fog nor enter visit history or Missions.
- Deliberate Recorded Paths render an observed trace with a fixed one-meter simplification bound, stable native overlays across viewport changes, and shared foreground outline/color segments. On iOS, completed deliberate history is one green-to-mint personal path heatmap without per-trip outlines. Each completed outing contributes once per covered location; repeat outings brighten the fixed-width line toward a bounded pale mint. A narrow dark edge preserves contrast, while fog clearing remains unchanged; only the active or reviewed journey receives elevation color and casing. Review stays selected at 100% playback and excludes its entire journey from background history. Round stroke caps/joins preserve observed vertices; recording endpoints and selected gap copy explain evidence boundaries. Android retains its existing renderer; timestamp outages and weak or implausible evidence split the line. Trustworthy consecutive Ambient observations clear a continuous Silver Mist corridor without drawing a Recorded Path line; implausible acquisition gaps remain visible. Creating a Place adds a soft familiarity bloom without asserting a park boundary.
- A single completed deliberate Recorded Path recap can replay its continuous presentation route and fog reveal while an elevation-by-distance profile tracks or scrubs the same playback position. Raw samples stay intact. Apple directions estimates are excluded from recorded travel and no longer requested when opening a recap.
- `domain/` - point acceptance, explored-cell geometry, elevation presentation, privacy projections, and Place relationships.
- `runtime/` - explicit foreground/background session recording, bounded placemark resolution, recap delivery, and local persistence.

## Notes

Explore remains local-first. Signed-in owner history is durably synchronized without changing location acquisition, while map rendering and offline capture continue from the device store. Deliberate recordings and automatic atlas building are designed to continue through screen lock, but they make different promises: Adventure temporarily takes over acquisition for dense observations requesting navigation accuracy every meter or second, retaining movement at three-meter spacing and a trustworthy recorded path; Ambient resumes afterward with sparse observations that clear fog without forming a route. Ambient exploration is independently controllable, never hides the Record a Path action, and never changes sharing. Deliberate recording stays active through stillness to capture departure; Ambient retains its soft/deep-sleep policy. Native foreground/background transitions are serialized so a late foreground watcher cannot replace background capture after lock. Remote family delivery remains unavailable until its separate trust and revocation contracts are implemented. Locked-screen wake reliability, route fidelity, restore scale, and battery behavior still require signed-device field proof.
