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
last_updated: 2026-07-27
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
- Reveal later: correction/removal and privacy/background preferences.
- Must not add: inbox, dashboard, points, badges, per-place alerts, forced confirmation, or public sharing.
- Reuse map: Explore MapView, BottomDrawer, BottomDrawerHeader, Button, Icon, Typography, and SettingRow.
- Behavior sources: one recap, first-visit dedupe, hidden lock-screen names, and family opt-in are explicit user decisions.
- Required states: resolving, multiple Places, no credible Places, known-place dedupe, notification denied, background unavailable, and persisted pending recap.
- Proof path: deterministic preview recap in Simulator; fresh signed native build for background location and notification proof.

### Behavior contract

1. An explicit Explore session silently accumulates route points.
2. Background continuation is separately enabled and requests background permission only after foreground permission.
3. On completion, Kwilt samples at most twelve well-spaced route points and reverse geocodes them sequentially in the foreground.
4. Only distinctive named parks, trails, overlooks, summits, and landmarks become candidates; street-address-like results are ignored.
5. Canonical Place ids are normalized and spatially bounded. Previously visited Places do not reappear as discoveries.
6. One recap is shown per session. A background completion may schedule one generic local notification, never one notification per Place.
7. Tapping a recap notification opens Explore, where the persisted pending recap appears.

## Success signal

A multi-place outing returns as one calm, understandable recap; known Places do not repeat; no precise Place identity appears on the lock screen by default; and the route remains useful when no credible named Place is resolved.

## Open questions

- Real-world Apple placemark precision across parks, trail systems, overlooks, and summits.
- Whether fifteen minutes of credible stillness is a reliable automatic-close threshold.

## Spec refinement

This increment implements the deterministic policy, foreground placemark resolution, persisted recap projection, and optional background task. Simulator proof can cover the recap and notification policy, but background recording is not considered runtime-proven until a fresh native build is installed on a signed device or dedicated Simulator runtime.
