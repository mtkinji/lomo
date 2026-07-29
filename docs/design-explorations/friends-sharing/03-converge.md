# Converge: Friends Sharing

## Decision

Choose **Share First** as the primary activation model, supported by a deliberately thin **Quiet Roster** inside Settings > Sharing.

The user usually encounters Friends while sharing a meaningful Goal with a real person. The durable friendship remains optional and mutual. The Sharing screen provides the calm place to manage Friends, incoming requests, and current Goal-sharing relationships, but it does not become a social feed or a comprehensive cross-capability dashboard.

## Settings information architecture

Broaden the existing Settings section label from **Family** to **People**.

```text
People
  Household
  Sharing
```

- **Household** remains the operational and authority-bearing family boundary.
- **Sharing** contains Friends, explicit object-sharing relationships, and sharing-specific reminder controls.
- **Friends** does not become a third Settings row in v1; it is the first section inside Sharing.
- **People** is only a Settings section label, not a new destination or product object.

Move the existing **Sharing** row out of Personalization and into People. Keep Screen Time Controls in its current capability/settings path; child-specific Screen Time authority continues to be managed through Household, not inferred from the Settings grouping.

### Why “People”

- More inclusive than **Family**, especially for a single user whose trusted circle is composed of friends, mentors, or community.
- Plainer and more extensible than **Family & Friends**.
- Less technical than **Connections** and less abstract than **Relationships**.
- Describes the common subject of Household and Sharing without suggesting that the two models merge.

## Qualitative scoring

| Alternative | Persona/JTBD fit | Privacy clarity | Activation | System fit | Blast radius / risk |
| --- | --- | --- | --- | --- | --- |
| Quiet Roster | Strong | Strong | Weak from an empty state | Strong; recovers existing screen | Low-medium |
| Share First | Strongest | Strong | Strongest; begins from a real Goal | Strong; extends existing share flow | Medium |
| Sharing Ledger | Strong | Strongest if complete | Medium | Medium; requires unified access projection | High truth and data-integration risk |
| Contextual Friends | Strong | Strong | Strong in share moments | Medium | Medium; lifecycle can become hidden |

Share First wins because it starts from David's actual job—invite the right person into one meaningful commitment—rather than asking him to build a network. The thin roster addresses discoverability and lifecycle management without importing the full complexity of a Sharing Ledger.

## Capability delta

### Today, the user cannot

- Reach the existing Friends screen from the current Settings navigator.
- Keep a trusted peer available for future sharing without recreating the relationship through separate object invitations.
- Reliably distinguish “we are Friends” from “this person can see this Goal” in one understandable flow.
- Find Household and peer-sharing settings under one inclusive Settings category.

### After this concept ships, the user can

- Open Settings > People > Sharing and see Friends, incoming requests, and relevant Goal-sharing relationships.
- Invite a Friend directly or optionally preserve a trusted relationship after a Goal-sharing interaction.
- Reuse a Friend as a recipient in a later Goal share while confirming the exact visibility every time.
- See clear language that friendship alone shares nothing.
- End or block a friendship without silently changing separately shared content; the product must explain any remaining object memberships.

### Still intentionally not possible

- A Friend cannot automatically see Goals, Activities, Chapters, Money, Screen Time, Explore location, or any other personal data.
- Accepting a shared Goal does not silently create a friendship.
- Ending a friendship does not silently destroy or rewrite separately owned content.
- There is no public profile, discovery, contact upload, follower graph, direct messaging, leaderboard, or general Friends activity feed.
- V1 does not create a universal cross-capability sharing ledger.

## User experience

### Settings

The Settings home changes only its grouping:

- Rename **Family** to **People**.
- Keep **Household** in that group.
- Move **Sharing** into that group.

Opening Sharing shows:

1. **Friends** — active friends, incoming requests, and a quiet **Invite a friend** action.
2. **Shared by you** — only explicitly shared Goals in v1; hidden when empty.
3. **Shared with you** — only explicitly shared Goals in v1; hidden when empty.
4. **Reminders** — the existing sharing-reminder controls, visually subordinate to relationships and access.

Every Friends section includes one persistent boundary sentence:

> Friends make people easier to find when you choose to share. Becoming friends does not share anything by itself.

### Goal sharing

When the user chooses Share on a Goal:

1. Existing Friends are available as recipients.
2. Selecting a Friend opens the same explicit signals-only visibility preview used for any Goal invitation.
3. Sharing creates or updates the Goal membership only; it does not change the friendship.
4. When sharing with a new person, the recipient may later accept a separate, mutual Friend invitation for easier future sharing.

### Relationship lifecycle

- Incoming Friend requests can be accepted or declined from Sharing.
- Blocking is available but not presented as a routine “remove” action.
- Ending a friendship must preview whether any separately shared Goals remain connected.
- Goal memberships and friendships remain independently revocable.

## Reductive design decisions

- Enhance the existing **Sharing** screen instead of adding a new Friends destination.
- Rename one Settings section and move one existing row; do not add a new navigation level.
- Recover and refactor the dormant Friends implementation rather than building a second friendship model.
- Begin the access summary with shared Goals only; do not claim comprehensive visibility across capabilities.
- Do not add a friend detail screen until the list and Goal-share flow prove that users need more relationship-level management.
- Do not add avatars-as-decoration, status badges, counts for social proof, suggestions, recent activity, presence, or “people you may know.”
- Do not add “Trusted people” as user-facing terminology. It remains an internal product-system description.

## System implications

- Add the dormant Friends route back to the Settings stack only as part of the Sharing experience, or absorb its content directly into `SharingSettingsScreen` if that produces the smaller coherent surface.
- Reuse `kwilt_friendships`, friend invite Edge Functions, and existing analytics where their contracts survive review.
- Add a Goal-sharing projection that is explicitly limited to Goals; do not infer future cross-capability access.
- Keep friend invitations and shared-Goal invitations separate in data, copy, deep links, and analytics.
- Before exposure, replace broad invite copy such as “see what each other is working on” with the zero-access friendship contract.
- Before exposure, harden friendship authorization so only the intended recipient can accept a pending request, relationship participant identities cannot be rewritten, and block/end transitions are server-authorized and auditable. Prefer narrow authenticated commands over direct client table mutation.

## Accepted trade-offs

- A direct **Invite a friend** action remains available even though Share First is the preferred activation path.
- The first sharing summary is Goal-only and therefore incomplete across Kwilt by design; copy must name that scope rather than implying a universal privacy report.
- Household and Sharing sit under the same **People** label even though their authority models remain intentionally separate.

## Rejected trade-offs

- Do not make friendship acceptance part of Goal-invite acceptance to reduce taps.
- Do not launch the full Sharing Ledger until every included capability can provide complete, trustworthy access state.
- Do not preserve the **Family** section label and place Sharing elsewhere; that keeps peer relationships structurally secondary and makes the settings model less inclusive.
- Do not add separate **Household**, **Friends**, and **Sharing** rows; that exposes implementation distinctions as settings clutter.

## Activation path

Primary activation occurs when a user shares a Goal with a real person. The product teaches one distinction in context: sharing this Goal grants the previewed Goal access; becoming Friends only makes the person easier to choose later.

Secondary activation occurs through Settings > People > Sharing for users who already know they want to connect first.

Natural adoption is demonstrated when a user reuses an existing Friend in a later explicit share, or returns to Sharing to review or change a relationship without confusion.

No Friend setup appears during first-time onboarding, and no notification pressures the user to add Friends.

## Bet

We're betting that people value Friends most as reusable, trusted recipients for meaningful sharing—not as a social destination—and that placing Household and Sharing together under **People** will make Kwilt feel relevant to both families and single users without blurring authority boundaries.

If users build empty friend rosters but rarely share, we would reduce the roster emphasis and move further toward Contextual Friends. If users repeatedly ask “who can see what?”, we would invest next in the fuller Sharing Ledger.

## Success signal

The concept is working when users can correctly explain that:

1. Household controls family participation and capability authority.
2. Friends are reusable trusted recipients.
3. Sharing a specific Goal is a separate decision.

Behaviorally, the strongest early signal is a user selecting an existing Friend in a second explicit Goal-sharing action without needing to recreate or rediscover that person.
