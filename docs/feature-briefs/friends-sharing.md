---
id: brief-friends-sharing
title: Friends Sharing
status: accepted
audiences: [audience-private-accountability-seekers]
personas: [David]
hero_jtbd: jtbd-invite-the-right-people-in
job_flow: job-flow-david-invite-the-right-people-in
serves: [jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-household-foundation, brief-recipient-sharing-growth-loop]
owner: andrew
last_updated: 2026-07-28
---

# Friends Sharing

## Context

Kwilt already supports object-level Goal invitations and contains a dormant Friends implementation, but it does not give people one coherent, reachable way to keep trusted peers available for later shares. The product also needs a Settings model that serves people with a Household and people whose trusted circle is composed of friends, mentors, or community without merging family authority with peer sharing.

## Target audience

`audience-private-accountability-seekers` wants selected people to follow along with meaningful commitments without joining a public network or gaining broad access to their life in Kwilt.

## Representative persona

David wants a small number of people he already trusts to be easy to choose when he shares a Goal. He needs the product to make friendship, Household authority, and access to a specific Goal unmistakably different.

## Aspirational design challenge

How might we help David preserve trusted peer relationships for future sharing while making every content grant explicit, previewable, and reversible—and without turning Kwilt into a social network?

## Hero JTBD

`jtbd-invite-the-right-people-in` is the demand spine because Friends is valuable only when it helps David invite a particular person into a particular meaningful commitment.

## Job flow step

`job-flow-david-invite-the-right-people-in` currently scores **Choose the right person** 3/5, **Let them follow along** 2/5, and **Adjust or end access** 2/5. Generic Goal links can begin a collaboration, but Kwilt does not yet make a known recipient reusable, show pending targeted access in one place, or clearly separate ending a friendship from ending a Goal membership.

## JTBD framing

When David wants someone he trusts to follow one commitment, he wants to choose that person without rebuilding the relationship and see exactly what the invitation grants, so he can invite the right people in while continuing to trust Kwilt with the rest of his life. This serves `jtbd-invite-the-right-people-in` and `jtbd-trust-this-app-with-my-life` together; convenience cannot weaken the privacy boundary.

## Design

### Product model

Three relationships remain independent:

| Relationship | Meaning | Authority or visibility granted by itself |
| --- | --- | --- |
| Household | Private family operating and authority boundary | Roster plus only capability-specific grants |
| Friend | Mutual, reusable trusted peer relationship | None |
| Goal membership | Explicit access to one Goal under its previewed sharing contract | Only that Goal's shared signals |

Creating or ending one relationship never silently creates, broadens, or removes another. In particular, becoming Friends shares nothing, and ending a friendship leaves separately accepted Goal memberships unchanged unless the user acts on those memberships separately.

The broader present-and-future inventory is maintained in [`docs/design-explorations/friends-sharing/06-use-case-catalog.md`](../design-explorations/friends-sharing/06-use-case-catalog.md). It separates learning-release cases, credible follow-ons, later capability-specific opportunities, and experiences that must never inherit authority from Friends. The Games intersection is detailed separately in [`07-games-use-cases.md`](../design-explorations/friends-sharing/07-games-use-cases.md), while remaining outside this brief's Goal-only learning release.

### Settings information architecture

Rename the existing Settings section **Family** to **People** and place two existing destinations beneath it:

```text
People
  Household
  Sharing
```

Move **Sharing** from Personalization into People. **People** is a section label, not a new destination or domain object. Friends lives inside Sharing rather than becoming a third Settings row. Screen Time Controls stays in its existing capability/settings path; child-specific authority and activation remain under Household.

### Sharing surface

Sharing begins with the persistent boundary:

> Friends make people easier to find when you choose to share. Becoming friends does not share anything by itself.

It contains, in order:

1. **Friend requests**, only when pending, with Accept and Decline.
2. **Friends**, with active relationships and a quiet **Invite a friend** action.
3. **Shared by you**, limited to Goals and hidden when empty.
4. **Shared with you**, limited to Goals and hidden when empty.
5. **Reminders**, preserving the existing sharing-reminder controls as a subordinate section.

Friend rows use existing name and avatar data when available. They do not show presence, recent activity, progress, streaks, badges, or friend counts.

### Friendship consent flows

There are two entry paths with the same two-party-consent rule:

**Direct Friend link**

1. The inviter creates and deliberately sends a one-use, expiring Friend link.
2. The recipient previews the inviter identity and the zero-access friendship boundary.
3. The recipient accepts; the friendship becomes active.

The inviter's send and the recipient's accept are the two affirmative actions. No third confirmation is required.

**Directed in-app Friend request**

1. A user sends a request to a known Kwilt account from an eligible contextual surface.
2. The relationship remains `pending`.
3. The recipient accepts to make it `active`, or declines to end the request.

A user cannot friend themself. A blocked relationship cannot be recreated or used for a targeted Goal invitation. The product does not reveal to a requester whether the other person blocked them.

### Goal sharing

The existing Goal share drawer remains the canonical entry point. Active Friends appear above Text message, Email, and Copy link.

Selecting a Friend opens the same explicit visibility preview used by generic invitations. Confirming creates a targeted pending Goal invitation. The recipient must accept before membership is created, and only the targeted authenticated recipient may accept. Friendship state does not grant Goal access and Goal acceptance does not create a friendship.

The first release preserves the current signals-only contract: check-ins and cheers are shared; raw Activity/to-do titles remain private unless a later accepted brief explicitly changes that contract.

After someone accepts a generic Goal invite, Kwilt may offer one quiet, dismissible **Make future sharing easier** Friend request. It is separate from Goal membership, never required to enter the Goal, and remains pending until the recipient accepts.

### Relationship lifecycle

The authoritative friendship states are:

```text
pending -> active -> ended
pending -> ended
pending | active -> blocked
```

`ended` covers declined, withdrawn, or normally ended relationships with an auditable reason. `blocked` is a distinct safety state. A later re-request after `ended` requires a new invitation and fresh consent; a blocked pair cannot re-request until the blocker explicitly unblocks through a future supported recovery flow.

**End friendship** previews that separately shared Goals remain active. **Block** prevents new friendship and targeted Goal invitations and is placed in a secondary safety action rather than presented as routine relationship management.

### Data and authorization contract

- Replace direct app-client friendship mutations with narrow authenticated server commands for create, accept, decline, withdraw, end, and block.
- Keep both participant identities immutable after relationship creation.
- Authorize every transition against `auth.uid()` and the actor permitted for the current state.
- Make invite acceptance one-use, expiring, idempotent, and replay-safe.
- Add append-only friendship audit events for actor, transition, safe reason, and server timestamp.
- Extend targeted Goal invitations additively with an intended recipient identity and explicit pending/accepted/declined/expired state. Only that authenticated recipient may accept or inspect private preview data.
- Preserve existing generic Goal invite codes and memberships unchanged for non-Friend sharing.
- Return only the minimum profile fields required to identify a known recipient; do not expose a browsable account directory.
- Cover both participants, an unrelated authenticated user, anonymous access, self-invite, replay, expiry, blocked relationships, and actor-forgery attempts in authorization tests.

The current `kwilt_friendships`, invitation functions, and Friends service may be migrated where their contracts survive this model. The existing direct-write RLS and client update paths are not an acceptable production authority boundary.

### Analytics and privacy

Instrumentation may record flow name, entry source, coarse state, safe result, and a versioned visibility-contract identifier. It must not record names, email addresses, phone numbers, raw user IDs, friendship IDs, invite codes, Goal content, message destinations, a reconstructable social graph, or session replay/screenshots on Sharing and invite-decision surfaces.

The key behavioral event is selecting an existing Friend for a later explicit Goal share. “Invite accepted” event names must distinguish link preview, friendship activation, and Goal-membership acceptance.

### Learning release

Release through TestFlight to Andrew plus 2–5 trusted testers using real, separate Kwilt accounts against production Supabase only after the additive migration, server commands, and negative authorization tests pass. No push notifications, contacts permission, discovery, or production announcement is needed.

The run must exercise direct invitation, targeted Goal invitation, generic Goal-first sharing, later Friend request, reload/restart, app resume/deep links, expiration, replay, offline retry, end, and block across two accounts without manual database intervention.

### Non-goals

- Public profiles, discovery, contacts upload, followers, feeds, messaging, presence, social recommendations, leaderboards, or friend counts as social proof.
- Automatic content sharing, milestone broadcasting, inactivity prompts, or engagement pressure.
- Friends access to Activities, Chapters, Money, Screen Time, Household data, Explore location, or any unshared Goal.
- Cross-capability sharing beyond Goals or a universal sharing ledger.
- Per-Friend defaults, relationship categories, monetization, referral rewards, or onboarding Friend setup.

## Success signal

The learning release proceeds only if all testers who complete a friendship can explain that it shares nothing by itself, all can identify the Goal visibility boundary before accepting, at least two participants reuse an existing Friend for a later explicit Goal share, and at least three two-account pairs complete the full flow without manual database intervention. Any privacy or authorization failure immediately hides new Friend creation while preserving safe read, end, and block paths.

If comprehension passes but reuse is weak, simplify toward contextual recipient memory. If durable relationships are useful but people still ask who can see what, strengthen the Goal-scoped Sharing summary before expanding to another capability.

## Open questions

- What account-recovery or appeal path should exist for an accidentally blocked relationship? This does not block the first release because block remains reversible only by the blocker and the blocked party receives no diagnostic detail.
- Should a later release add a Friend-detail surface once multiple independent shares exist? The first release keeps lifecycle actions in the Sharing list and Goal access in Goal-scoped rows.

## Implementation checkpoint

As of 2026-07-28, the first foundation is implemented on `codex/family-capability-foundation` and its secure backend authority is deployed:

- Settings groups Household and Sharing under **People**.
- Sharing embeds one zero-access Friends roster with incoming Accept/Decline decisions, one-use link creation, normal end, and safety block.
- Relationship reads use a safe authenticated projection; raw relationship rows, blocker identity, and audit events are not client-readable.
- Direct client mutations are removed in favor of actor-authorized transition RPCs.
- Friend-link acceptance is an atomic two-party-consent RPC and no longer uses service-role read/insert/update steps in the Edge adapter.
- The legacy policy allowing Friends to read user-level feed events is removed.
- `friend/:inviteCode` resolves to an explicit acceptance screen and never auto-accepts.
- The hardening migration is applied to production Supabase and the authenticated acceptance Edge Function is active.

This remains `shipping`, not production-ready. Add a rate-limited safe invite-preview command so the recipient can verify inviter identity before accepting; verify the universal-link web handoff; and complete the two-account separate-install create/open/accept/reload/end/block procedure. Targeted Friend-to-Goal invitations remain the next relationship milestone, but the preferred growth path is now Goal value first followed by an optional Friend offer as defined in [`recipient-sharing-growth-loop.md`](recipient-sharing-growth-loop.md).

## Spec refinement

### Resolved decisions

- **People** replaces **Family** as the Settings section label; Household and Sharing are its only rows.
- Friendship and object access are independent; friendship grants zero content visibility.
- Goal is the only Friend-targetable object in the learning release.
- Direct Friend links activate after the inviter sends and the recipient accepts; no redundant inviter reconfirmation exists.
- In-app Friend requests remain pending until the recipient accepts.
- Normal end/decline and safety block are distinct authoritative states.
- Server commands, immutable participants, replay-safe invites, append-only audit, and negative authorization tests are release requirements.

### Deferred decisions

- A universal sharing ledger, cross-capability share contracts, Friend details, contact discovery, push notifications, and additional relationship categories are intentionally deferred until the Goal-only model proves useful and understandable.

### Implementation assumptions to verify before migration

- The deployed Supabase schema and Edge Functions still match the checked-in friendship migration and function sources.
- The app has or can add one canonical Friend deep-link route without conflicting with existing Goal invite routing.
- Existing profile data can identify a targeted known account without enabling general user discovery.
- The targeted-recipient fields can be added to the current Goal invitation model without changing generic invite behavior.

### Acceptance criteria

- A person can find Household and Sharing under Settings > People without a third Friends row.
- Two separate accounts can form a friendship through a direct link with exactly one deliberate action by each party.
- An in-app Friend request remains pending until its recipient accepts.
- Friendship activation exposes no Goal or capability content.
- A user can select an active Friend, preview the Goal contract, send a targeted invitation, and grant membership only after that recipient accepts.
- Ending a friendship leaves separately shared Goals unchanged and previews that fact first.
- Blocking prevents new Friend and targeted Goal invitations without revealing the blocker to the other person.
- Unauthorized, unrelated, anonymous, replayed, expired, self-directed, and actor-forged mutations are rejected by automated tests.
- Analytics cannot reconstruct the social graph or capture private relationship or Goal content.
- The two-account TestFlight procedure completes without manual database intervention.
