---
feature: shared-home
audiences: [audience-aspirational-family-organizers, audience-private-accountability-seekers]
personas: [Maya, David]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves:
  - jtbd-move-the-few-things-that-matter
  - jtbd-invite-the-right-people-in
  - jtbd-help-us-enjoy-being-together
  - jtbd-trust-this-app-with-my-life
briefs:
  - shared-home
status: shipping
last_reviewed: 2026-08-05
---

# shared-home

Gives Maya one calm receiving place for meaningful family participation that
survives a dismissed push, while Goals and Games remain authoritative.

## Planned surfaces in this folder

- `SharedHomeScreen.tsx` - finite **Needs you** and **Recent** receiving surface.
- `sharedHomeRepository.ts` - recipient-scoped query and realtime refresh.
- `sharedHomeCache.ts` - same-user-only stale-while-refresh snapshot.
- `sharedHomePresentation.ts` - deterministic grouping and safe card states.

## Notes

This folder does not reuse `src/features/home/TodayScreen.tsx`, which serves a
different personal-orientation job and is not registered in active navigation.
Shared Home projects authorized recipient deliveries; it does not own Goal or
Game actions, relationship access, or AI Chat records.
