---
id: brief-explore-recorded-path-playback
title: Explore Recorded Path Playback
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-capture-and-find-meaning, jtbd-trust-this-app-with-my-life]
related_briefs: [explore-capability, explore-recap, explore-earned-terrain-and-trace]
owner: andrew
last_updated: 2026-08-03
---

# Explore Recorded Path Playback

## Context

Explore already retains timestamped route and altitude evidence, but completed recaps expose only point count, duration, and discovered Places. Deliberate recording should earn a richer, trustworthy memory without turning Explore into a fitness dashboard.

## Target audience

`audience-aspirational-family-organizers` values family outings that are easy to preserve and revisit without configuring a tracking system.

## Representative persona

Maya deliberately records a path because she wants an ordinary outing, errand, walk, or meaningful trip remembered accurately. The product must not require the outing to feel adventurous before it is worth preserving.

## Aspirational design challenge

How might we give Maya a deliberate outing record whose exact path and climbs she can depend on, while preserving truthful evidence, calm interaction, and private-by-default behavior?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — the outing is embodied family life, not a workout score.

## Job flow step

`job-flow-maya-move-family-life-forward`, step 8, delivery score 3: keep using the system because it feels helpful, not fussy. A dependable, revisitable result makes the explicit Start/Stop action worthwhile.

## JTBD framing

When Maya chooses to record an outing, help her preserve what actually happened and trust the result. The route, fog, and elevation must remain projections of retained evidence rather than repaired or inferred claims.

## Design

For one completed Recorded Path, the nonmodal recap receipt offers an explicit Review action. Review opens the continuous route and makes it the visual hero, supported by a compact elevation-by-distance profile and a single Replay/Pause control. Replay progressively projects the same presentation path onto the existing map and fog renderer; a marker and profile cursor advance together. Direct chart manipulation selects the corresponding playback progress, and map manipulation pauses playback. Missing altitude breaks the profile. Reduced Motion suppresses timed animation while retaining static and adjustable inspection.

Raw location samples remain private source evidence. Adjacent samples within roughly a quarter mile may be presented continuously when time, speed, and accuracy make the movement plausible. Only after explicit Review, bounded Apple Maps directions may replace the straight presentation segment with a validated road- or path-following reconstruction. The reconstruction is stored separately, never overwrites the recorded endpoints, and never rebuilds earned territory.

The learning slice is recap-only. Combined ambient recaps, all-time playback, workout statistics, route matching, speed controls, sharing, and a session library are excluded.

### UI contract

- Job: When a deliberate recording ends, the user needs to revisit its route and terrain so ordinary movement can remain a trustworthy memory.
- Primary action: Replay or pause the completed Recorded Path.
- Must show: completed route state, compact elevation profile when trustworthy, current playback position, Done.
- Reveal later: all-time playback, Place annotations, durable Recorded Paths history.
- Must not add: a new tab, setting, dashboard, score, speed selector, visible repair workflow, or fitness framing.
- Reuse map: existing `MapView`, fog geometry, altitude colors, recap guide plus explicit review drawer, `Button`, `Icon`, typography, and tokens.
- Behavior sources: timestamped session points; user-approved Replay plus chart scrubbing; existing recap completion semantics.
- Unresolved decisions: none that block the learning slice; durable post-recap access is intentionally deferred.
- Required states: completed, playing, paused/scrubbed, missing elevation, Reduce Motion, combined/non-deliberate recap, Apple reconstruction unavailable.
- Proof path: Record a Path on a signed iPhone, lock the screen for part of the route, then Stop Recording → nonmodal receipt → Review → Replay/Pause/scrub/pan/Close.

## Acceptance criteria

- A single completed internal `adventure`-policy recap with at least two route points offers Replay without exposing “Adventure” language.
- Plausible same-session samples up to a quarter mile apart render continuously instead of producing a routine visible gap.
- Bounded Apple Maps reconstruction follows available roads or paths, validates endpoints and detour length, and remains separate from raw points.
- Playback progresses through points by their recorded timestamps and finishes at the complete state.
- The map route, fog clearing, marker, and elevation cursor use the same playback frame.
- The profile uses cumulative route distance and trusted altitude; missing altitude does not become a measured line.
- Reduce Motion prevents timed playback and retains direct inspection.
- Combined or ambient recaps keep their existing recap behavior without playback controls.
- No persisted-state migration is required.

## Success signal

A signed-device Recorded Path produces a recognizable continuous route and terrain profile that can be replayed and scrubbed smoothly, while the user still understands the recap immediately and can dismiss it without interacting with playback.

## Spec refinement

The first slice deliberately supports playback only while the single manual recap is available. That proves the synchronized interaction without adding a session browser. The internal `adventure` policy remains a persistence detail while the surface says Record a Path, Recording, Explore Recap, and Recorded Paths. An all-time replay requires durable provenance and is not silently approximated from legacy data.

## Open questions

- After the interaction proves valuable, where should Recorded Paths be reopened without creating permanent navigation clutter?
