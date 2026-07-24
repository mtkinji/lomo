# Frame: Participation Spaces

## What the user said

> A person could belong to multiple named circles or Spaces: their direct household, grandparents' household, extended family, and other contexts. People such as an accountability partner may enter an existing Space with specific rights. Personal To-dos must still make sense without switching between Spaces.

## Restated in user voice

When different people participate in different parts of my life, I want to invite each person into the right context with only the access they need, while still seeing my own responsibilities in one coherent Kwilt experience.

## Target audiences

This is a cross-audience platform question, with two existing primary audiences and two provisional demand patterns.

### Primary: aspirational family organizers

`audience-aspirational-family-organizers`, represented by **Maya**.

- Current situation: Maya coordinates her own work, a direct household, children, caregivers, and occasional extended-family participation.
- What she is trying to do: let people participate without turning ordinary life into administration.
- Tension: the same person may be family, caregiver, contributor, and independent Kwilt user in different contexts.
- What would feel wrong: workspace switching, universal family visibility, role configuration before value, or a household dashboard.

### Primary: private accountability seekers

`audience-private-accountability-seekers`, represented by **David**.

- Current situation: David wants one trusted person involved in one commitment.
- What he is trying to do: receive support without co-owning his entire Goal or exposing the rest of Kwilt.
- Tension: current Goal membership is stronger than some support relationships should be.
- What would feel wrong: surveillance, public accountability, unclear visibility, or a new Space for every relationship.

### Provisional: extended-family knowledge keepers

Represented provisionally by **Ruth**, a grandparent who wants recipes, stories, and family knowledge to remain useful across households.

- Current situation: Ruth has knowledge several households value, but she does not want to administer a shared system.
- What she is trying to do: give something meaningful to family members and know whether it remains a copy or a living shared artifact.
- Tension: a one-time recipe share and an ongoing family collection require different commitments.
- What would feel wrong: requiring a paid seat or full household membership to receive a recipe.

### Provisional: boundary-spanning family participants

Represented provisionally by **Jordan**, an adult whose responsibilities cross households through co-parenting, elder care, or regular caregiving.

- Current situation: Jordan may participate in more than one household while retaining a private personal life system.
- What they are trying to do: act on all responsibilities without switching Spaces or confusing authority.
- Tension: household membership, child-specific authority, billing sponsorship, and personal responsibility may come from different sources.
- What would feel wrong: duplicate accounts, duplicated To-dos, or being forced to select a current household before acting.

Ruth and Jordan are provisional test personas, not additions to `docs/personas/` yet.

## Hero anchors

- `jtbd-invite-the-right-people-in` — the primary demand anchor: invite a person into a particular room of life without opening every other room.
- `jtbd-move-the-few-things-that-matter` — participation must help real commitments move rather than merely create rosters.
- `jtbd-capture-and-find-meaning` — family knowledge should be easy to pass on without becoming metadata work.
- `jtbd-trust-this-app-with-my-life` — every boundary, permission, lifecycle, and payment effect must remain understandable.

Candidate `serves:` snippet for a future platform brief:

```yaml
serves: [jtbd-invite-the-right-people-in, jtbd-move-the-few-things-that-matter, jtbd-capture-and-find-meaning, jtbd-trust-this-app-with-my-life]
```

## Existing job-flow coverage

### Maya: direct household operation

`job-flow-maya-move-family-life-forward` currently scores:

- **Schedule or hand off** — 2/5.
- **Family participation** — 2/5.
- **Know the next doable action** — 2/5.

The flow correctly names direct-family participation but does not yet cover multiple Spaces, external scoped participants, or one personal responsibility view across sources.

### David: private support

`job-flow-david-invite-the-right-people-in` currently scores:

- **Follow along** — 2/5.
- **Adjust or end sharing** — 2/5.
- **Choose person / decide visibility / invite** — 3/5.

The flow strongly establishes privacy and signals-only support, but current shared-Goal semantics lean toward membership or co-ownership rather than a general scoped-support relationship.

### Missing coverage

No current job flow directly covers:

- preserving and passing family knowledge across households;
- choosing copy versus live shared ownership;
- participating in several Spaces while retaining one personal action surface;
- receiving a capability-specific grant without general Space access;
- understanding how sponsorship and payment affect participation without affecting ownership; or
- moving a dependent or adult safely through Space, identity, and role lifecycle changes.

## Friction we are addressing

Kwilt has several relationship mechanisms—shared Goals, friends/follows, emerging Household roles, Activity assignment, Apple Family Sharing, and entitlement state—but no single user-legible contract for how people participate across capabilities. Extending Household to cover every relationship would make it too broad; leaving every capability to invent sharing independently would create inconsistent permissions and fragmented personal views.

## System alignment

Constraint posture: **Question the system**.

The unified Kwilt platform makes identity, permissions, entitlements, notifications, and household state global infrastructure. The proposed Spaces model questions whether `household` is the right global identity boundary or one important Space type built on a broader participation substrate.

### Current system facts

- **Personal system:** Activities, Goals, Arcs, Chapters, Chat, and most capability data are owner-private by default.
- **Shared Goals:** `kwilt_memberships` and invite infrastructure support authenticated entity membership; current user-facing roles emphasize partners and co-owners.
- **Household drafts:** define owner, caregiver, child, dependent profile, capability grants, and audit events.
- **Activity assignment drafts:** define responsibility-based personal list membership and a minimum actionable projection for the assignee.
- **Unified shell:** names exactly one owner for auth, user/household identity, permissions, entitlement, notifications, deletion, and export.
- **Screen Time:** adult individual authorization and child guardian authorization have different authority and anti-bypass behavior.
- **Payment:** RevenueCat/StoreKit entitlement answers paid access, not who may see or act on which data.

### Constraints to preserve

- Solo users encounter no Space administration.
- Quick capture remains private and never requires classification.
- My To-dos and other personal action surfaces aggregate responsibilities across Spaces.
- Each capability explicitly defines what may be shared and mutated.
- A relationship name never substitutes for server-enforced grants.
- No public people graph, discovery, feed, leaderboard, or default-public sharing.
- One authoritative object and event history; no silent duplicate per Space.
- Offline UI never claims a permission or authority mutation succeeded before the server accepts it.

### Constraints we may challenge

- Household as the only durable multi-person operational boundary.
- Goal membership as the only reusable non-household collaboration mechanism.
- One household per person as a default assumption.
- Billing plan membership and Apple Family Sharing as sufficient family-entitlement models.
- The idea that every shared item must create a durable relationship.

### Design implication

The likely platform needs to separate five facts: which Space provides context, how a person participates, which rights are granted, what object or capability is shared, and why the person has paid access. The UI should reveal those facts only when needed and continue to organize daily life around the person, not around a selected Space.

## Aspirational design challenge

How might we help Maya, David, Ruth, and Jordan involve the right people in durable and one-off parts of life, while preserving one coherent personal Kwilt experience and making every privacy, authority, and payment boundary understandable?

## Out of scope for this exploration phase

- Final schema or RLS policies.
- Final navigation or screen designs.
- Shipping a generic People or Spaces destination.
- Pricing or seat-count decisions.
- Canonical persona/JTBD additions before validation.
- Implementing or changing the family Screen Time learning release.

## Open question

What is the smallest common participation substrate that serves direct households, scoped supporters, and extended-family sharing without making every one-off relationship or share become a user-managed Space?
