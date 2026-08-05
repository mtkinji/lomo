---
id: brief-shared-home
title: Shared Home
status: accepted
audiences: [audience-aspirational-family-organizers, audience-private-accountability-seekers]
personas: [Maya, David]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-move-the-few-things-that-matter, jtbd-invite-the-right-people-in, jtbd-help-us-enjoy-being-together, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-kwilt-2-shared-experiences, brief-home-today-orientation, brief-goal-partners-post-share-experience, brief-kwilt-games-capability-integration]
owner: andrew
last_updated: 2026-08-05
---

# Shared Home

## Context

Kwilt 2.0 already has relationship foundations, targeted Goal invitations,
Goal-support activity, and remote Game tables. These capabilities work in their
own contexts, but a recipient who misses a push has no calm cross-capability
place to recover what happened and resume participation. Putting those events in
Unified Chat would blur human authorship, capability authority, and AI context.
A general notification inbox would solve recovery but create a second global
surface that competes with the longer-term Family Moments direction.

Shared Home is the narrow receiving layer: a finite projection of meaningful,
recipient-authorized family events, paired with but semantically separate from
Ask.

## Target audience

`audience-aspirational-family-organizers` is primary. Maya wants her family to
participate naturally without learning or maintaining a collaboration system.
`audience-private-accountability-seekers` is secondary because David's chosen
Goal supporters also need a reliable, privacy-bounded path back to the one Goal
they were invited to support.

## Representative persona

Maya sees a Game-turn push while handling something else and dismisses it. Later
she remembers that someone was waiting on her, but not which Game or where to
resume. She wants one quiet place that answers “What happened, and what can I do
now?” without showing a family activity log or asking her to clear an inbox.

## Aspirational design challenge

How might we help Maya recover and resume meaningful family participation
across Kwilt, while preserving exact recipient boundaries, capability ownership,
and freedom from feed or inbox pressure?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` is the demand spine. Shared Home should
help one meaningful family action move forward after an interruption; it should
not increase the amount of family activity Maya monitors.

## Job flow step

This brief improves step 7 of `job-flow-maya-move-family-life-forward`: family
participation, currently 3/5. Goal support and Games already allow bounded
participation, but each capability owns a separate return path and transient
notifications do not provide durable recovery.

## JTBD framing

When someone I chose does something meaningful with me in Kwilt, let me find the
same event later, understand its exact boundary, and return to the right
experience, so family participation continues without surveillance or another
inbox to manage.

This serves `jtbd-invite-the-right-people-in` through recipient-specific access,
`jtbd-help-us-enjoy-being-together` by shortening the path back into play, and
`jtbd-trust-this-app-with-my-life` through minimal disclosure, source-owned
truth, and strict account isolation.

## Design

### Product contract

Home receives. Capabilities own. Ask helps.

- Home is a recipient-scoped projection, not a sharing or authorization model.
- The originating Goal or Game remains the source of truth and final mutation
  surface.
- Ask remains Unified Chat. Family events never become Chat messages and are not
  automatically added to AI context.
- Household membership and Friendship remain eligibility facts with zero
  ambient content access.
- Only server-validated, capability-declared event kinds can enter Home.
- Push and Home reference one stable delivery identity.

### Placement

The active shell has no Home route. The capability-menu footer's current
**Chat** action becomes an explicit **Home | Ask** split control behind the
`shared-home-v1` feature flag:

- **Home** opens `SharedHome`.
- **Ask** preserves the current contextual Unified Chat launch.
- Existing Chat-thread rows continue to open their exact threads.
- Goals, To-dos, Plan, and More remain the main tabs; no new bottom tab is added.

The inactive `src/features/home/TodayScreen.tsx` is not reused. It is anchored
to Sarah's personal Today-orientation job and is not registered in current
navigation. Shared Home lives in `src/features/shared-home/` so the two product
contracts do not silently merge.

### Surface grammar

Home is finite, chronological, and unranked:

1. **Needs you** appears only when an authorized pending item exists.
2. **Recent** contains a short server-controlled window of settled events so a
   dismissed push can be recovered.

Each card shows the minimum authorized projection:

- permitted actor display name or a generic fallback;
- one server-produced sentence describing the event;
- capability and experience label;
- relative time;
- pending, settled, expired, or unavailable state; and
- one capability-owned return action.

Home has no composer, comments, filters, bulk actions, manual read state,
unread total, engagement ranking, or infinite history. Resolved source state—not
whether a card was viewed—determines whether an item still needs the recipient.

### First event families

The learning release supports two complete families:

1. **Targeted Goal invitation**
   - Created only after the server resolves a chosen Friend or authenticated
     Household member to one exact Kwilt account.
   - Opens the existing targeted Goal invitation preview.
   - Settles on accept, decline, revoke, or expiry.
2. **Claimed-seat Pass the Pattern handoff**
   - Created only after a permanent Kwilt account has claimed a remote Bank
   seat and `next_player` advances the server-authoritative game to that
   participant.
   - Opens the existing `GamesRemote` session.
   - Settles when the next handoff occurs, the table closes, access is removed,
     or the session expires.

A generic Game share link produces no Home event because there is no exact
recipient before claim. Goal-support replies and encouragement are the next Goal
adopter after the invitation lifecycle proves the contract; they are not needed
to validate the first release.

### Recipient delivery contract

Add `public.kwilt_shared_deliveries` as an additive server-owned projection:

| Field | Contract |
| --- | --- |
| `id` | Stable UUID carried by push and Home. |
| `idempotency_key` | Unique deterministic source-event key. |
| `recipient_user_id` | Exact permanent account allowed to read the row. |
| `actor_user_id` | Optional person who caused the event; never grants access. |
| `event_kind` | Closed first-release enum: `goal_invitation`, `game_turn`. |
| `source_capability` | Closed enum: `goals`, `games`. |
| `source_entity_type` / `source_entity_id` | Capability-owned lookup identity. |
| `title` / `body` / `actor_display_name` | Server-produced minimum presentation; never arbitrary client input. |
| `destination` | Validated typed destination payload, not an arbitrary route name. |
| `state` | `pending`, `settled`, `expired`, or `unavailable`. |
| timestamps | Creation, update, settlement, expiry, and retention boundary. |

Authenticated clients may select only rows where
`recipient_user_id = auth.uid()`. They cannot insert, update, delete, or widen a
recipient. Server commands create and settle rows through a small shared helper.
Indexes cover recipient/state/time queries, source reconciliation, and expiry.

The table is not a replacement for `kwilt_feed_events`. Goal feed events remain
Goal-scoped shared activity authorized by Goal membership. A legacy policy that
exposed user-level feed events to Friends was intentionally removed; Shared Home
must not recreate that access pattern.

### Push delivery

The server may send a push after creating a new pending delivery:

- existing `kwilt_push_tokens` rows supply recipient devices;
- the push data is `{ type: 'sharedDelivery', deliveryId }`;
- notification response routing opens the exact `SharedHome` item;
- retrying the source command or push helper does not create another delivery;
- lock-screen copy uses the generic disclosure class when capability rules do
  not allow the experience title to appear; and
- push failure does not delete the durable Home item.

Invalid Expo tokens are retired only from explicit provider responses such as
`DeviceNotRegistered`. Push permission remains optional: Home works without it.

### Loading, caching, and reconciliation

- Home loads a same-user-only AsyncStorage snapshot immediately, then refreshes
  from Supabase on focus.
- Cache keys include the permanent Kwilt user id and are cleared or replaced on
  account change.
- Supabase Realtime may refresh the visible list, but correctness cannot depend
  on receiving every broadcast.
- Foreground refresh reconciles pending rows against supported source state so
  a missed server transition cannot leave a permanently actionable ghost.
- If authorization disappears, cached title/body/actor presentation is removed
  and only a generic unavailable state may remain.
- Stale data is labeled and never drives a capability mutation.

### Analytics

Record only safe operational metadata for creation, push attempt, Home entry,
item open, destination reached, settlement, and unavailability. Properties may
include event kind, capability, state, entry source, coarse age, settlement
reason, and success class. Never record display names, titles, Goal/Game names,
message content, relationship labels, or presentation payloads.

### Rollout

Ship through TestFlight with an additive production Supabase schema and
`shared-home-v1` targeted only to Andrew and one trusted family member. Server
emission and client visibility are independently disableable. The general
production audience keeps the current Chat footer and direct capability flows.

## Success signal

Across two permanent accounts on physical TestFlight installs, a recipient can
receive a targeted Goal invitation and claimed-seat Game turn, dismiss the push,
later find the same delivery in Home, identify who and what it concerns, reach
the exact capability, complete the action, and see the item settle. Another
Friend or Household member cannot read the item. Both testers distinguish Home
from Ask without coaching, and at least one naturally uses Home to recover a
missed event without treating it as an inbox.

## Acceptance criteria

- Recipient-only RLS rejects anonymous, actor-only, Friend-only,
  Household-only, and wrong-account reads.
- Client roles cannot insert, update, delete, or change delivery recipients.
- Retried source commands produce one delivery and at most one logical push
  attempt for the same idempotency key.
- Goal invitation accept, decline, revoke, and expiry settle the exact item.
- A Pass the Pattern `next_player` handoff settles the old recipient and creates
  only the new permanent-account recipient's turn item.
- Push tap, cold launch, manual Home entry, and stale-cache recovery all resolve
  the same delivery id.
- Sign-out and account switching never render another user's snapshot.
- Home and Ask have distinct accessibility labels, focus order, screen titles,
  and records.
- Feature-flag disable restores the current Chat action and stops new delivery
  emission without migrating existing capability data.
- `npm run verify:changed -- --run`, focused Deno tests, product lint, and the
  two-device TestFlight proof record pass before broader exposure.

## Spec refinement

- **Resolved:** create `src/features/shared-home/` rather than reactivating the
  legacy personal `TodayScreen`.
- **Resolved:** use a split **Home | Ask** footer entry instead of hiding Home
  behind Chat or adding a bottom tab.
- **Resolved:** use a new recipient delivery projection; do not globalize
  `kwilt_feed_events` or create a universal participation table.
- **Resolved:** first actions route to capability-owned surfaces; Home performs
  no inline accept, decline, or Game command.
- **Resolved:** prove one complete Goal invitation lifecycle first, then Pass
  the Pattern handoff delivery as the second adapter. Bank remains live play and
  must not emit a Home item for every roll.
- **Resolved:** local reminders, AI nudges, generic Game links, Exploration,
  Recipes, Family Moments posting, comments, and reactions stay out of this
  release.
- **Assumption to test:** the name **Home** remains understandable even though
  its first release contains only shared family participation.
- **Deferred:** whether Shared Home later absorbs personal Today orientation or
  deliberately shared Moments. Either expansion requires its own convergence;
  it is not implied by this schema.

## Open questions

- After the gated learning release, should the global doorway remain a split
  **Home | Ask** control or should Home become a separate shell entry? The
  evaluation plan defines the evidence needed to decide; implementation does
  not need this answered first.
