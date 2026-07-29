# Frame: Friends Sharing

## What the user said

> I wonder about adding a "Friends" list too? Not part of the "Household", but also creates broader shareability moments that I think people will care about, especially if they are single.

## Restated in user voice

When the people who support me are not members of my household, I want a small, explicit circle of trusted peers I can share selected parts of life with, so that I can feel connected and encouraged without pretending we are family or turning my life into a social feed.

## Target audience

`audience-private-accountability-seekers` — people who want trusted support without public performance or broad exposure.

## Representative persona

David is single in this framing and has close friends, a mentor, and people from his community who matter to his becoming, but none belong in an administrative Household.

- Current situation: Kwilt can share an individual Goal, but it does not currently expose a durable peer roster in navigation.
- What he's trying to become/do: keep the right people gently connected to the parts of life where their encouragement matters.
- Emotional state or tension: he wants connection, but is wary of feeds, follower mechanics, and accidentally sharing too much.
- What would make this feel wrong to him: implying that friendship grants visibility, using public discovery, or turning encouragement into engagement pressure.

## Hero anchor

`jtbd-invite-the-right-people-in` — help me invite the right people into my becoming without losing privacy.

## Job flow step

`job-flow-david-invite-the-right-people-in`:

- **Choose the right person:** 3/5. Goal invites exist, but the relationship framing is fragmented.
- **Let the other person respond or follow along:** 2/5. Recipient-side support remains thin.
- **Adjust or end sharing:** 2/5. Relationship and object-level sharing lifecycle need to remain visible, separate, and reversible.

The Friends idea primarily addresses the missing durable relationship context between one-off invitations. It should not replace the decision about what a friend can see.

## Active anchors

- `jtbd-invite-the-right-people-in` — a Friend is a trusted potential participant, not an automatic audience.
- `jtbd-trust-this-app-with-my-life` — friendship, visibility, revocation, and blocking must be explicit and unsurprising.

## serves snippet

```yaml
serves: [jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
```

## Friction we're addressing

Household is intentionally an operational and authority-bearing boundary. That excludes many meaningful relationships, especially for single people, but Kwilt's current visible UI offers only object-level sharing and reminder controls. Users lack a calm place to recognize trusted peers, see pending invitations, and understand what—if anything—is shared with each person.

## System alignment

Constraint posture: `Fit the system`

Current system facts:

- Existing surface: Settings exposes **Household** and **Sharing**, but no visible Friends destination.
- Existing user flow: shared Goals support bounded invitations and signals-only check-ins; Sharing settings currently control reminder behavior.
- Existing domain/data model: `kwilt_friendships` models mutual, invite-only relationships separately from Household and shared-Goal membership. `FriendsScreen`, friendship services, invite Edge Functions, milestone services, and analytics events already exist.
- Existing technical affordances: the Friends screen can list active relationships, show incoming requests, accept/decline, and generate one-use invite links.
- Existing UX/copy conventions: privacy first, explicit invitations, signals rather than surveillance, no public discovery, no default-public visibility.

Constraints to preserve:

- Household remains the only family authority and dependent-child boundary.
- Becoming Friends grants no capability authority and no automatic access to Goals, Activities, Chapters, Money, Screen Time, Explore location, or other private data.
- Sharing remains object- or signal-specific, opt-in, previewable, and reversible.
- Mutual, invite-only relationships; no follower counts, contact scraping, public profiles, people-you-may-know, leaderboard, or general social feed.
- A user can share with someone without requiring a Household, and should not need to create a Household first.

Constraints we may challenge:

- The existing Friends implementation is marked shipped but is unreachable from the current Settings navigator.
- Current invite copy says friends can “see what each other is working on,” which is broader than the actual privacy contract and should be replaced with precise, previewable language.
- The older social roadmap centers milestone broadcasting and engagement metrics. The recovered capability should instead start from trusted relationships and user-chosen sharing moments.
- The current friendship mutation/RLS path needs a fresh authorization review before the dormant UI is made reachable.

Design implication:

Friends should be a lightweight peer relationship layer under Sharing—not another Household and not a social destination. The list should answer “who have I connected with, and what do we currently share?” while every actual share remains separately authorized.

## Aspirational design challenge

How might we help David build a small circle of trusted peers who can be invited into specific parts of his becoming, while preserving the rule that a relationship alone reveals nothing?

## Out of scope

- Household roles, dependent profiles, caregiver authority, Screen Time administration, or family billing.
- Public discovery, followers, contact uploads, recommendations, feeds, DMs, leaderboards, or broad milestone broadcasting.
- Automatically sharing existing or future content when a friendship is accepted.

## Open question

Should the first recovered Friends surface live inside **Sharing** as its relationship roster, or should **People** become the broader top-level concept that contains separate Household and Friends sections?
