# Evaluate Learning: Friends Sharing

## Purpose

Determine whether a consensual Friends layer makes explicit Goal sharing meaningfully easier and more trustworthy, or whether Kwilt should keep relationships contextual to each shared object.

This evaluation is not a test of whether people will tap **Add friend**. The central question is whether a durable friendship improves a later, separately authorized sharing moment without causing privacy confusion.

## Learning questions

### 1. Boundary comprehension

- Can testers explain, without coaching, that Household authority, friendship, and Goal access are three separate relationships?
- Do both inviter and recipient understand that becoming Friends shares nothing by itself?
- Can they identify what a Goal invitation will share before accepting it?

### 2. Reusable value

- After forming one friendship, does either person choose that Friend for a later Goal share?
- Is choosing an existing Friend materially easier or more reassuring than sending another generic link?
- Does the Friends roster remain useful after the first invitation, or does it become inert social furniture?

### 3. Activation

- Do meaningful Goal-sharing moments naturally lead people to preserve the relationship as Friends?
- Do people instead prefer to invite a Friend directly from Settings before any Goal is shared?
- Does the optional post-share Friend request feel helpful, unnecessary, or promotional?

### 4. Privacy and trust

- Do users ever believe that a Friend can see unshared Goals, Activities, Chapters, Money, Screen Time, Household information, or location?
- Does the Sharing surface answer the user's actual question about who can see a Goal?
- Do end, decline, and block actions behave exactly as their previews promise?

### 5. Settings comprehension

- Does **People** feel like a natural home for Household and Sharing?
- Does it preserve the distinction between family authority and peer sharing?
- Do testers look for Friends inside Sharing, or expect a separate Friends destination?

### 6. Recipient experience

- Is the invitation understandable before the recipient has Kwilt open?
- Can the recipient accept, decline, or defer without pressure?
- After joining a Goal, does the recipient understand what useful action is available—follow along, check in, cheer, or simply remain present?

### 7. Technical feasibility

- Does the full two-account flow work repeatedly across install, app-open, background/resume, expired link, replay, and offline recovery states?
- Are relationship and Goal membership transitions idempotent and auditable?
- Can any user mutate, accept, inspect, or bypass a relationship or Goal share they do not own or participate in?

## Evidence plan

### Behavioral evidence that supports the bet

- At least three real two-account pairs complete Friend formation and one targeted Goal share without manual database intervention.
- At least two people reuse an existing Friend for a second explicit Goal share during the evaluation period.
- Testers use Sharing to inspect, decline, end, or change a relationship without needing an explanation of where those controls live.
- Generic invite links remain usable, but existing Friends are chosen when the intended recipient is already connected.
- Some Goal-first interactions lead to a separately accepted friendship; direct Friend invitations do not become the only successful path.

### Qualitative evidence that supports the bet

- Testers describe Friends as “people I can choose more easily later,” not “people who can see my Kwilt.”
- Testers can state the actual Goal visibility boundary before accepting.
- Single testers regard **People** as inclusive rather than as family functionality renamed for marketing.
- Ending a friendship while retaining a shared Goal feels understandable rather than contradictory.
- The experience feels calm and intentional, not like Kwilt is trying to manufacture a network.

### Technical evidence that supports the bet

- Automated authorization tests cover both participants, an unrelated authenticated user, anonymous access, replay, self-invite, expired invite, blocked relationship, and attempts to accept on behalf of another user.
- Remote RLS/function verification shows that relationship identities cannot be rewritten and all state-changing operations enforce the authenticated actor's permitted transition.
- Two-device TestFlight runs produce the same authoritative state after reload and app restart.
- Friend and Goal invite deep links recover correctly after sign-in and return to the intended pending decision.
- No personal content appears in a network response or UI state outside the explicitly accepted Goal contract.

### Brand-goodwill evidence

- No tester reports surprise visibility.
- No tester mistakes the optional Friend action for a requirement to use shared Goals.
- No contacts permission, social suggestion, streak, urgency, or engagement pressure appears.
- Decline and defer paths are used without follow-up nagging.
- Blocking reveals no sensitive explanation to the blocked person.

## Learning instrumentation

### Events to record

Record only the event, entry source, safe result, and coarse state needed to understand the flow:

- `people_settings_section_viewed`
- `sharing_settings_viewed` with `source: settings | deep_link | goal_share`
- `friend_invite_started` with `source: sharing | post_goal_accept`
- `friend_invite_created`
- `friend_invite_shared` with `channel: share_sheet | copy_link`
- `friend_invite_opened` with `result: previewed | expired | exhausted | blocked | invalid`
- `friend_invite_accepted` with `result: friendship_activated | already_connected`
- `friend_request_accepted`
- `friend_request_declined`
- `friendship_ended`
- `friendship_blocked`
- `goal_share_friend_selected` with `prior_friend_share_count: 0 | 1 | 2_plus`
- `goal_share_preview_confirmed` with the versioned visibility-contract identifier, not content
- `goal_share_targeted_invite_sent`
- `goal_share_targeted_invite_opened`
- `goal_share_targeted_invite_accepted`
- `goal_share_targeted_invite_declined`
- `post_goal_friend_offer_shown`
- `post_goal_friend_offer_selected`
- `post_goal_friend_offer_dismissed`
- `friend_flow_failed` with a safe enumerated error code and stage

Existing Friends analytics names may be retained or renamed to this vocabulary, but their semantics must match the final two-party-consent state machine. In particular, “accepted” must not ambiguously mean both “recipient opened the invite” and “friendship became active.”

### Data that must not be recorded

- Friend names, email addresses, phone numbers, avatars, invite codes, or raw user IDs.
- Friendship IDs or other identifiers that would reconstruct a social graph in analytics.
- Goal titles, descriptions, Activity titles, check-in text, Chapter content, Money data, Screen Time state, or location.
- Contact-book access or inferred relationship category.
- Message contents or the destination chosen in the native share sheet.
- Session replay or screenshots on invitation previews, Sharing, or relationship-management surfaces during the learning release.

### Manual observation protocol

For each participating pair:

1. Observe one direct Friend invitation or one Goal-first Friend invitation.
2. Before each acceptance, ask the recipient to describe what they expect the other person to see.
3. Have the pair share one Goal, reload both apps, and verify the visible state from both accounts.
4. Have one person share a second Goal by choosing the existing Friend.
5. End the friendship while leaving one Goal shared, then ask both people to predict and verify the result.
6. Exercise decline, expiry, replay, offline retry, and block using designated test relationships rather than real sensitive relationships.
7. Record qualitative notes without copying private content.

## Disconfirming signals

### Simplify toward Contextual Friends

- Testers form friendships but do not reuse them for a second share.
- People consistently prefer the generic link or native share sheet even when the recipient is already a Friend.
- The Friends roster is rarely opened except to accept a request.
- Direct Friend invitations dominate while the post-Goal friendship offer feels unnecessary.

### Revise toward a stronger Sharing Ledger

- Multiple testers ask “what can this person see?” after the preview and current Sharing summary.
- Users expect ending a friendship to end Goal access and are surprised when it does not.
- Users cannot find shared Goals or relationship-management controls inside Sharing.
- **People** is understood, but the Sharing surface does not provide enough access clarity.

### Retire or hide Friends

- Any unexpected content becomes visible because of friendship state.
- Any unrelated or blocked user can create, accept, mutate, enumerate, or bypass a relationship or Goal invitation.
- Testers consistently describe Friends as a social-network feature they do not want in Kwilt.
- The two-account flow remains unreliable after bounded fixes, or requires manual recovery.
- The durable relationship adds no observed value beyond existing object-level invites.

## Decision rule

Evaluate after **14 days** or after at least **three two-account pairs** have each attempted Friend formation, a first Goal share, and a second Goal share—whichever produces sufficient evidence later.

### Proceed to permanent capability

Proceed only if all are true:

- Zero privacy or authorization failures.
- Every tester who completes a friendship can explain that friendship shares nothing by itself.
- Every tester can identify the Goal visibility boundary before accepting.
- At least two participants reuse an existing Friend for a later explicit Goal share.
- The end-friendship/shared-Goal separation behaves as previewed and is understood after use.
- The full TestFlight flow works across two accounts without manual database intervention.

### Simplify

Move toward Contextual Friends if the security and comprehension bars pass but reuse is weak. Keep Friend recipient memory in Goal sharing, reduce roster prominence, and do not expand cross-capability sharing.

### Revise

Invest in the Sharing Ledger next if durable relationships are useful but visibility remains confusing. Do not expand Friends into additional capabilities until the access model is understandable.

### Retire or hide

Hide Friend creation immediately for any privacy/authorization failure. Preserve safe read, end, and block paths for existing relationships while fixing or winding down the capability. Retire the roster if repeated real use shows no value beyond generic Goal invites.

## Expected next action

If the proceed threshold is met, accept Friends as a small peer-sharing capability and update `job-flow-david-invite-the-right-people-in` based on observed improvement in choosing a person, recipient follow-along, and adjusting or ending sharing.

If the threshold is not met, preserve the successful object-level sharing work and choose the simplify, revise, or retire path above without marketing Friends as a shipped social capability.
