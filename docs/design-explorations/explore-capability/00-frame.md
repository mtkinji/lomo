---
title: "Frame: Explore capability"
last_updated: 2026-07-27
---

# Frame: Explore capability

## What the user said

> Build a private-first family exploration capability in Kwilt: moving through the real world clears a roughly 100-foot fog-of-war radius, trails change color with altitude, visited named places become part of the same Places system, and each person controls recording, sharing, and viewing.

## Restated in user voice

When my family moves through the world, I want Kwilt to preserve where we have explored and the meaningful places we have reached, so our ordinary movement becomes a shared record of adventure without turning anyone into a surveillance subject.

## Target audience

`audience-aspirational-family-organizers` - families who want a shared rhythm without another system to administer.

## Representative persona

Maya wants technology to make family life feel more connected and memorable. She will reject unclear location access, default sharing, or a map that quietly exposes more than each person intended.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - embodied family experiences can help the family act on the life they want to live together.

## Job flow step

`job-flow-maya-move-family-life-forward`, step 7: let family members participate without turning life into admin. Current delivery score: 2. Kwilt has sharing foundations, but not a cohesive, playful family participation surface.

## Active anchors

- `jtbd-capture-and-find-meaning` - preserve where life actually happened without manual journaling.
- `jtbd-invite-the-right-people-in` - share a chosen slice with chosen family members without losing privacy.
- `jtbd-trust-this-app-with-my-life` - location collection, retention, and visibility must remain explicit and reversible.

## Friction we're addressing

Movement and family outings disappear into disconnected photo rolls and map searches. Existing location behavior is task-oriented and geofence-based; it does not create a lived map or family exploration loop.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- The global capability registry and left navigation can host a named capability.
- `react-native-maps` uses Apple MapKit on iOS and supports polygons, holes, circles, and polylines.
- Expo Location and Task Manager are installed, but production configuration currently supports geofences rather than continuous location history.
- The Places exploration defines references, assignments, evidence, context, memory, and suggestions; the shared canonical Place entity is not fully implemented in code.
- Sharing foundations exist, but there is no authoritative household exploration store.

Constraints to preserve:

- No location permission request before the user starts a behavior that needs it.
- Private by default, with recording, sharing, and viewing as separate controls.
- No leaderboard, streak pressure, default-public sharing, or hidden live location.
- One canonical Place; visits belong to a person-Place relationship.

Design implication:

The first release must make the personal exploration loop real locally. Family controls can be modeled and rendered honestly, but remote family paths remain unavailable until authenticated sharing and RLS exist.

## Aspirational design challenge

How might we help Maya and her family explore their world together and remember where life took them, while preserving calm, legible control over sensitive location history?

## Out of scope

- Production background recording.
- Remote family location delivery or live Find My replacement.
- Competitive leaderboards, streaks, or public discovery feeds.
- Automatic named-POI collection without a reliable place-resolution source.

## Open question

Can the local fog interaction feel magical enough to justify the backend and native-background investment?
