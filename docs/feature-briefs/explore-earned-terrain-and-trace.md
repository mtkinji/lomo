---
id: brief-explore-earned-terrain-and-trace
title: Explore Place-earned terrain and trustworthy trace
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-capture-and-find-meaning, jtbd-trust-this-app-with-my-life, jtbd-invite-the-right-people-in]
related_briefs: [brief-explore-capability]
owner: andrew
last_updated: 2026-08-01
---

# Explore Place-Earned Terrain And Trustworthy Trace

## Context

Real hiking showed two connected gaps: a backcountry outing feels underrepresented by the narrow clear corridor, and the exact path can fail to appear even while fog continues to clear. The map needs to express experienced terrain generously while making its route evidence more dependable, not less truthful.

## Target audience

`audience-aspirational-family-organizers` — families who want outings to become durable memory without configuring or administering another system.

## Representative persona

Maya is hiking with her family. She wants the landscape to feel earned, but she will reject a map that invents where they went or quietly turns location history into a game or surveillance surface.

## Aspirational design challenge

How might we help Maya recognize a landscape that mattered enough to name, while preserving an unmistakable and trustworthy record of where she actually traveled?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — meaningful time together is part of the family life Maya is actively trying to create.

## Job flow step

`job-flow-maya-move-family-life-forward`, step 7: family participation, delivery score 2. Explore can turn a shared outing into a legible family artifact, but today the route presentation and terrain semantics are not dependable enough.

## JTBD framing

When my family explores a park or the backcountry, help me capture what we actually did and recognize the landscape we experienced, while keeping observed route evidence distinct from broader interpreted territory and private until we choose otherwise. This serves `jtbd-capture-and-find-meaning`, `jtbd-trust-this-app-with-my-life`, and eventually `jtbd-invite-the-right-people-in`.

## Design

Constraint posture: `Extend the system`.

### Evidence line

- Recorded travel uses its own fixed one-meter simplification bound. It does not share Silver Mist's geometry budget. Native chunks retain a shared endpoint and never imply a recording gap.
- On iOS, completed deliberate history forms one quiet green coverage layer with no per-trip casing. Repeated travel within one outing does not increase heat; separate outings brighten the fixed-width line toward pale mint. Nearby distinct observations are not snapped together. Heat never changes fog clearing.
- Only the active deliberate recording or one reviewed completed journey receives an elevation-colored foreground stroke and thin white casing. Active recording wins. Review remains selected at full playback progress, and the entire reviewed journey is excluded from background history during scrubbing.
- Native stroke caps and joins are round; geographic vertices are not rounded or interpolated. The current heatmap trial uses a 4-point green core with a 6-point combined dark edge at 0.94 opacity (0.62 with foreground). Each outing blends 16% toward pale mint, approaching a fixed color ceiling. Foreground remains 4.5 points with a 6.5-point casing.
- Separate sessions and missing observations remain separate. Ordered observations must be at most ten seconds and 100 meters apart, with acceptable accuracy and plausible displacement. No road matching or repaired legacy geometry is implied.
- A selected journey has at most a recording-start and recorded-end marker; active recording uses the existing live location indicator. Genuine gaps receive a short explanation in the existing review drawer.
- Android retains its existing trace presentation pending separate native history parity. My Path hides both iOS layers; Silver Mist and Places remain independent.

### Place-earned terrain

- Creating a Place with the existing **Name current Place** action creates a soft familiarity bloom centered on that Place.
- The bloom radius is exactly three times the normal 65-foot reveal radius: 195 feet / 59.436 meters.
- The existing exact route corridor remains fully clear. The wider Place bloom only thins Silver Mist, so it cannot be read as an exact path or footprint.
- Adventure sessions, ambient sessions, and automatically discovered Apple Maps Places retain the normal narrow reveal unless the user creates a Place.
- Only the current user's bounded set of user-created Places is sent to the native renderer.
- The feature does not claim knowledge of park boundaries. Authoritative park polygons require a later provider, confidence, attribution, privacy, and oversized-park decision.

### UI contract

- Job: When I complete an intentional outdoor outing, I need the map to recognize the terrain I experienced while showing exactly where Kwilt observed me, so the result feels meaningful and trustworthy.
- Primary action: existing **Name current Place**.
- Must show: quiet explored history, one contrast-backed current or reviewed trace, the narrow clearing corridor, and one softer bloom around each user-created Place.
- Reveal later: park names or boundaries only after a separate trustworthy data-source decision.
- Must not add: mode toggle, terrain setting, acreage, percent complete, badge, streak, legend, new onboarding, or park claim.
- Reuse map: existing Explore map, Place relationship, Silver Mist renderer, and My Path preference.
- Behavior sources: route evidence from canonical session points; broad reveal from an explicit user-created Place.
- Unresolved decisions: fixed radius may change after signed-device learning.
- Required states: user-created Place, automatically discovered Place, no Place, separate sessions, greater-than-60-meter gap, fog hidden, and My Path hidden.
- Proof path: focused Jest, changed-file verification, patch application, native map build/shader compile, Simulator preview, then signed-device hike.

## Success signal

A long outing keeps its route visibly continuous, and creating a Place immediately adds a clearly softer three-times-radius bloom without changing the evidence line or requiring another control.

## Learning release and evaluation

The first channel is a local build. The behavior is derived and reversible, adds no upload or analytics, and must be evaluated on a signed iPhone before a real-world reliability claim. See the paired design exploration's `04-learning-release.md` and `05-evaluate-learning.md`.

## Spec refinement

- Decision: the explicit creation of a Place is a more honest signal of meaning than classifying an outing as a hike or relying on Adventure mode.
- Assumption: three times the normal reveal radius is a learning value, not a permanent product constant.
- The implementation must bound both fog and path render primitives; merely adding a fallback stroke to the existing unbounded overlay list does not resolve the diagnosed failure mode.
- The implementation must preserve altitude presentation without making it the only visible evidence line.
- Acceptance evidence: red-green screen tests for bounded route traces, user-created Place-only bloom props, and the three-times radius; native patch contract tests; repository changed-file verification.
- Deferred: exact visual tuning and real-world battery/thermal/relaunch proof require the signed-device lane.

## Open questions

- Does signed-device use support the three-times-radius bloom, or should familiarity deepen through repeat visits in a later release?
