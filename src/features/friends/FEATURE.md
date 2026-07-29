---
feature: friends
audiences: [audience-private-accountability-seekers]
personas: [David]
hero_jtbd: jtbd-invite-the-right-people-in
job_flow: job-flow-david-invite-the-right-people-in
serves:
  - jtbd-invite-the-right-people-in
  - jtbd-trust-this-app-with-my-life
briefs:
  - friends-sharing
  - recipient-sharing-growth-loop
  - social-dynamics-evolution
  - social-goals-auth
status: shipping
last_reviewed: 2026-07-28
---

# friends

Helps David manage trusted accountability relationships without turning Kwilt into a public social graph.

## Surfaces in this folder

- `FriendshipSettingsSection.tsx` - canonical zero-access roster, request, invite, end, and block surface embedded in Sharing.
- `JoinFriendInviteScreen.tsx` - explicit Friend-link decision surface.
- `FriendsScreen.tsx` - compatibility wrapper around the canonical Sharing section.

## Notes

This folder should stay privacy-first and signals-only. Friendship mechanics exist to support meaningful accountability, not discovery, feeds, or public identity.

Settings now exposes the secure relationship foundation under People > Sharing. The backend migration and acceptance function are deployed, but the feature remains `shipping` until a safe inviter preview, targeted Goal invitations, universal-link handoff, and the two-account TestFlight flow are proven. The recipient-sharing growth loop makes Goal value the preferred path into an optional Friend relationship.
