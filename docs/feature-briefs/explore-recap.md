---
id: brief-explore-recap
title: Exploration Recap
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-capture-and-find-meaning, jtbd-trust-this-app-with-my-life]
related_briefs: [explore-capability, geolocation-activity-offers]
owner: andrew
last_updated: 2026-07-28
---

# Exploration Recap

## Context

Explore can retain a foreground route, but a person who keeps the phone away can miss several meaningful Places and should not receive an alert for every one.

## Target audience

Aspirational family organizers who want outings preserved without adding notification noise or post-walk administration.

## Representative persona

Maya is walking with her family. She wants to be present now and receive one trustworthy story afterward.

## Aspirational design challenge

How might we help Maya stay present during an outing and receive one trustworthy story of what she discovered afterward, while preserving explicit background-location control and calm notifications?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` - the outing is part of the family life Maya is trying to live, not a metric to optimize.

## Job flow step

`job-flow-maya-move-family-life-forward`, keep using the system because it feels helpful, not fussy, currently 3/5.

## JTBD framing

When I keep my phone away during an outing, I want Kwilt to quietly remember the meaningful places I reached and show them together afterward, so I can appreciate the experience without managing alerts or a review queue.

## Design

Exploration Recap extends the existing Explore session and canonical Place relationship. It never creates a separate Discovery object.

### UI contract

- Job: When an outing ends, understand what was newly discovered without reviewing every GPS event.
- Primary action: Done.
- Must show: outing context and newly collected Place names in route order.
- Reveal later: correction/removal, recording mode, and notification preference.
- Must not add: inbox, dashboard, points, badges, per-place alerts, forced confirmation, or public sharing.
- Reuse map: Explore MapView, BottomDrawer, BottomDrawerHeader, Button, Icon, Typography, and SettingRow.
- Behavior sources: one recap, first-visit dedupe, hidden lock-screen names, and family opt-in are explicit user decisions.
- Required states: resolving, multiple Places, no credible Places, known-place dedupe, notification denied, background unavailable, and persisted pending recap.
- Proof path: deterministic preview recap in Simulator; fresh signed native build for background location and notification proof.

### Behavior contract

1. Explore offers two recording modes: `Only when I start` and `Always Exploring`.
2. Both modes continue through screen lock. Starting manually or choosing Always Exploring is the explicit action that requests background permission after foreground permission.
3. Always Exploring uses an efficient location profile, automatically splits outings after sustained stillness, and can be paused from the main Explore action.
4. Recording mode never changes family sharing. Location remains private unless the user separately shares it.
5. On completion, Kwilt samples at most twelve well-spaced route points and reverse geocodes them sequentially in the foreground.
6. Only distinctive named parks, trails, overlooks, summits, and landmarks become candidates; street-address-like results are ignored.
7. Canonical Place ids are normalized and spatially bounded. Previously visited Places do not reappear as discoveries.
8. Unseen automatic outings combine into one recap. A background completion may schedule one generic local notification until that recap is seen, never one notification per Place or outing.
9. Tapping a recap notification opens Explore, where the persisted pending recap appears.

### Adaptive GPS policy

The approved policy is documented in [Explore Use Cases And Adaptive GPS Policy](../design-explorations/explore-recap/06-use-cases-and-adaptive-gps.md).

- `Always Exploring` selects Ambient: soft sleep after two credible stationary minutes, deep sleep after five, and a new outing after a movement gap beyond ten minutes.
- `Start Exploring` selects Adventure: soft sleep after three credible stationary minutes, deep sleep after approximately fifteen, and one outing across pauses up to approximately thirty minutes.
- Explicit live family sharing will select Presence: coarse stationary updates with visible freshness. Presence is not part of the local-only implementation.
- Speed, accuracy, and stop-and-go motion modify sampling inside a policy; they do not create user-facing GPS settings.
- Fog clearing remains a fixed roughly 100-foot radius. Altitude may color the route but never expands revealed territory.
- Poor or implausible location evidence freezes fog clearing rather than inventing territory.
- Explore is not emergency or guaranteed location infrastructure.

## Success signal

A multi-place outing returns as one calm, understandable recap; known Places do not repeat; no precise Place identity appears on the lock screen by default; and the route remains useful when no credible named Place is resolved.

## Open questions

- Real-world Apple placemark precision across parks, trail systems, overlooks, and summits.
- Whether low-power Ambient wake can preserve departures within a useful route-gap tolerance.
- Whether Adventure deep sleep should remain at fifteen minutes after signed-device hike, queue, and stop-and-go testing.

## Spec refinement

The current increment implements deterministic placemark policy, persisted recap projection, manual and ambient recording modes, fixed efficient location profiles, and a background task. The approved adaptive Ambient, Adventure, and Presence policies are specified but not yet implemented. Simulator proof can cover mode and recap UI, but continuous background recording, wake reliability, and battery performance are not considered runtime-proven until a fresh native build is installed on a signed device.
