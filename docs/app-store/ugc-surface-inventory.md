# UGC safety surface inventory

Status: working release gate for ASR-005

This inventory asks one practical question: anywhere Kwilt shows a person
something another person supplied, can they get contextual help without first
understanding Kwilt's relationship model?

`Covered in source` is not deployment or device proof. ASR-005 remains open
until the migration and functions are deployed, the moderation mailbox and
operator workflow are exercised, and applicable surfaces pass signed
multi-account verification.

| Surface | Remotely authored material | Relationship | Contextual help | Filtering / authority | Release state |
| --- | --- | --- | --- | --- | --- |
| Shared Home | Shared Goal and Household delivery projections | Peer or Household | Report action on each authored card | Server-authorized intake; peer block is bilateral; Household follow-up is role-aware | Covered in source; runtime proof pending |
| Shared Goal feed | Check-in and reply text, reactions, author identity | Peer or Household | Report action on each check-in and reply | Check-in/reply text filter; bilateral peer block suppresses reads and future contact; Household block rejected | Covered in source; runtime proof pending |
| Friends / sharing settings | Friend identity and relationship | Peer, including a person who may also share a Household | Contextual report action | Server resolves the relationship; same-Household block rejected | Covered in source; same-Household error presentation needs UX proof |
| Household member detail | Household identity, including a dependent without a login | Household | **Get help with this person** in member detail | Intake accepts a canonical Household person without inventing a user account; child, caregiver, and owner receipts differ | Covered in source; runtime proof pending |
| Shared Meal Plan | Member hard-pass reason and identity | Household | Contextual help is inside another member's hard-pass popover; reporting can be followed by personal hiding | 140-character limit, server shared-text filter, same-Household intake authorization, and role-aware receipts | Covered in source; runtime proof pending |
| Guest Meal feedback | Guest display name and free-form meal suggestion | Expiring Plan guest | Organizer-visible suggestion row has contextual help; reporting can be followed by personal hiding | Display name/suggestion filter; only an authenticated owner or caregiver with Plan access may report; guest-link revocation remains separate | Covered in source; runtime proof pending |
| Remote Slanguage | Guest display names and revealed tile-built submissions | Anonymous private game room | Host can remove a player from the lobby; no report path during play | Production builds hide Slanguage, joining, and direct remote-room routes through a source-controlled `__DEV__` gate | Source-gated out of submission candidates; archive proof pending |
| Remote Bank / Pass the Pattern | Guest display names and remote participation | Anonymous private game room | Host removal exists in supported lobbies; no participant report path | Production builds hide discovery/Join, Bank's multi-phone action, and direct remote-room routes through the same gate | Source-gated out of submission candidates; archive proof pending |
| Unified Chat / private AI | User prompts and AI responses | Private user-to-service | Product feedback is separate from person-to-person reporting | Not remotely authored person-to-person content unless a distinct share path publishes it | Out of ASR-005 unless sharing is enabled |
| Local pass-and-play Games | Locally entered player names and in-person play | Same device | No network report path | No remote audience or persistent person-to-person publishing | Out of ASR-005 |

## Candidate rule

A submission candidate must do one of the following for every row marked open:

1. complete the contextual report, moderation-intake, filtering, and
   relationship-authority contract for that surface; or
2. prove that the surface is unreachable in that exact candidate through a
   production-safe release gate.

An internal label, unfinished UI route, or assumed lack of discovery is not a
release gate.
