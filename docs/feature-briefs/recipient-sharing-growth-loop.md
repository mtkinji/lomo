---
id: brief-recipient-sharing-growth-loop
title: Recipient Sharing Growth Loop
status: accepted
audiences: [audience-private-accountability-seekers]
personas: [David]
hero_jtbd: jtbd-invite-the-right-people-in
job_flow: job-flow-david-invite-the-right-people-in
serves: [jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-friends-sharing, brief-goal-partners-post-share-experience]
owner: andrew
last_updated: 2026-07-28
---

# Recipient Sharing Growth Loop

## Context

Kwilt already has the beginnings of a valuable recipient experience: a Goal invite can open on the web, explain a signals-only sharing boundary, accept a guest cheer or reply, and return that support to the Goal feed. The surrounding system is incomplete. Friend links do not have a useful live web destination, universal-link ownership is not correctly established, app handoff can degrade to a generic download path, and current Goal landing analytics include private invite and content properties. The next growth work should close one trustworthy two-sided loop before expanding recipient routes or adding conversion pressure.

## Target audience

`audience-private-accountability-seekers` wants to invite a few chosen people into meaningful commitments without creating a public identity, a broad audience, or ambiguous access to the rest of life in Kwilt.

## Representative persona

David shares one Goal or check-in with someone he trusts. He wants that person to understand what is being shared, respond with very little friction, and remain available for future support only if both people find the interaction valuable.

## Aspirational design challenge

How might we let a recipient experience enough of one explicitly shared part of Kwilt to respond meaningfully, while preserving privacy and turning useful participation—not coercion—into acquisition, activation, retention, and paid depth?

## Hero JTBD

`jtbd-invite-the-right-people-in` is the demand spine. The business value exists only if the right person can understand and respond to a bounded invitation in a way that helps David feel supported.

## Job flow step

`job-flow-david-invite-the-right-people-in` scores **Let them follow along** 2/5 and **Adjust or end sharing** 2/5. A specialized Goal landing page exists, but Kwilt does not yet provide reliable link routing, one recipient contract across states, privacy-safe loop measurement, or context-preserving escalation to authenticated participation. Friends can improve **Choose the right person** after value is proven; it should not replace the first useful interaction.

## JTBD framing

When someone David trusts receives one meaningful invitation, they want to understand it and respond without a large commitment, so they can be supportive while staying in control of what they join. This serves `jtbd-invite-the-right-people-in` and `jtbd-trust-this-app-with-my-life`: growth cannot depend on obscuring access, identity, or installation consequences.

## Design

### The business unit: a completed support loop

Kwilt optimizes for this complete unit:

```text
someone shares one meaningful thing
  -> the recipient opens it
  -> the recipient takes a useful action
  -> the sender receives that value
  -> one of them returns and repeats the loop
```

The four business goals map to distinct product evidence:

| Goal | Evidence |
| --- | --- |
| Acquisition | A recipient loads a valid, understandable invitation from a real share. |
| Activation | The recipient takes a useful action and the sender receives it. An install is not activation. |
| Retention | The participants complete a second explicit support interaction within 14–30 days. |
| Monetization | After repeated value, one participant chooses paid depth; the recipient is never charged admission to the share. |

### Web Companion Envelope

Recipient links use a typed envelope that declares:

- the capability and safe object type;
- which sender identity fields may be shown;
- the exact visibility promise;
- which guest actions are allowed;
- whether identity, authentication, or the native app is required;
- the invitation's lifecycle state; and
- the next safe destination after action.

The shared shell supplies layout, consent grammar, state handling, handoff, and measurement rules. Each capability owns the policy for what can be previewed or performed.

| Capability | Web value | Account/app escalation |
| --- | --- | --- |
| Goal | Preview one explicitly shared Goal; cheer or reply to an available check-in | Persistent membership, identity, notifications, history, or own Goal |
| Friend | Preview inviter identity and the zero-access relationship boundary | Accept and manage the reusable relationship |
| Game | Future premise/lobby preview and bounded guest action | Durable player identity, saved progress, or ongoing play |
| Household | Preview inviter, role, and proposed grants | Verified membership and capability authority |
| Screen Time | Explain the requested family setup | Authenticated native setup and OS-level authority |

Goal is the only implemented envelope in the first release. Household and Screen Time never grant authority through an anonymous browser action.

### Goal-first recipient flow

1. David deliberately shares a Goal or check-in using `go.kwilt.app/i/:inviteCode`.
2. The recipient sees who invited them, the one Goal involved, what supporters can see, and what remains private.
3. If the Goal has an eligible check-in, the recipient can cheer or send a short reply without installation.
4. The action reaches the real Goal feed and is legible to David.
5. The recipient sees one contextual continuation: keep following as an identified participant, open Kwilt, or begin their own Goal.
6. After a meaningful response, Kwilt may quietly offer **Make future sharing easier** as a separate Friend request.
7. A second independently authorized interaction supplies retention evidence.

Expired, revoked, already-accepted, malformed, and unavailable invitations have truthful states. They do not masquerade as generic acquisition pages.

### Friends as the retention layer

Friendship grants zero access. Its value is making a proven recipient easier to select in a later explicit share. A Goal response or membership never silently creates friendship, and Friend acceptance never grants Goal visibility.

Direct Friend links remain available for deliberate relationship setup, but they are not the primary acquisition story. The strongest Friend invitation follows a completed support interaction and explains only that future sharing will be easier.

### Context-preserving handoff

- `go.kwilt.app` is the canonical public recipient host.
- Apple and Android association files must name real app identifiers, certificates, and allowed paths.
- A supported app opens directly to the invitation decision or continuation state.
- An install/store detour preserves a single-purpose operational handoff receipt so the first app open can recover the invitation.
- The operational receipt is scoped, expiring, replay-safe, and never copied into behavioral analytics.
- Unsupported devices remain on a useful web state instead of bouncing indefinitely between web and app.

### Privacy-safe measurement

Operational authorization and business analytics remain separate:

- Invite codes and handoff receipts may be processed by the invite service to authorize the request.
- Analytics may record `flow_version`, `object_kind`, `source_class`, `action_class`, coarse `state`, coarse `result`, and safe booleans.
- Analytics must not record invite codes, Goal IDs or titles, names, raw user IDs, friendship IDs, reply text, destinations, relationship labels, or persistent pair identifiers.
- Invite services may increment aggregate daily funnel counters by flow version, object kind, source class, action, and result without emitting private row identifiers.
- Account-side retention can use coarse state such as `support_loop_count: 0 | 1 | 2_plus`; it cannot identify the other participant or reconstruct the social graph.
- Session replay and screenshots are disabled on recipient, response, relationship, Household, and Screen Time decision surfaces.

The existing Goal landing and response telemetry must be corrected before wider traffic because it currently emits invite codes and, on the landing event, Goal title and inviter first name.

### Monetization posture

Always free:

- opening and understanding an invitation;
- basic cheer or reply when the sender enabled it;
- accepting, passing, leaving, or ending access;
- receiving a clear expired or revoked state.

Candidates for paid depth after repeat value:

- richer shared history and reflection;
- structured recurring check-ins;
- controllable reminder and coordination patterns;
- more ongoing relationships or shared spaces;
- family administration and child-by-child capability controls;
- premium Game formats or durable Game history.

The first learning release does not show a live paywall. After two completed loops, testers may review paid concepts to identify the natural payer and value boundary.

### Learning release

Use a production-small cohort of Andrew plus 2–5 trusted two-person pairs using production Supabase and real `go.kwilt.app` links. Build in this order:

1. Remove prohibited private properties from Goal recipient analytics and add contract tests.
2. Repair AASA/asset-links and verify native route ownership.
3. Put the existing Goal preview/response behind the typed envelope contract.
4. Add explicit lifecycle and failure states.
5. Preserve context through open/install.
6. Prove recipient action → sender receipt with separate accounts and installs.
7. Add the quiet post-value Friend offer only after the loop is proven.

### Non-goals

- A general web version of Kwilt, web dashboard, recipient inbox, or universal sharing ledger.
- Anonymous friendship, Household, child, Money, Explore-location, or Screen Time authority.
- Public profiles, discovery, contacts upload, followers, feeds, friend counts, referral rewards, or automated invitation campaigns.
- A paywall, trial, or pricing prompt before the first useful response.
- Games implementation in the Goal-first learning release.

## Success signal

The learning release proceeds only with zero privacy, authorization, wrong-object attribution, or unintended-membership failures; all observed recipients correctly explain the Goal-only visibility boundary; at least three two-person pairs complete recipient action → sender receipt without manual database intervention; at least two recipients take a meaningful web action; at least two senders acknowledge the received support; and at least one pair completes a second explicit interaction within 14 days.

These are small-cohort learning thresholds, not long-term funnel targets. Any privacy failure invalidates the growth result and disables guest mutations while preserving a safe read-only state.

## Open questions

- Which first action—cheer, written reply, or authenticated follow—best predicts a second interaction? The learning release is designed to answer this before selecting a primary continuation CTA.
- After two completed loops, who experiences the clearest paid job: the organizer, the ongoing supporter, or the family administrator? The first release tests concepts rather than a live paywall.

## Spec refinement

### Resolved decisions

- The north-star unit is a completed support loop, not an invite open, account creation, or install.
- Goal is the first complete recipient envelope.
- Safe web value precedes account/app escalation when native authority is not required.
- Friends is a zero-access retention layer after value, not the primary acquisition gate.
- Basic recipient entry and response remain free.
- Private operational identifiers remain outside behavioral analytics.

### Deferred decisions

- Full web account participation, Games guest play, direct Friend web acceptance, paid packaging, and cross-capability rollout wait until the Goal loop passes.

### Acceptance criteria

- A real Goal link opens a valid, useful web page on a normal mobile browser.
- The recipient can explain the exact Goal-only visibility boundary before acting.
- An eligible guest cheer or reply reaches the correct sender's Goal feed exactly once.
- Expired, revoked, accepted, malformed, and unavailable invitations render truthful states.
- App/open/install handoff returns to the same invitation without creating membership automatically.
- Analytics payloads contain no invite code, name, content, raw identity, relationship ID, object ID, durable pair identifier, or session replay.
- A Friend offer appears only after meaningful value, is dismissible, and does not change Goal access.
- The two-account production-small procedure completes without manual database intervention.

## Design exploration

The full Frame → Yes-and → Diverge → Converge → Learning Release → Evaluate record is in [`docs/design-explorations/recipient-sharing-growth-loop/`](../design-explorations/recipient-sharing-growth-loop/).
