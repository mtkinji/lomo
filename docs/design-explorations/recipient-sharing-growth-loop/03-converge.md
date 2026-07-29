# Converge: Recipient Sharing Growth Loop

## Decision

Choose **The Web Companion Envelope**.

Goal sharing becomes the first complete implementation because it already provides safe preview, guest cheer/reply, and sender receipt. Friends becomes the optional post-value relationship layer. Games can reuse the same envelope after the Goal loop proves the consent and handoff grammar.

## Why this wins

| Criterion | Install Bridge | Web Companion Envelope | Full Web Kwilt | Channel-native |
| --- | --- | --- | --- | --- |
| David's invite job | Partial | Strongest | Strong | Partial |
| Recipient control | Medium | Strong | Strong but complex | Weak-medium |
| Acquisition | Click/install | Meaningful visit | Account visit | Message response |
| Activation | Install/account | Useful two-sided action | Broad product use | Useful but ambiguous |
| Retention path | Native only | Web → relationship → native as needed | Web-native parity | Weak continuity |
| Monetization posture | Early gate pressure | Paid depth after value | Broad product pricing needed | Unclear |
| Current-system fit | Medium | Strongest | Weak | Weak-medium |

## Product contract

Every recipient link has a typed envelope with these explicit fields:

- object kind and safe display type;
- sender identity fields safe for that invitation;
- the exact visibility promise;
- guest actions allowed;
- identity and authentication requirement;
- native-app requirement;
- current state: active, accepted, declined, expired, revoked, blocked, or unavailable;
- the next safe destination after action.

The common envelope defines the grammar. Each capability owns what it may reveal and what authority it requires.

| Capability | Safe web value | Requires account/app | Relationship effect |
| --- | --- | --- | --- |
| Goal | Preview the explicitly shared Goal contract; cheer or reply to an available check-in | Persistent membership, notifications, history, own Goal | May offer Friends after value; never creates it silently |
| Friend | Preview inviter identity and zero-access boundary | Acceptance and relationship management | Creates only a zero-access reusable relationship |
| Game | Future lobby/prompt preview and bounded guest action | Durable player identity, saved state, ongoing notifications | None unless separately offered |
| Household | Explain inviter, role, and capability-specific grants | Verified account and app acceptance | Creates Household membership only after consent |
| Screen Time | Explain purpose and requested setup | Authenticated app plus native OS setup | Grants only the approved child/capability authority |

## Goal-first experience

1. David shares one Goal or check-in using a `go.kwilt.app` link.
2. The recipient sees who invited them, what one Goal is involved, what supporters can see, and what remains private.
3. If an action is available, the recipient cheers or sends a short reply without installing.
4. David receives that action in the Goal feed.
5. The recipient sees a contextual next step: keep following, reply as an identified member, or start their own Goal.
6. Only after the first meaningful action may Kwilt offer **Make future sharing easier** as an optional Friend request.
7. A second interaction is the first retention proof.

An expired, revoked, or unavailable invitation shows a truthful terminal state and no conversion pressure disguised as recovery.

## Business loop contract

### Acquisition

A qualified acquisition is a recipient who loads a valid, understandable invitation. Traffic to a broken route or generic download page does not count.

### Activation

Activation is a **completed support loop**: the recipient takes a useful action and the sender receives it. Creating an account or installing Kwilt is an intermediate event, not the outcome.

### Retention

Retention is a second two-sided interaction by the same participants within 14–30 days. The second interaction may involve the same Goal, a later Goal, or eventually a Game, but it must be separately authorized.

### Monetization

Basic opening, preview, cheering, replying, passing, and leaving remain free. Paid value may deepen an established loop through richer history, structured check-ins, controllable reminders, more ongoing relationships, family administration, premium Games, or advanced coordination. It may not charge a recipient merely to answer a share.

## Privacy-safe measurement contract

Authorization and analytics are different systems:

- Operational services may use the invite code or handoff token to authorize and route the request.
- Behavioral analytics receive only the flow version, object kind, source class, action class, coarse state/result, and safe boolean properties.
- Analytics never receive invite codes, Goal IDs or titles, names, raw user IDs, friendship IDs, reply text, message destination, relationship labels, or persistent sender-recipient pair identifiers.
- The invite service can maintain aggregate daily counters for funnel stages without emitting row-level private identifiers.
- Context-preserving install/open uses a single-purpose operational handoff receipt. That receipt is not copied to PostHog or another behavioral analytics store.
- Product-level retention may use coarse per-account states such as `support_loop_count: 0 | 1 | 2_plus`; it must not identify the other participant or reconstruct the graph.
- Session replay and screenshots remain disabled on invite, response, relationship, Household, and Screen Time decision surfaces.

The existing Goal landing telemetry violates this contract because it sends the invite code, Goal title, and inviter first name. Removing those properties is part of the first implementation slice, not optional cleanup.

## Reductive decisions

- Extend the existing `/i/:inviteCode` Goal page instead of building a second Goal landing experience.
- Define one typed envelope contract but implement only Goal in the first release.
- Repair universal-link handoff before adding more recipient routes.
- Offer Friends after a successful interaction; do not lead acquisition with a zero-access relationship.
- Keep Household and Screen Time app-bound where identity and native authority require it.
- Do not build a general web account, dashboard, inbox, social graph, or sharing ledger for this release.

## Accepted trade-offs

- Some recipients will remain anonymous guests and cannot receive durable notifications.
- Aggregate funnel measurement provides less individual attribution than copying invite identifiers into analytics.
- The first implementation demonstrates the envelope through Goal only; Friend and Game pages remain follow-on work.

## Rejected trade-offs

- Do not use install completion as the activation definition.
- Do not make Friend acceptance a prerequisite for a Goal response.
- Do not use recipient access as a referral reward.
- Do not make the web surface a generic marketing page after the invitation has been resolved.
- Do not expose private content to improve link previews or analytics detail.

## Bet

We're betting that letting a recipient help someone before asking for an account will increase meaningful activation, and that people who experience a completed support loop will be more willing to form a reusable Friend relationship, return for a second interaction, and eventually pay for deeper coordination.

## Success signal

The concept is working when recipients can explain what one invitation reveals, complete a useful response without installing, and produce a sender-visible result; then at least some pairs choose a second interaction without prompting pressure. Any privacy-boundary failure invalidates the growth result.
