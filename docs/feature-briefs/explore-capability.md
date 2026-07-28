---
id: brief-explore-capability
title: Explore capability
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-capture-and-find-meaning, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
related_briefs: [geolocation-activity-offers]
owner: andrew
last_updated: 2026-07-27
---

# Explore capability

## Context

Kwilt already understands task-linked location and private sharing, but it cannot preserve where a family has explored. Explore introduces an explicit, private-first adventure session that turns movement into a retained map without claiming production background tracking or family sync before those systems exist.

## Target audience

Aspirational family organizers who want technology to make shared life more meaningful without another system to manage.

## Representative persona

Maya wants her family’s walks, outings, and discoveries to accumulate into something they can recognize and revisit. She needs absolute clarity about location collection and visibility.

## Aspirational design challenge

How might we help Maya and her family explore their world together and remember where life took them, while preserving calm, legible control over sensitive location history?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` - family exploration is an embodied expression of the life the household wants to live together.

## Job flow step

`job-flow-maya-move-family-life-forward`, family participation, currently 2/5. Explore tests whether a playful shared surface can strengthen participation without creating household admin.

## JTBD framing

When my family moves through the world, I want Kwilt to preserve where we explored and the meaningful places we reached, so we can find meaning in lived experience and invite one another in without losing privacy.

## Design

Explore is a feature-flagged named capability in the global menu. Its first functional release provides adventure recording, a pale layered fog field with feathered approximately 30.48-meter clearings, altitude-colored route segments, versioned local persistence, a restrained map-options control, and a canonical Place/person-Place visit model.

Recording, sharing, and viewing are independent:

- recording controls what this device remembers;
- sharing controls the maximum projection another person may receive;
- viewing controls which permitted layers appear locally.

The first release implements recording and viewing locally. It models sharing but does not transmit location data. Family layers use honest empty/unavailable states until an authenticated backend with RLS, retention, deletion, and revocation exists.

### UI contract

- Job: When I am heading out, I need to start an exploration session and see the world reveal, so the outing becomes a meaningful retained map.
- Primary action: Start Exploring / Stop.
- Must show: standard Kwilt page header, map, visibly atmospheric fog, current recording state, personal trail, and map-options entry point.
- Reveal later: privacy controls, prior adventures, and Place visits.
- Must not add: dashboard, completion percentage, leaderboard, streak, public feed, or background promise.
- Reuse map: capability shell, PageHeader, MapKit MapView, Button/Icon primitives, BottomDrawer.
- Behavior sources: 100-foot reveal and altitude trail are explicit user decisions; private default and permission timing come from Kwilt trust contracts.
- Required states: permission not requested, denied, locating, recording, stopped/empty, persisted route, and family unavailable.
- Proof path: global menu to Explore on an iPhone simulator, start with simulated location, receive movement, stop, relaunch, and inspect retained map.

### Domain model

- `ExplorePoint`: accepted coordinate, altitude, accuracy, and timestamp.
- `ExploredCell`: coarse territory projection derived from a point.
- `ExploreSession`: explicit recording boundary and ordered points.
- `Place`: canonical named geographic entity.
- `UserPlaceRelationship`: per-user visit and sharing metadata for that Place.
- `ExplorePreferences`: recording, sharing, and viewing controls.

## Success signal

A real or simulated outing visibly clears fog, draws a meaningful altitude-colored route, persists after relaunch, and leaves the user able to explain exactly what was recorded and shared.

## Open questions

- Which tile/cell resolution best balances organic reveal and storage?
- What real Place provider and confirmation threshold should back automatic collection?
- Which household identity should own Explore sharing outside Money?
- What evidence justifies adding continuous background location capability?

## Spec refinement

The first build is intentionally foreground-only and local-first. “Family” controls describe and persist the privacy contract but do not imply remote data exists. Named Place visits are represented in the shared conceptual model; automatic POI lookup is deferred. Runtime completion requires a simulator or signed-device path, not unit tests alone.
