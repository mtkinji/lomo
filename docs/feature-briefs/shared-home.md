---
id: brief-shared-home
title: Shared Content Home
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

# Shared Content Home

## Context

Kwilt capabilities increasingly let people intentionally share meaningful
objects: Goal invitations and check-ins, Game invitations and turns, and later
Explorations and recipes. Those objects need a coherent place to arrive without
losing the authority, audience, or interaction model of their source
capability. The first Shared Home slice supplied recipient-only delivery and
recovery for actionable events, but its inbox grammar is too narrow for rich
shared content.

Home is the cross-capability receiving layer. Notifications announce arrivals,
Home makes them browsable, and each owning capability remains the durable
source and full interaction surface. Chat is available when a shared object has
a conversation, but it is not the receiving surface.

## Target audience

`audience-aspirational-family-organizers` is primary. Maya wants people to send
one another useful, enjoyable things without establishing a collaboration
system. `audience-private-accountability-seekers` is secondary because David's
chosen supporters need to receive authored check-ins and return to the exact
Goal context.

## Representative persona

Maya opens Kwilt after family members have shared several different things. She
wants one recognizable stream that answers “What did people send me?” and then
lets her continue in Games, Goals, Explore, or another capability. She does not
want to reconstruct those shares from pushes, links, or separate menus.

## Aspirational design challenge

How might we help Maya receive and revisit the many things people deliberately
share with her, while keeping each object authoritative in its owning
capability?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` remains the demand spine: intentional
shares should help family life continue rather than disappear after the moment
of delivery.

## Job flow step

This improves step 7 of `job-flow-maya-move-family-life-forward`, family
participation, currently 3/5. Kwilt has capability-owned sharing foundations,
but recipients lack a coherent cross-capability place for shared content to
arrive and be revisited.

## JTBD framing

When someone intentionally shares something with me in Kwilt, help me notice
it, understand its human and capability context, and find it again in both a
common receiving place and its owning capability. This serves
`jtbd-invite-the-right-people-in` through exact audiences,
`jtbd-help-us-enjoy-being-together` through resumable play, and
`jtbd-trust-this-app-with-my-life` through source-owned truth and recipient-only
delivery.

## Design

### Product grammar

Home receives. Capabilities own. Notifications announce. Conversation stays
contextual.

- Sharing originates from a Goal, Game, Exploration, recipe, or another owning
  capability; Home has no generic composer.
- A Home item is a server-authorized projection containing sender context,
  preview content, a typed source reference, and a typed destination.
- The underlying object remains authoritative and is never copied into an
  independently editable Home record.
- Household and Friendship may make a person selectable, but do not cause any
  content to appear by themselves.
- Push and Home reference one stable item identity.
- A capability may also expose its own **Shared with me** collection when it
  needs durable retrieval beyond Home's finite window.

### Surface

Home is feed-first, finite, chronological, and deterministic:

1. **Needs you** appears compactly only when pending invitations or turns exist.
2. **Shared with you** presents available and completed items newest first.
3. Each card leads with sender identity, then capability context, content
   preview, relative time, and one source-owned action.
4. When no items exist, the empty state is centered in the available page.

Home has no engagement ranking, infinite scroll, unread count, filters, bulk
actions, or generic posting. A pending item's source state—not whether it was
viewed—determines whether it still needs the recipient.

### Shared item envelope

The additive `kwilt_shared_deliveries` projection continues to provide:

| Field | Contract |
| --- | --- |
| `id` / `idempotency_key` | Stable Home and push identity; one item per source event and recipient. |
| `recipient_user_id` | Exact permanent account that may read the item. |
| `actor_user_id` / `actor_display_name` | Human authorship context; never authorization. |
| `event_kind` | Closed capability-declared item type. |
| `source_capability` / source identity | Authoritative object location. |
| `title` / `body` | Bounded server-produced preview. |
| `destination` | Validated typed destination, never an arbitrary route. |
| `state` | Pending action, available content, settled action, expired, or unavailable. |
| timestamps | Ordering, settlement, expiry, and retention. |

Authenticated clients can select only their own rows. Clients cannot insert,
update, delete, or widen a recipient. Server adapters verify the source and its
audience, create idempotent recipient rows, and optionally send generic pushes.

### Learning-release item families

1. **Targeted Goal invitation** — exact chosen recipient; opens invitation.
2. **Claimed-seat Game turn** — exact permanent participant; opens the table.
3. **Shared Goal check-in** — fans out only to the other active members of that
   Goal; shows the authored signal and opens the Goal.

The Goal check-in is the first rich-content adapter because its audience and
source interaction already exist. Explore remains private until it receives a
separate explicit recipient authorization and **Shared with me** design; Home
does not invent that authority.

### Goal check-in publishing

After an authoritative check-in succeeds, the client makes a best-effort call
to an authenticated server adapter with the check-in id. The adapter:

- validates the caller and check-in author;
- confirms active Goal membership;
- enumerates other active Goal members;
- retains only recipients enabled for the learning release;
- produces bounded sender, Goal, preset, and authored-text presentation;
- inserts one available item per recipient using a deterministic idempotency
  key; and
- sends the existing generic shared-delivery push only for a newly inserted
  item.

A projection failure never rolls back or conceals the check-in in Goals.

### Analytics and privacy

Analytics may capture Home view, item kind, source capability, item state,
entry source, and navigation success. It never captures sender name, recipient,
Goal title, check-in text, relationship label, or card body.

### Rollout

Keep the existing `shared-home-v1` client flag and
`SHARED_HOME_RECIPIENT_IDS` server allowlist. The additive migration and server
adapter may deploy production-hidden; only allowlisted recipients receive new
items.

## Success signal

Across two permanent accounts, one member publishes a Goal check-in and the
other receives exactly one Home item, recognizes the sender and Goal context,
and reaches the authoritative Goal. Retrying creates no duplicate. Anonymous,
wrong-account, Friend-only, and Household-only users cannot read it. Without
coaching, the recipient describes Home as a place for things shared with them,
not merely notifications.

## Acceptance criteria

- Empty, loading, and error states center within the available page.
- Pending actions remain visually distinct and do not dominate a non-empty
  shared-content stream.
- Available Goal check-ins parse, cache, group, render, and route correctly.
- Invalid capability, source, state, or destination combinations are rejected
  by both database constraints and client parsing.
- The publish adapter validates caller, author, membership, recipients, and
  allowlist before service-role insertion.
- Repeated publishing uses the same idempotency key and produces one item.
- A non-member cannot publish or read a Goal check-in item.
- Existing invitation and Game-turn creation, settlement, push, cache, and
  routing behavior continues to pass.
- `npm run verify:changed -- --run`, focused Deno tests, product lint, and a
  current Simulator inspection pass before branch completion.

## Spec refinement

- **Resolved:** extend the current delivery projection instead of adding a
  parallel social-feed table.
- **Resolved:** use `available` for shared content that does not require a
  state transition from the recipient.
- **Resolved:** make a Goal check-in the first rich adapter; its explicit Goal
  membership is already the authorization boundary.
- **Resolved:** keep replies and reactions in Goal detail for this release.
- **Resolved:** use name-derived identity marks; avatar snapshots are deferred.
- **Resolved:** keep Home chronological and finite; no algorithmic ranking.
- **Deferred:** Explore sharing, recipe sharing, and per-capability **Shared with
  me** collections require their own source-level authorization designs.

## Open questions

None blocking this learning release.
