# Diverge: Friends Sharing

## Design challenge

How might we help David build a small circle of trusted peers who can be invited into specific parts of his becoming, while preserving the rule that a relationship alone reveals nothing?

## Axis of variation

**Where does the relationship begin?**

- Relationship-first: connect with a person, then decide what to share.
- Object-first: share a specific Goal, then preserve the trusted relationship.
- Boundary-first: begin from a clear account of who can see what.
- Contextual: keep Friends out of the way until a share action needs a recipient.

All alternatives keep Friends inside **Sharing**, preserve mutual invite-only relationships, and treat friendship as zero visibility by default.

## Alternative A: The Quiet Roster

Sharing opens with a simple Friends section: active Friends, incoming requests, and **Invite a friend**. A friend row shows only relationship state and a restrained disclosure such as “Nothing shared” or “1 Goal shared by you.” Selecting a friend opens a relationship detail where the user may review existing shares or choose **Share a Goal**. The roster is the starting point; content sharing comes second.

- Audience/persona fit: strong for David when he already knows the small circle he wants available in Kwilt.
- Design-challenge answer: creates a durable trusted circle while making zero-access friendship visible and understandable.
- System fit: strongest direct recovery of the existing `FriendsScreen`, friendship services, invitations, and Settings > Sharing location. Requires relationship-share summaries that the current screen does not provide.
- Four-object model: Friends is cross-cutting relationship context; v1 shares only existing **Goals**. It does not become a fifth planning object.
- Capture-first stance: no effect on Activity capture, Goal creation, or personal use. The roster is optional.
- Best when: users intentionally build a small circle before deciding which commitment needs support.
- Fails when: an empty Friends list feels like social setup work with no immediate reason to invite anyone.
- Anti-pattern check: passes. No discovery, feed, follower count, progress score, streak pressure, or automatic sharing.

## Alternative B: Share First, Remember the Person

The primary entry remains the existing **Share Goal** action. The user chooses or invites a person, sees the exact signals-only preview, and shares that Goal. After the invitation is accepted, Kwilt offers a quiet mutual choice: **Keep each other in Friends for easier sharing later**. Settings > Sharing still contains a Friends list, but the list is created through meaningful sharing moments rather than an empty-network setup prompt.

- Audience/persona fit: strongest for David's current job flow because he begins with a Goal that would benefit from support, not with relationship administration.
- Design-challenge answer: the relationship grows from an explicit invitation into one room of life; preserving the person does not widen that room.
- System fit: reuses shared-Goal invitations and the dormant friendship model, but requires a deliberate bridge between goal membership and friendship invitations. Existing invite types must remain separate at the domain and analytics levels.
- Four-object model: starts from the **Goal**, the canonical object being shared. Friends only remembers the recipient for later explicit shares.
- Capture-first stance: no effect on capture; sharing remains a post-creation action on a Goal.
- Best when: most users discover social value through a specific Goal and would not independently maintain a Friends roster.
- Fails when: users want to connect first, or when the two-step “share this Goal, then become Friends” feels ceremonious or confusing.
- Anti-pattern check: passes if the second relationship invitation is optional and calm. Fails if accepting a Goal invite silently creates a friendship.

## Alternative C: The Sharing Ledger

Settings > Sharing becomes a privacy-first map of current access. The first section answers **Shared by you**, the second **Shared with you**, and a third **Friends** section holds trusted relationships with no active shares. Selecting any person shows a two-direction relationship detail: what they can see, what you can see, and direct controls to stop each share or end the friendship. “Add friend” exists, but clarity about access is the main value.

- Audience/persona fit: strongest for David's fear of accidental exposure and his need to adjust or end sharing without awkwardness.
- Design-challenge answer: builds trust by making relationship and visibility separate but inspectable in one place.
- System fit: fits the current Sharing settings destination, but has the largest data-integration surface because shared Goals, friendships, and future share contracts must be projected into one truthful view.
- Four-object model: does not aggregate effort; it lists access to canonical objects, beginning with **Goals**. It must never summarize Activity content or Chapter contents.
- Capture-first stance: no effect on capture. Privacy review is available but never required before creating or updating personal content.
- Best when: multiple sharing relationships already exist and the dominant user question is “who can see what?”
- Fails when: the ledger is empty or data sources cannot provide a complete, trustworthy answer; an incomplete privacy ledger is worse than no ledger.
- Anti-pattern check: passes if it remains an access record. Fails if it becomes a social activity dashboard or engagement report.

## Alternative D: Contextual Friends

Friends appears primarily inside share sheets as a compact, reusable recipient picker. Settings > Sharing exposes a small management row for requests, blocking, and relationship cleanup, but there is no prominent roster-first experience. A person becomes a Friend through a dedicated invite link or an optional post-share invitation; the feature stays nearly invisible until the user chooses **Share** on a Goal.

- Audience/persona fit: strong for someone who values a calm app and does not want another surface to maintain.
- Design-challenge answer: makes trusted people reusable without asking David to manage a social destination.
- System fit: preserves existing object-level sharing as the canonical path and adds the smallest navigation footprint. It underuses the existing Friends screen and would require a new recipient-picker integration.
- Four-object model: entirely subordinate to the **Goal** in v1; Friends is recipient memory, not content or planning structure.
- Capture-first stance: no effect on capture; it appears only after the user explicitly starts sharing.
- Best when: Friend reuse is valuable but a standalone list is not independently meaningful.
- Fails when: pending requests and relationship state become hard to discover, or users explicitly expect the Friends list the product promises.
- Anti-pattern check: passes. It is the least feed-like option, but discoverability must not depend on promotional prompts or forced onboarding.

## Comparison

| Alternative | Primary value | Activation moment | System change | Main risk |
| --- | --- | --- | --- | --- |
| Quiet Roster | Build a trusted circle | Settings > Sharing | Recover and refine Friends screen | Empty-network setup |
| Share First | Turn real sharing into reusable trust | Share a Goal | Bridge goal and friend invitations | Two-step ceremony |
| Sharing Ledger | Know who can see what | Privacy review or relationship management | Unified access projection | Incomplete truth |
| Contextual Friends | Faster repeated sharing | Goal share sheet | Recipient picker plus light management | Hidden relationship lifecycle |

## Primer guardrails across all alternatives

- No alternative blocks Activity capture or requires an Arc/Goal choice before capture.
- No alternative creates progress dashboards, identity streaks, competitive scoring, or punitive reminders.
- No alternative makes a Friend relationship public or discoverable.
- No alternative shares a Goal, Activity, Chapter, Money data, Screen Time state, or location merely because two users are Friends.
- Any future Chapter sharing is an explicit retrospective excerpt; Friends never turns Chapters into future-planning containers.
- Any future encouragement attaches to an explicitly shared object or signal, never a general Friends feed.

## Decision to make in convergence

Choose whether v1 should optimize first for **relationship formation** (Quiet Roster), **natural activation** (Share First or Contextual Friends), or **privacy comprehension** (Sharing Ledger). A converged concept may combine one primary model with one deliberately thin supporting behavior, but should not ship all four models at full depth.
