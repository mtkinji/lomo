---
id: jtbd-recover-when-i-drift-from-an-arc
title: "Help me notice I've drifted from an Arc and re-engage gently"
parent: jtbd-see-who-im-becoming
level: mid
owner: andrew
last_reviewed: 2026-05-08
confidence: hypothesis
evidence: []
realized_by: []
tags: [identity, arcs, drift, recovery, notifications]
---

## When this job is hot

Life shifts. A season of intense work, a new baby, a move, an illness — and an Arc the user genuinely cared about goes quiet. By the time they notice, shame has compounded the absence. They want the system to surface drift as information *while it's still recoverable*, in a tone that invites re-engagement instead of triggering avoidance.

## What "done" feels like for the user

When an Arc has gone quiet for a meaningful period, the user gets a gentle observation, not a guilt prompt. The framing is curious ("Family Stewardship has been quiet for three weeks — anything you'd want to capture or shift?") rather than punitive. They feel like the app is paying attention with them, not at them.

## Anti-patterns

- "You haven't done X in N days!" notifications.
- Streak-loss alarms.
- Red badges, decay animations, urgency styling.
- Forcing the user to "re-commit" or "set a new Goal" before they can dismiss the notice.

## Notes

This JTBD has direct implications for [docs/notifications-paradigm-prd.md](../../notifications-paradigm-prd.md) and [docs/feature-briefs/notifications-v1-5.md](../../feature-briefs/notifications-v1-5.md) — drift notifications must serve this job, not "engagement."

The reflection mechanic in Chapters ([docs/life-architecture-model.md](../../life-architecture-model.md) §6) is the calm, non-real-time surface for this; in-app and notification surfaces are the urgent ones. Both must use the same gentle voice.
