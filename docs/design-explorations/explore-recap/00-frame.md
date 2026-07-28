---
title: "Frame: Exploration Recap"
last_updated: 2026-07-28
---

# Frame: Exploration Recap

## What the user said

> If I explored many places between phone glances, show them to me without spamming me.

## Restated in user voice

When I keep my phone away during an outing, I want Kwilt to quietly remember the meaningful places I reached and show them together afterward, so I can appreciate the experience without managing alerts or a review queue.

## Target audience

`audience-aspirational-family-organizers` - families who want technology to preserve lived experience without becoming another system to administer.

## Representative persona

Maya is present with her family during a walk or outing. She wants the memory afterward, not repeated lock-screen interruptions while it is happening.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - family outings are part of the life Maya is trying to make room for.

## Job flow step

`job-flow-maya-move-family-life-forward`, step 8: keep using the system because it feels helpful, not fussy. Current delivery score: 3/5.

## Active anchors

- `jtbd-capture-and-find-meaning` - preserve what happened without turning it into admin.
- `jtbd-trust-this-app-with-my-life` - make location inference quiet, inspectable, private, and correctable.

## System alignment

Constraint posture: `Extend the system`

- Explore already owns explicit sessions, route points, canonical Places, visit relationships, privacy settings, and a bottom drawer.
- Expo Location can continue manual or explicitly enabled ambient recording in a background task when native configuration and permission allow it.
- Apple-backed reverse geocoding exposes placemark names, but it is resource-consuming and should run after the route returns to the foreground.
- Expo Notifications can deliver one local recap and route back to Explore.

Preserve one canonical Place, no per-place alerts, no dashboard, no badges or scores, no place names on the lock screen by default, and no permission prompt before an explicit user action.

## Aspirational design challenge

How might we help Maya stay present during an outing and receive one trustworthy story of what she discovered afterward, while preserving explicit background-location control and a calm notification posture?

## Out of scope

- Remote family recap delivery.
- Public sharing, badges, streaks, points, or competitive discovery.
- Claiming every Apple placemark is a meaningful visit.
- Location collection without the user explicitly choosing Always Exploring or starting an outing.

## Open question

Will Apple placemark names be reliable enough on real walks to support automatic collection without frequent corrections?
