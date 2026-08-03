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

- Route presentation reuses the bounded, topology-preserving geometry used by Silver Mist rather than creating one unbounded MapKit overlay per raw point pair.
- Each continuous trace receives a high-contrast casing that remains visible across hybrid/satellite map content.
- Altitude color remains an inner stroke built from the same bounded segments.
- Separate sessions always remain separate. Adjacent observations up to 60 meters apart connect directly; a 60-to-120-meter freeway gap connects only when its timestamps, recorded speed, and location accuracy make that displacement plausible within five seconds. Every other larger or stale gap remains separate. Simplification may remove redundant observations but may not bridge an untrusted gap.

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
- Must show: exact contrast-backed trace, fully clear narrow corridor, and one softer bloom around each user-created Place.
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
