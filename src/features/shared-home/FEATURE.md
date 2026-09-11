---
feature: shared-home
audiences: [audience-aspirational-family-organizers, audience-private-accountability-seekers]
personas: [Maya, David]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves:
  - jtbd-carry-intentions-into-action
  - jtbd-move-the-few-things-that-matter
  - jtbd-invite-the-right-people-in
  - jtbd-help-us-enjoy-being-together
  - jtbd-trust-this-app-with-my-life
briefs:
  - home-getting-started
  - shared-home
  - kwilt-home-shared-life
  - kwilt-home-connected-moments
status: shipping
last_reviewed: 2026-09-10
---

# shared-home

The `kwilt-home-connected-moments` v2 PRD is implemented across people catch-up/history, authorized response previews, expressive posts and galleries, source actions, household contributions, private saves/collections, full-page composition and reading continuity. It uses neutral system actions, 32-point list-owned post separation, 16-point text gutters, and canonical dock geometry. The additive Home migrations are deployed; installed release availability is a separate gate. See `artifacts/home-sharing-review/connected-implementation/verification.md` for native and backend evidence.

Gives Maya one feed-first receiving place for content people intentionally
share with her, while each capability remains authoritative.

## Planned surfaces in this folder

- `SharedHomeScreen.tsx` - finite **Needs you** and **Shared with you** surface.
- `sharedHomeRepository.ts` - recipient-scoped query and realtime refresh.
- `sharedHomeCache.ts` - same-user-only stale-while-refresh snapshot.
- `sharedHomePresentation.ts` - deterministic grouping and safe card states.

## Notes

This production-hidden experiment is separate from the retired Today concept.
Shared Home projects authorized recipient items; it does not own Goal, Game, or
future Explore content, relationship access, or AI Chat records.

The accepted `kwilt-home-shared-life` brief extends this surface with authored
posts, Explore share offers, Goal encouragement arrivals, responses, durable
history, private photos, saved places, and approved connections. The first slice
is implemented in `SharedLifeFeed.tsx` and its composer, conversation, connection,
repository, and domain modules. Release builds require `shared-life-v1`; development
builds expose it for validation. The Home migrations and account-delete update are deployed. Dedicated live
posting, reply, audience, revocation, and Storage checks pass; native composition
and draft restoration are verified. Native photo/conversation acceptance and
signed-device verification remain open.

Automatic Chores updates are source-owned household content. The database projects authorized Chores occurrence transitions; Home renders compact grouped cards, Thanks, and comments. Personal posts continue to require explicit publication. Existing adult personal-account Home eligibility is unchanged. See `docs/superpowers/plans/2026-09-09-home-chore-updates.md` for the permission contract and proof boundaries.

## Home recommendations

`home-getting-started` now has an initial native implementation: a private region above the measured feed header, one featured invitation plus a complementary continuation/discovery action, and a user-opened Your next steps view. Household membership, Money's local checkpoint plus current plan settings, and authorized meal-plan records supply evidence. A Money introduction alone is not unfinished setup; an existing plan suppresses setup prompts. A saved target is treated conservatively as established use, not proof of account readiness.

Home stores account-scoped invitation acceptance separately from presentation preferences. Later, Not for me and Hide survive relaunch; explicit restoration remains available from Home options. These preferences are device-local, not a cross-device setup authority. Unknown membership suppresses personal recommendations; previews and child/shared-device modes do not load private owner evidence.

The first slice covers Household, Money and Meals. Full Screen Time/device readiness, other capability adapters, contextual offers, analytics experiments and any change to default landing remain follow-on work. No rehearsal onboarding gate is promoted and no Home action sends an invitation, connects an account or shares a post by itself. See `docs/superpowers/plans/2026-09-10-home-recommendations.md` and `artifacts/home-recommendations/verification.md`.
