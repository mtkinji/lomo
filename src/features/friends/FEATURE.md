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
last_reviewed: 2026-08-04
---

# friends

Helps David manage trusted accountability relationships without turning Kwilt into a public social graph.

## Surfaces in this folder

- `FriendshipSettingsSection.tsx` - canonical zero-access roster, request, invite, end, and block surface embedded in Sharing.
- `JoinFriendInviteScreen.tsx` - explicit Friend-link decision surface that previews minimum-field inviter identity before sign-in or acceptance.
- `FriendsScreen.tsx` - compatibility wrapper around the canonical Sharing section.

## Notes

This folder should stay privacy-first and signals-only. Friendship mechanics exist to support meaningful accountability, not discovery, feeds, or public identity.

Settings exposes the secure relationship foundation under People > Sharing. On `codex/kwilt-2-family-sharing-maturity`, active Friends are now reusable in the existing Goal share drawer through a separate recipient-bound invitation; becoming Friends still shares nothing. The same branch repairs the roster against the live auth identity source and adds a rate-limited safe Friend-link preview without exposing an account directory. Production deployment and the two-account TestFlight create/open/accept/reload/end/block/revoke procedure remain required before this feature can move beyond `shipping`.
