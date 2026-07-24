# Lifecycle, Ownership, and Safety Contract

This contract strengthens the leading **person-centered Spaces** model at its weakest points: authored shared data, leaving, removal, stewardship transfer, dependent independence, co-parenting, and relationship rupture.

It is a product contract, not a database schema. Each capability may add stricter rules, but it may not weaken these promises.

## The facts Kwilt must not collapse

| Fact | Answers | Example |
| --- | --- | --- |
| Person | Who is this human across contexts? | Charlie remains Charlie when he later creates a login |
| Space | In what durable participation boundary does this happen? | The Watanabes |
| Participation | How is this person connected to this Space? | Core member, dependent, or narrowly invited participant |
| Role preset | What understandable starting bundle did we offer? | Caregiver |
| Grant | What may this person actually see or do? | Approve Screen Time for Charlie only |
| Owner principal | Which Person or Space holds the authoritative artifact? | The Watanabes owns its shared meal plan |
| Author | Who contributed this version or event? | Ruth added the recipe notes |
| Responsibility | Whose personal action layer should include this? | Charlie is responsible for unloading the dishwasher |
| Share mode | Is this an independent copy or one live source? | Maya copied Ruth's recipe, or joins its live version |
| Entitlement source | Why is this paid capability available? | Personal purchase or Space sponsorship |

Assignment changes responsibility and the assignee's permitted action surface. It does not silently transfer ownership. Payment changes entitlement. It does not silently change participation or grants.

## Ownership and authorship

Every shared artifact must have one authoritative owner principal: either a Person or a Space.

- A personal artifact stays Person-owned when it is merely shown or shared into a Space.
- Moving an artifact to a Space is an explicit action with an aftermath preview.
- A Space-owned artifact survives the departure of an individual contributor.
- Authorship and version provenance remain attached to contributions even when the Space owns the artifact.
- Private drafts never become Space-owned or visible merely because their author participates in the Space.
- An independent copy gets a new owner, no live dependency, and a provenance link such as “From Ruth's recipe.”
- A live share retains one owner, one current source, explicit editors, and version history.

If an account is later deleted, retained Space history may identify the actor as a former participant rather than expose a deleted profile. Legal erasure and family-memory legacy require capability-specific policy; the general model does not invent a universal answer.

## A common exit preview

Before an ordinary leave or removal, Kwilt explains the aftermath by category rather than showing a generic warning:

| Category | After exit |
| --- | --- |
| Personal/private artifacts | Stay with the person; the Space's live access ends |
| Independent copies already made | Stay with their current owners |
| Space-owned contributions | Stay in the Space with safe attribution and history |
| Live shared Person-owned artifacts | Stop being available to the Space unless ownership or sharing changes first |
| Assigned open work | Complete, reassign, or return to unassigned according to the capability's stated rule |
| Completed work and receipts | Remain as bounded historical events where needed for shared truth |
| Pending approvals or requests | Close or reroute explicitly; they never hang invisibly |
| Other Spaces and personal Kwilt | Remain unaffected |

Where policy permits, a participant may export or fork their own contributions before leaving. That is an explicit copy; it does not take the Space's authoritative artifact away.

## Leave, removal, and revocation state

Normal participation state is `invited -> active -> left` or `removed`. A separate `blocked` deny can override invitations and grants across the relevant relationship.

- Access revocation is a server-authorized mutation and takes effect immediately when confirmed.
- Offline devices may display a clearly dated last-known view, but cannot represent authority-changing actions as complete before server acknowledgement.
- Sensitive grants use short-lived authorization receipts so a stale device cannot retain control indefinitely.
- Queued content actions must be re-authorized when they reconnect; a completion may sync, but a revoked edit or approval must fail truthfully.
- The actor and affected person receive the minimum calm notification appropriate to the situation. Kwilt does not disclose a private reason for removal.
- Blocking prevents repeated invitations and closes outstanding requests.

## Stewardship, not personal ownership of a Space

A durable Space has one or more **stewards**. The Space, not a steward, owns Space-owned artifacts. Stewardship is authority to manage participation and recovery, not personal possession of everybody's data.

For an ordinary transfer:

1. An existing steward names a successor and previews the effective authority change.
2. The successor accepts.
3. The server atomically applies the new stewardship grants.
4. Only then may the last previous steward step down.

Billing responsibility does not transfer with stewardship unless the people separately perform the billing flow.

A normal last steward cannot abandon a Space with dependents or durable shared artifacts without choosing a successor or archiving it. This rule must never trap someone in an unsafe relationship: a safety exit revokes their own access immediately and puts any otherwise orphaned administrative work into a restricted recovery state.

## A dependent becoming independent

Charlie should not become a different Person because he gains independent authentication. The transition binds a new login to the existing stable Person identity, then reviews data capability by capability.

- Charlie's personal/private data becomes accessible only to Charlie.
- Shared household Activities and appropriate completion history remain shared household truth.
- Caregiver-only notes, controls, and administrative history do not become visible merely because Charlie now has a login.
- Device-management and Screen Time authority is re-evaluated under the applicable platform and age rules; it does not automatically persist or disappear.
- No bulk “make all history visible” migration is allowed.
- Charlie receives a private personal context that does not require leaving the household Space.

This is a migration ceremony with an understandable preview, not a role toggle. Exact consent, age, recovery, and platform policy remain a dedicated design and legal workstream.

## Multiple households and co-parenting

One Person may participate directly in multiple Spaces. One child Person may therefore have relationships to more than one household Space without duplicate child profiles.

Authority remains explicit:

- Grants are scoped by Space, capability, and child.
- A co-parent may be a core member of one household and a scoped caregiver in another.
- Personal responsibilities from all authorized Spaces still appear in one personal projection.
- Household data does not merge merely because the same people participate.
- One managed physical device has exactly one active Kwilt Screen Time policy authority Space at a time. This prevents two Spaces from running conflicting rule engines against the same device.

Changing the device's authority Space requires an explicit handoff and fresh device acknowledgement. This makes ordinary multi-household coordination coherent, but it does not claim to solve contested custody, protective orders, or adversarial control. Those cases require a specialized safety and legal design before Kwilt supports them.

## Scoped support without a new Space

A trusted supporter joins an existing Person-owned Goal or agreement through a narrow accepted grant. Kwilt does not create a two-person Space just to represent the relationship.

The default Goal supporter may:

- see only the check-ins or status deliberately shared;
- respond or encourage; and
- receive the minimum context needed for that agreement.

They may not edit the Goal, see private Activities, browse the person's Spaces, or discover unrelated people unless separately granted.

For consensual adult Screen Time support, an optional grant may expose agreement state and a specific exception request. Raw usage or app names are not included unless the adult explicitly shares them. Kwilt must explain that adult self-management remains reversible and may be bypassable under Apple's individual authorization model; it is not equivalent to caregiver authority over a child's managed device.

The owner can end support immediately. Pending requests close, future access stops, and the supporter gets only a calm “access ended” message. A relationship block prevents repeated invitations.

## Capability policy still required

This common contract makes the architecture coherent; it does not make every domain interchangeable. Each shared capability must still declare:

1. its allowed owner principals;
2. its readable and mutable fields for each grant;
3. what responsibility projects into personal surfaces;
4. its leave/removal behavior;
5. its offline read and mutation behavior;
6. its export, copy, and deletion behavior; and
7. which audit events are retained and visible to whom.

Stories and memories also need subject privacy, legacy, living/deceased-person, and consent rules. Money needs shared-truth, export, and regulatory rules. Those are capability contracts built on this model, not reasons to create a different people system.
