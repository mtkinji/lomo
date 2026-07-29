# Learning Release: Friends Sharing

## Concept To Build

Build a real two-person Friends and Goal-sharing flow in which a trusted peer can become reusable for future shares, while friendship itself grants no visibility.

## Capability Delta

Today, the user cannot:

- Reach or manage the dormant Friends capability from Settings.
- Form a friendship under one consistent two-party-consent contract.
- Choose an existing Friend as a direct recipient when sharing a Goal.
- Review the distinction between Household authority, friendship, and shared-Goal access in one coherent Settings area.

After this release, the user can:

- Find **Household** and **Sharing** together under Settings > **People**.
- Invite, accept, decline, end, or block a Friend relationship through server-authorized actions.
- See that becoming Friends shares nothing by itself.
- Share a Goal with an existing Friend through a targeted invitation that the Friend must accept.
- Accept a shared Goal without automatically becoming Friends.
- Optionally send a separate Friend request after a meaningful Goal-sharing interaction.
- Reuse an accepted Friend for a later explicit Goal share.

Still intentionally not supported:

- Public discovery, contacts upload, follower mechanics, direct messaging, presence, feeds, leaderboards, or social recommendations.
- Automatic milestone broadcasting or friend notifications.
- Automatic sharing of Goals or any other content when a friendship becomes active.
- Cross-capability sharing beyond Goals.
- A universal “who can see everything” privacy ledger.
- Household authority, child capability access, Screen Time control, Money access, or Explore location sharing through friendship.

## User Experience

### Settings home

The existing **Family** section becomes **People** and contains:

```text
People
  Household
  Sharing
```

No new top-level People screen or Friends Settings row is introduced.

### Sharing

Sharing opens with the boundary before the controls:

> Friends make people easier to find when you choose to share. Becoming friends does not share anything by itself.

The first release contains:

- **Friend requests** when any are pending, with Accept and Decline.
- **Friends**, showing active Friends and a quiet **Invite a friend** action.
- **Shared Goals**, split into **Shared by you** and **Shared with you** only when those sections contain data.
- **Reminders**, preserving the current sharing-reminder controls below the relationship and access content.

A Friend row shows name, avatar when available, and relationship state. It does not display social status, recent activity, progress, streaks, or decorative badges.

### Form a friendship directly

1. The inviter chooses **Invite a friend** and shares a one-use, expiring link.
2. The recipient sees who invited them and the zero-access friendship boundary before accepting.
3. The recipient accepts, making the friendship active. Sending the invite was the inviter's affirmative action; accepting is the recipient's.
4. Neither person receives content access from that transition.

This intentionally resolves the current implementation contradiction. The acceptance function already activates the relationship after the recipient accepts; surrounding service comments describe an unnecessary third confirmation. The product contract is two-party consent, not three-step confirmation.

### Share a Goal with an existing Friend

1. The user opens **Share this goal**.
2. Existing Friends appear above Text message, Email, and Copy link.
3. Selecting a Friend shows the same explicit preview used by the current share flow:
   - Check-ins and cheers are shared.
   - To-do titles remain private unless separately enabled in a future release.
4. Confirming creates a targeted pending Goal invitation for that Friend.
5. The recipient sees the invitation in Kwilt and chooses whether to join.
6. Accepting grants only the previewed Goal membership; it does not change the friendship.

The current generic link, text, and email invitation paths remain available for people who are not Friends.

### Share first, then remain connected

After someone accepts a generic Goal invitation, Kwilt may show one quiet, dismissible action in the accepted state:

> Make future sharing easier
>
> Send a Friend request. This will not share anything else.

Sending this request remains separate from Goal membership. Unlike a link the inviter deliberately sent to a specific person, an in-app request stays pending until its recipient accepts. It is not shown during onboarding and does not block the user from entering the shared Goal.

### End or block

- **End friendship** previews whether separately shared Goals remain active and leaves those memberships unchanged unless the user acts on them separately.
- **Block** prevents new friendship or targeted Goal invitations from that person. It is available through a secondary action, not presented as routine relationship management.
- Neither action deletes personal Goals, Activities, check-ins, or other content.

## Existing Product Relationship

- Enhances Settings by renaming **Family** to **People** and moving the existing Sharing row into that group.
- Replaces the current reminder-only Sharing screen with a relationship-and-access surface that retains reminders as a subordinate section.
- Recovers the existing Friends screen, friendship services, migration, invite functions, and analytics only where their contracts survive security and product review.
- Enhances the existing `ShareGoalDrawer` rather than creating a second Goal-sharing flow.
- Leaves Household, generic Goal invite links, check-ins, and signals-only sharing semantics intact.

## Buildable Slice

### Must be real

- Settings information architecture and Sharing surface on the actual mobile app.
- Two distinct authenticated accounts on separate installs or isolated test sessions.
- Server-authorized friend invite creation, receipt, two-party consent, decline, end, and block transitions.
- Immutable friendship participants and inviter identity.
- One-use/expiring invitation semantics and replay-safe acceptance.
- Targeted Goal invitations to an existing Friend, with recipient acceptance.
- Exact Goal visibility preview before send and before accept.
- Independent friendship and Goal-membership lifecycle.
- RLS and authenticated-command tests covering cross-user reads/writes, self-friending, replay, blocked relationships, and unauthorized acceptance.
- Deep-link and app-resume behavior for Friend and Goal invitations.
- Loading, empty, expired, blocked, already-connected, and offline/error states.
- Analytics sufficient to evaluate the learning questions without recording private Goal content or relationship names.

### Can be thin or temporary

- No push notification is required; pending requests and Goal invitations may appear when the user opens Sharing.
- Shared Goal summaries may show only title, direction, and membership state.
- Friend profiles may use name and existing avatar only.
- The Friends list can live directly inside Sharing without a friend-detail screen.
- The post-Goal Friend request can be a single dismissible action rather than a persistent prompt system.
- The TestFlight cohort and qualitative feedback can be coordinated manually.

### Intentionally excluded

- Milestone sharing, cheers outside a shared Goal, aggregated celebrations, or Friends Activity.
- Per-Friend sharing defaults.
- Sharing Activities, Chapters, Money, Screen Time, Household data, live location, or completed Explore paths.
- Contact discovery, address-book permission, import, matching, or suggestions.
- Friend categories such as close friend, mentor, coach, or family.
- Friend counts used as social proof.
- New monetization, entitlement, or referral rewards attached to friendship.

## Release Channel

**TestFlight build**, backed by the production Supabase project after the security migration and friend command functions have been deployed and verified.

Rationale:

- The core learning requires two real accounts, invitation links, app resume/deep links, and server state across devices.
- A local single-account build cannot prove the relationship or privacy contract.
- TestFlight limits the audience while exercising the actual mobile bundle and backend boundary.
- The backend additions should be backward-compatible and inert for existing production clients that do not expose Friends.

Initial test cohort: Andrew plus 2–5 trusted testers using their own Kwilt accounts. No production-default discovery or announcement is included in this release.

## Brand-Goodwill Guardrails

- State “friendship shares nothing by itself” before every acceptance decision.
- Preview the exact Goal signals shared before send and before join.
- Never expose raw Activity titles, notes, Chapter text, money, Screen Time, or location through this release.
- Never auto-create a friendship from a Goal invitation or auto-create Goal access from a friendship.
- Do not ask for contacts permission.
- Do not use growth, network, streak, or engagement language.
- Do not send friend-request or inactivity push notifications in the learning release.
- Provide calm, reversible decline, end, and block paths.
- Treat blocked-state details as private; do not reveal whether the other person blocked the requester.

## Reversibility

- A subsequent build can hide the Friends and Shared Goals sections while leaving the existing Sharing reminder controls available.
- The Settings group can retain the inclusive **People** label even if the Friend experiment is withdrawn; Household and Sharing still fit it.
- Friendship and targeted-invite schema changes are additive and must not change existing generic Goal-invite behavior.
- Friend relationships can remain inert if the UI is removed; no content ownership depends on them.
- Ending the experiment does not delete Goal memberships or user content.
- Server commands can reject new Friend creation while preserving safe read/end/block behavior for existing relationships.

## Permanent Product Threshold

Promote Friends from a learning release to an accepted Kwilt capability only when:

- The complete two-account TestFlight flow succeeds repeatedly without manual database intervention.
- Testers can explain the difference between Household, Friends, and a specific share without coaching.
- At least some testers reuse an existing Friend for a later Goal share, demonstrating value beyond one-off invitation links.
- No tester experiences unexpected visibility or believes friendship exposed other content.
- Ending or blocking relationships leaves independently shared Goals in the state the UI preview promised.
- Security verification shows no cross-user relationship mutation, invitation replay, blocked-user bypass, or unauthorized Goal access.

If those conditions are not met, keep generic object-level sharing and either simplify Friends toward a contextual recipient memory or retire the exposed roster.
