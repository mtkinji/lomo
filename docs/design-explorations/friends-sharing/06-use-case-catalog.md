# Friends Use-Case Catalog

## Purpose

This catalog answers two separate questions:

1. Why would a person create or keep a Friend relationship in Kwilt?
2. Which experiences should use that relationship without allowing friendship itself to grant access?

The invariant across every valid use case is:

> A Friend is a reusable person reference. Every content share remains a separate, explicit, previewable, and reversible grant.

The catalog is intentionally broader than the first release. Its horizon labels prevent plausible future value from silently entering current scope.

Games has a dedicated intersection catalog at [`07-games-use-cases.md`](07-games-use-cases.md). It distinguishes ordinary local Games use, remote session invitations that may reuse Friends, and family/child cases that require Household authority instead.

## Horizons

- **Learning release** — required to prove that Friends is useful and trustworthy.
- **Next** — credible follow-on after the learning-release thresholds pass.
- **Later** — strategically plausible but requires another capability contract or design brief.
- **Not Friends** — belongs to Household, object membership, public publishing, communication, or another system even if a Friend is involved.

## Relationship formation and identity

| Use case | Person's situation | Friends' job | Horizon |
| --- | --- | --- | --- |
| Connect before sharing | I already know who I want available in Kwilt | Preserve a mutual trusted peer for later selection | Learning release |
| Keep a Goal collaborator | A one-off Goal share became a relationship I expect to reuse | Offer a separate Friend request after Goal acceptance | Learning release |
| Accept, decline, or defer | Someone invited me and I need control without pressure | Give the recipient an informed, reversible decision | Learning release |
| Recognize the inviter | I need confidence that the invitation came from the person I know | Show minimum identity and the zero-access boundary | Learning release |
| Handle duplicate or expired invitations | We both sent links, or I opened one too late | Recover safely without duplicate relationships or ambiguous state | Learning release |
| Reconnect after a normal ending | We ended the connection earlier and both want it again | Require a fresh invitation and fresh consent | Next |
| Manage an accidentally blocked relationship | I used a safety control unintentionally | Let only the blocker initiate a private recovery path | Later |
| Discover people on Kwilt | I want to browse or import people I might know | Not a trusted-relationship job; introduces social-graph and contacts risk | Not Friends |

## Repeated explicit sharing

| Use case | Person's situation | Friends' job | Horizon |
| --- | --- | --- | --- |
| Share a Goal with a known person | I want one Friend to follow this Goal | Make the recipient easy to choose; still require preview and acceptance | Learning release |
| Share a second Goal | I want the same person involved again | Remove rediscovery and link coordination without creating a default | Learning release |
| Receive a targeted Goal invitation | A Friend selected me for one Goal | Let me preview, accept, decline, or defer that specific grant | Learning release |
| Continue using generic links | The intended person is not a Friend or I prefer another channel | Keep friendship optional rather than a sharing prerequisite | Learning release |
| Share with several known people | A Goal benefits from a small support circle | Reuse multiple Friends while creating independent invitations | Next |
| Suggest recent recipients | I often share with the same few people | Rank only my existing Friends locally or from private first-party history | Next |
| Establish per-Friend defaults | I always want this person to see new Goals | Conflicts with explicit per-object consent and increases surprise visibility | Not Friends |
| Share everything with a Friend | This person is close to me | Friendship is not a blanket access tier | Not Friends |

## Accountability and encouragement

| Use case | Person's situation | Friends' job | Horizon |
| --- | --- | --- | --- |
| Follow a shared Goal | Someone invited me to support a commitment | Identify the participant; Goal membership defines what I can see and do | Learning release |
| Check in or cheer | I want to acknowledge progress on a Goal I joined | The shared Goal carries the signal; friendship adds no extra visibility | Learning release |
| Ask a mentor or accountability partner to follow along | I want consistent support from one known person | Make repeated explicit invitations easier across meaningful commitments | Learning release |
| Preserve a lightweight support circle | I have two or three people I turn to over time | Keep them reusable without a feed, status, streak, or public identity | Next |
| Celebrate an explicitly shared result | A shared Goal reached a meaningful outcome | Allow an object-scoped celebration visible only to accepted members | Next |
| Broadcast milestones to all Friends | I completed something and want everyone notified | Creates an ambient audience and feed dynamic | Not Friends |
| Monitor a Friend's progress | I want to see what they are doing without an invitation | Surveillance-shaped and outside the explicit sharing contract | Not Friends |

## Visibility and relationship management

| Use case | Person's situation | Friends' job | Horizon |
| --- | --- | --- | --- |
| See my Friends and pending requests | I need to know who is connected and what needs a decision | Provide a quiet roster inside Settings > People > Sharing | Learning release |
| Review Goals shared by me | I want to remember which Goal grants I initiated | Show a truthful Goal-scoped access summary | Learning release |
| Review Goals shared with me | I want to return to or leave a Goal someone shared | Show accepted and pending Goal relationships | Learning release |
| End a friendship but retain a shared Goal | The reusable relationship ended but the commitment did not | Preview and preserve independent Goal membership | Learning release |
| End Goal access but remain Friends | I no longer want this collaboration but may share again later | Revoke the Goal membership without changing friendship | Learning release |
| Block a person | I need a safety boundary | Stop new Friend and targeted Goal invitations without exposing blocker details | Learning release |
| Answer “what can this person see?” | I need confidence before changing access | Show Goal-scoped shares for that person without claiming universal coverage | Next |
| Audit all cross-capability access | I need one complete privacy ledger | Requires every capability to supply authoritative access state | Later |

## People and relationship shapes

Friends is named for the product relationship, not a claim about the real-world label. These are valid peer relationships when both people independently consent:

| Real-world relationship | Why Friends may fit | Boundary |
| --- | --- | --- |
| Close friend | Repeated mutual support | No ambient visibility |
| Accountability partner | Repeated explicit Goal collaboration | No access to other Goals |
| Mentor or coach | Selected commitments benefit from follow-along | No professional role authority implied |
| Partner or spouse | They may support personal Goals outside household operations | Household and Friend relationships may coexist independently |
| Adult sibling, grandparent, or extended family | They matter but are not part of the operational Household | No child or capability authority |
| Roommate or community member | A shared commitment exists without family administration | Use Household only if operational authority is actually needed |
| Former household member | A peer relationship remains after household removal | Household removal never auto-creates friendship |
| Single person's chosen circle | Trusted peers are their primary support system | People settings must not assume a nuclear family |

## Future capability-specific sharing

These cases are not authorized by the Friends brief. Each requires its own accepted sharing contract, visibility preview, revocation model, and negative authorization tests.

| Candidate use case | Potential value | Required before use | Horizon |
| --- | --- | --- | --- |
| Share an Activity or small plan | Invite a Friend into something concrete to do | Activity ownership, edit rights, completion visibility, and lifecycle contract | Later |
| Send an Explore Mission | Invite a Friend to try a place-based experience | Mission object, recipient safety, location privacy, and durable inbox contract | Later |
| Share a completed Place or Story | Preserve and send a chosen retrospective artifact | Explicit artifact boundaries and removal behavior | Later |
| Share a Chapter excerpt | Let someone understand a selected part of my story | Immutable excerpt/snapshot semantics and sensitive-content controls | Later |
| Share a reflection or check-in | Ask for support around one selected moment | Recipient actions, retention, and highly sensitive content policy | Later |
| Invite a Friend to a Game session | Turn a small opening into play with someone already trusted | Games-owned room, seat, invitation, reconnect, result, and safety contract | Next |
| Share a Money artifact | Work through one bounded financial decision | Separate high-sensitivity threat model and redaction/access contract | Later, exceptional |
| Share live location or completed paths | Coordinate or tell a travel story | Live tracking is not a normal Friend share; completed artifact needs Explore contract | Not Friends for live location |
| Manage Screen Time for a child | A caregiver needs device authority | Household grant, child activation, entitlement, and device readiness | Not Friends |
| Assign child responsibilities | A caregiver coordinates family work | Household child-capability authority and explicit assignment | Not Friends |

## Communication and discovery boundaries

| Requested experience | Why it may sound related | Correct owner |
| --- | --- | --- |
| Direct messages | Friends identify a person | A future communication capability; not implicit in friendship |
| Group chat | Several Friends share context | A specific shared object or future conversation object |
| Activity feed | Friends could generate updates | Rejected; ambient progress visibility contradicts Kwilt's privacy posture |
| Presence or online status | Friends are known identities | Rejected unless a future real-time collaboration job proves it necessary |
| Public profile or follower graph | Common social-product convention | Rejected; Friends is mutual and private |
| Contact import and recommendations | Could reduce invitation friction | Separate high-risk discovery decision, not part of trusted sharing |
| Household caregiver authority | The person may also be a real-world friend | Household grants, never friendship |
| Child-to-child Friends | Children may want peer sharing | Separate child-safety, guardian-consent, age, and moderation design; unsupported now |

## Core user journeys the product must eventually cover

1. **Connect first:** invite known person -> recipient understands zero access -> recipient accepts -> later share a Goal.
2. **Share first:** send generic Goal invite -> recipient accepts Goal -> either person optionally requests friendship -> recipient accepts -> later reuse.
3. **Reuse:** open Goal share -> choose existing Friend -> preview exact access -> recipient accepts -> collaborate only inside that Goal.
4. **Inspect:** open Settings > People > Sharing -> distinguish Friends, requests, shared by me, and shared with me.
5. **Reduce access:** leave or revoke one Goal while preserving friendship.
6. **End relationship:** preview surviving object memberships -> end friendship -> shared Goals remain as promised.
7. **Protect:** block a person -> prevent new relationship and targeted-share attempts -> reveal no sensitive blocker state.
8. **Recover:** reopen after app restart, sign-in, expired link, duplicate request, replay, or offline attempt and reach one authoritative state.

## Product sequencing rule

A new Friends use case enters implementation only when all four conditions hold:

1. It starts from a real person-and-object job, not a desire to increase network activity.
2. The content-owning capability defines the exact share, recipient actions, revocation, retention, and notification contract.
3. Friendship remains only a reusable recipient reference and does not imply access.
4. The experience can be explained truthfully in a preview before either party grants access.

If any condition fails, the use case stays outside Friends even when two real-world friends are involved.
