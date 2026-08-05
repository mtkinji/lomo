---
id: brief-kwilt-2-shared-experiences
title: Kwilt 2.0 Shared Experiences
status: accepted
audiences: [audience-aspirational-family-organizers, audience-private-accountability-seekers]
personas: [Maya, David]
hero_jtbd: jtbd-invite-the-right-people-in
job_flow: job-flow-david-invite-the-right-people-in
serves: [jtbd-invite-the-right-people-in, jtbd-help-us-enjoy-being-together, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-friends-sharing, brief-goal-partners-post-share-experience, brief-nearby-game-join]
owner: andrew
last_updated: 2026-08-04
---

# Kwilt 2.0 Shared Experiences

## Context

Kwilt already has Household and Friend relationships, Goal invitations and
check-ins, and Games-owned local and remote tables. The missing product layer is
not another social destination. It is a coherent way for a chosen person to
enter one existing experience, understand the boundary, and do something
meaningful immediately.

## Target audience

Aspirational family organizers want family and friends to participate without
turning ordinary life into administration. Private accountability seekers want
support from a chosen person without exposing the rest of their life.

## Representative personas

Maya wants a small opening to become time spent playing with family or friends.
David wants one trusted person to support one meaningful Goal. Neither wants a
feed, public identity, blanket Household visibility, or a relationship to grant
ambient access.

## Aspirational design challenge

How might we help Maya and David invite people directly into something in
Kwilt, give each recipient an immediate way to participate, and keep everything
else private?

## Hero JTBD

`jtbd-invite-the-right-people-in` is the cross-capability demand spine: the
right person should enter the right slice of life under an explicit contract.
`jtbd-help-us-enjoy-being-together` specializes that job for Games.

## Job flow step

This release improves `job-flow-maya-move-family-life-forward` step 7, family
participation, currently 2/5. It also improves the recipient-side and lifecycle
gaps in `job-flow-david-invite-the-right-people-in`, where follow-along and
adjust/end sharing are each 2/5, and the reach/join steps in
`job-flow-maya-start-playing-together`.

## JTBD framing

When I want someone I trust to support or join something that matters, let me
invite them into that one experience and show both of us what participation
means, so we can take part in each other's lives without having to manage or
monitor each other.

## Design

### Product contract

Relationships make a person eligible to choose. Invitations grant access to one
specific experience. The capability defines participation, lifecycle, and
privacy. Household membership, Friendship, Goal support, and Games table
membership remain independent.

No Home surface, family feed, universal shared-items destination, public room,
presence, leaderboard, or automatic Household-wide sharing is added.

### Goal support

- The owner invites **support** into one Goal. The supported contract exposes
  authored check-ins and their reactions/replies; private to-dos and every other
  capability remain private.
- A recipient can respond meaningfully even before the first check-in. The
  invite landing must not end at “Nothing to respond to yet.”
- Accepting opens the Goal's support/check-in context instead of generic Goal
  details.
- Invite, accept, decline, revoke, leave, remove-access, expiry, replay, and
  blocked-recipient behavior remain explicit and independently authorized.
- “Do this Goal together” remains unsupported until shared ownership and edit
  authority are implemented truthfully.

### Games participation

- A host opens a supported private table. Link, QR, code, and foreground nearby
  discovery converge on the same capacity-bounded server-authoritative claim.
- Before joining, the recipient can understand the game, host/table identity,
  availability, and immediate next action without learning Household or
  networking concepts.
- Full, closed, expired, already-joined, reconnect, completion, and rematch
  states are coherent.
- A Game invitation never creates a Friendship or Household membership, and
  neither relationship grants a seat.

### Future capability contract

Explore will later define three independent invitations: share a Place, invite
someone to explore, and share a completed recap. None implies live location,
complete history, or future outings. Activities and future recipes must define
their own responsibility or contribution contract before reusing recipients.

## UI contract

### Goal support

Job: When David shares a Goal, he needs the recipient to understand the private
support boundary and respond immediately, so the invitation begins a real
support relationship rather than a dead link.

- Primary action: **Invite support** / **Send encouragement**.
- Must show: Goal context, chosen person or channel, exact signals-only boundary,
  invitation/acceptance state, and direct leave/remove controls.
- Reveal later: full supporter roster and access management inside the existing
  Goal members sheet; Settings remains a secondary recovery surface.
- Must not add: a Goal feed outside the Goal, monitoring language, shared to-do
  access, or a new sharing destination.
- Reuse map: `ShareGoalDrawer`, `JoinSharedGoalDrawerHost`, Goal members sheet,
  `ShareResponseForm`, `Button`, `BottomDrawer`, and existing check-in services.
- Required states: loading, no check-in, check-in available, sign-in required,
  accepted, already accepted, expired, revoked, declined, blocked, retry, leave,
  and remove.
- Proof path: Goal detail -> Share -> known person or generic channel -> web/app
  preview -> respond/accept -> Goal Check-ins -> leave or revoke.

### Games

Job: When Maya receives or discovers a table invitation, she needs to recognize
the table and take her place, so coordination disappears into play.

- Primary action: **Join table**.
- Must show: game, table mark or host context, editable player name, availability,
  and a direct fallback when nearby discovery is unavailable.
- Reveal later: code entry, room controls, and rematch after completion.
- Must not add: a Games people browser, relationship setup, public rooms,
  presence, or a second Games destination.
- Reuse map: `JoinTableDrawer`, `OpenBankTableLobby`,
  `OpenSlanguageTableLobby`, existing remote clients, `BottomDrawer`, and Games
  primitives.
- Required states: searching, found, token preview, code entry, joining, full,
  closed/expired, already joined, disconnected/reconnecting, completed, and
  rematch.
- Proof path: Games -> host table -> QR/link/code/nearby -> recipient preview ->
  join -> play -> interrupt/reconnect -> finish -> rematch.

## Success signal

Across two real accounts, a Goal recipient can explain the visibility boundary
and provide support without encountering an empty dead end. Across two physical
installs, a game recipient can join the intended table, reconnect, finish, and
choose a rematch without Household setup or host coaching. No test or Simulator
result substitutes for the corresponding two-account or two-device gate.

## Spec refinement

- Reuse the existing entity-typed invitation and relationship foundations; do
  not introduce a universal participation table for this release.
- The targeted Goal path currently creates a `collaborator`; product copy must
  describe its supported signals-only behavior without promising co-ownership.
- Keep targeted and generic Goal invitations compatible.
- Games may continue using direct table invitations in this release; Friends do
  not need to become a Games recipient picker before remote play is proven.
- Explore remote delivery is intentionally excluded from the 2.0 release claim.

## Open questions

- Whether an eventual shared Goal ownership contract should use `co_owner` or a
  separate capability-specific role remains deferred until editing and conflict
  behavior are designed.
