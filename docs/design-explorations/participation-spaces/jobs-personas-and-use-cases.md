# Participation Spaces: Personas, Jobs, Job Steps, and Use Cases

This catalog distinguishes four things that are easy to collapse:

- **Persona** — a recurring demand pattern represented by a named person.
- **Scenario actor** — someone required to test a use case but not necessarily a target persona.
- **Job** — progress a person is trying to make in a situation.
- **Mechanism** — Space, membership, role, grant, share, or entitlement; these are not jobs.

The catalog is intentionally broader than the first build. Its purpose is to expose model failure before implementation.

## Persona coverage

### Existing persona: Maya — direct-family organizer

Audience: `audience-aspirational-family-organizers`

Hero JTBD: `jtbd-move-the-few-things-that-matter`

Relevant situation: Maya has personal responsibilities, a direct household, children, a co-caregiver, and occasional extended-family help. She wants participation to reduce reminding and coordination, not introduce a system to administer.

Most relevant existing job-flow gaps:

- See what matters — 2/5.
- Know the next doable action — 2/5.
- Schedule or hand off — 2/5.
- Family participation — 2/5.

Spaces must help Maya hand off and coordinate while keeping My To-dos coherent across sources.

### Existing persona: David — private accountability seeker

Audience: `audience-private-accountability-seekers`

Hero JTBD: `jtbd-invite-the-right-people-in`

Relevant situation: David wants a trusted person to support one commitment without becoming a co-owner of his life system.

Most relevant existing job-flow gaps:

- Follow along — 2/5.
- Adjust or end sharing — 2/5.
- Relationship framing and visibility remain partial at 3/5.

Spaces must support a scoped participant without requiring a new two-person Space or disclosing unrelated content.

### Existing persona: Marcus — anti-administration pressure test

Audience: `audience-burned-out-productivity-power-users`

Hero JTBD: `jtbd-move-the-few-things-that-matter`

Relevant situation: Marcus may participate in several contexts, but will abandon any model that makes him select and maintain views before knowing what to do.

Spaces must remain invisible in ordinary capture and must not fragment Today, Plan, or My To-dos.

### Existing persona: Nina — permission and Agent pressure test

Audience: `audience-ai-native-life-operators`

Hero JTBD: `jtbd-trust-this-app-with-my-life`

Relevant situation: Nina may ask Agent questions that cross personal and shared sources. She needs visible scope, evidence provenance, and an exact explanation of what the Agent may read or mutate.

Spaces must give Agent a bounded, inspectable source model rather than implicit access to every Space the user can enter.

### Provisional persona: Ruth — extended-family knowledge keeper

Provisional audience: extended-family knowledge keepers.

Candidate hero JTBD: a possible child of `jtbd-capture-and-find-meaning`:

> Help me carry useful family knowledge forward without making everyone adopt or administer the same system.

Relevant situation: Ruth wants to pass recipes, stories, family instructions, and memory to children and grandchildren across separate households.

Ruth needs:

- a one-off share that does not require Space creation;
- a clear copy-versus-live choice;
- durable provenance;
- a low-friction recipient path; and
- an optional shared collection only if the family repeatedly collaborates.

### Provisional persona: Jordan — boundary-spanning participant

Provisional audience: people coordinating across households.

Candidate hero anchor: `jtbd-invite-the-right-people-in`, with strong support from `jtbd-trust-this-app-with-my-life`.

Relevant situation: Jordan co-parents, helps aging parents, or regularly participates in two operational family contexts.

Jordan needs:

- membership or grants in more than one Space;
- one responsibility view across them;
- explicit child/person scope;
- no duplicate account or Activity; and
- safe lifecycle changes when care arrangements change.

### Scenario actors that do not yet require new personas

- **Blaire** — independently authenticated co-caregiver.
- **Charlie** — dependent child and assignee.
- **Grandma as occasional caregiver** — a scoped participant, not automatically a Space member.
- **Andrew's brother** — owner/member of another household and contributor to an extended-family collection.
- **Accountability partner** — a role held by an existing person, not necessarily a new audience.
- **Billing sponsor** — a payment role, not a persona or data-access role.

## Job architecture

### Existing top-level job: invite the right people in

`jtbd-invite-the-right-people-in` remains the strongest parent. Its current “particular room of life” language already anticipates Spaces.

Provisional job steps for participation beyond shared Goals:

1. Recognize that another person should participate.
2. Decide whether this is a one-off share, a durable Space, or scoped support.
3. Choose or create the right Space only when durability requires it.
4. Choose the person or people.
5. Explain what they will see and be able to do.
6. Receive consent when the relationship is adult-to-adult or otherwise requires acceptance.
7. Let each person participate without exposing unrelated data.
8. Keep the relationship understandable in context.
9. Change, revoke, leave, or transfer participation safely.

Potential future children of this JTBD, pending evidence:

- **Invite someone into one bounded part of my life.**
- **Keep ongoing participation understandable as relationships change.**

Do not create a JTBD called “manage Spaces.” That is product vocabulary, not user demand.

### Existing job-flow extension: move family life forward

Maya's existing flow should eventually be pressure-tested with these additional steps:

1. Capture without selecting a Space.
2. See every responsibility that is mine across personal and shared sources.
3. Understand source only when it matters.
4. Hand off one responsibility without sharing the surrounding system.
5. Coordinate a named family context when a focused view is useful.
6. Let caregivers or extended family participate with narrower rights than household owners.
7. End the relationship without losing or duplicating commitments.

The critical missing step is:

> **See what I am responsible for across all the Spaces I belong to without switching contexts.**

This is probably a new job step in Maya's flow and a pressure-test step in Marcus's flow, not a new top-level JTBD.

### Candidate missing job: carry family knowledge forward

Provisional user voice:

> When something useful belongs to more than one household, help me pass it on with its meaning intact, without making everyone share an account or maintain a family database.

Provisional steps:

1. Recognize something worth passing on.
2. Choose the right people.
3. Decide whether to send a copy or keep one live shared version.
4. Let recipients understand the source and meaning.
5. Receive, save, or contribute without unnecessary setup or payment.
6. Keep attribution and history intact.
7. Reuse the same group only if repeated sharing makes that valuable.
8. Leave, archive, or preserve the artifact when participation changes.

This job may belong under `jtbd-capture-and-find-meaning`. It should not enter the canonical taxonomy until Recipes, Stories, or family-memory research shows repeated demand beyond a plausible example.

### Cross-cutting trust job steps

These belong under `jtbd-trust-this-app-with-my-life` or as acceptance criteria across all participation flows:

1. Know which Space or person owns the source object.
2. Know who can see it.
3. Know who can change it.
4. Know whether the recipient gets a copy or live access.
5. Know why a person has paid access.
6. Know what happens if they leave, are removed, or lose sponsorship.
7. Know when the displayed permission or policy is stale because the device is offline.
8. Correct a mistake without losing data or widening access.

## Use-case catalog

The `ID` values are stable handles for later rubric scoring and acceptance criteria.

### A. Personal continuity

| ID | Use case | Primary persona | Job performed | Required system behavior |
| --- | --- | --- | --- | --- |
| PC-1 | Solo Kwilt use | Marcus | Capture and act without administration | No empty Space UI, people fields, or setup requirements appear |
| PC-2 | Personal object by default | Maya | Capture something before deciding who is involved | New Activities, Goals, and recipes remain personal unless context or an explicit action says otherwise |
| PC-3 | Unified My To-dos | Maya / Jordan | Know everything I am responsible for | Aggregate assigned and personal Activities across Spaces; never require a current-Space switch |
| PC-4 | Unified Today and Plan | Marcus / Jordan | Decide what to do next | Schedule and planning projections cross authorized sources while respecting private fields |
| PC-5 | Unified Search | Nina | Find an item without remembering its source | Search across authorized sources with visible provenance and no access expansion |
| PC-6 | Agent with bounded Space context | Nina | Ask for help without oversharing | Agent names sources used, can narrow scope, and never assumes every accessible Space is relevant |

### B. Direct household operation

| ID | Use case | Primary persona | Job performed | Required system behavior |
| --- | --- | --- | --- | --- |
| HH-1 | Add the first household person | Maya | Begin family participation at the moment of need | Create the Space and owner participation atomically; no empty-Household onboarding ceremony |
| HH-2 | Invite a co-caregiver | Maya / Blaire | Coordinate without shared credentials | Independent auth, invitation acceptance, child-scoped grants, auditable lifecycle |
| HH-3 | Add a dependent child | Maya / Charlie | Represent a child before independent auth | Stable participant/profile identity distinct from auth identity |
| HH-4 | Assign one Activity | Maya / Charlie | Hand off a responsibility | Share only the actionable projection; responsibility changes personal list membership |
| HH-5 | Recurring chores | Maya / Charlie | Establish a trusted household rhythm | Recurrence occurrences, child-readable state, offline completion, no chore currency or shame |
| HH-6 | Managed child Screen Time | Maya / Charlie | Make access predictable without repeated unlocks | Household authority and Apple device authorization remain separate and acknowledged |
| HH-7 | Household Money | Maya / Blaire | Coordinate shared financial truth | Money capability opts into the Space with its own grants; household membership alone reveals nothing |
| HH-8 | Household Meals | Maya | Coordinate repeated household planning | Shared meal artifacts can be Space-owned without making personal recipes universally visible |

### C. Extended and cross-household family

| ID | Use case | Primary persona | Job performed | Required system behavior |
| --- | --- | --- | --- | --- |
| XF-1 | Send Grandma's recipe as a copy | Ruth | Pass something useful on once | Recipient gets an independent copy with provenance; no durable Space or paid seat required |
| XF-2 | Share a live recipe | Ruth | Let selected people improve one source | Preview live access, mutations, and exit behavior; one authoritative recipe |
| XF-3 | Create a family recipe collection | Ruth / Maya | Reuse a durable group for repeated contribution | Create a named Space only after repeated need; define contributor and manager grants |
| XF-4 | Share stories or memories | Ruth | Preserve family meaning across households | Source attribution, privacy, living/deceased subject considerations, and export survive membership changes |
| XF-5 | Coordinate an extended-family event | Maya | Bring several households around one event | Event participation does not merge households or expose unrelated family data |
| XF-6 | Grandma helps with Charlie | Maya / Ruth | Delegate one caregiving capability | Grandma receives named child/capability grants without joining every household capability |
| XF-7 | Andrew participates in grandparents' Space | Jordan pattern | Help another household while keeping a private system | Multiple-Space participation with one personal responsibility layer |
| XF-8 | Two sibling households share a collection | Ruth / Maya | Collaborate without choosing one household as owner | A separate shared Space or object-level live share; household memberships remain independent |
| XF-9 | Co-parenting across households | Jordan | Coordinate one child's needs across operational contexts | Explicit child identity/binding, no inferred authority, no global Space switching, conflict-safe lifecycle |

### D. Goals, support, and accountability

| ID | Use case | Primary persona | Job performed | Required system behavior |
| --- | --- | --- | --- | --- |
| SP-1 | Co-own a genuinely shared Goal | David | Work toward one outcome together | Shared ownership semantics, explicit shared signals, independent private Activities where promised |
| SP-2 | Invite a Goal supporter | David | Receive encouragement without co-ownership | Supporter sees selected signals and cannot edit the Goal unless separately granted |
| SP-3 | Adult-supported Screen Time | David | Add chosen friction to an adult agreement | Scoped approval/status grant, honest adult bypass limits, reversible consent |
| SP-4 | Accountability partner already known in Kwilt | David | Reuse a trusted person without widening access | Select an existing Person; grants remain object/capability specific |
| SP-5 | End accountability support | David | Change course without social or data fallout | Revoke future access, preserve appropriate history, notify calmly, no punitive copy |

### E. Participation and authority lifecycle

| ID | Use case | Primary persona | Job performed | Required system behavior |
| --- | --- | --- | --- | --- |
| LC-1 | Invite and accept | Maya / David | Establish mutual participation | Expiring auditable invitation, preview of rights, independent identity |
| LC-2 | Decline or ignore | David | Protect a relationship without pressure | No repeated nagging; inviter sees truthful pending/expired state |
| LC-3 | Change a role preset | Maya | Adjust responsibilities | Show the effective grant delta before applying; server-authorized and audited |
| LC-4 | Add or remove one grant | Maya / David | Tune access narrowly | Grant changes do not rewrite relationship labels or unrelated capability access |
| LC-5 | Leave a Space | Jordan | Exit safely | Explain personal data, shared data, assigned work, copies, and future access before leaving |
| LC-6 | Remove a participant | Maya | Protect the Space | Revoke future access, preserve safe audit/provenance, handle owned or assigned objects explicitly |
| LC-7 | Transfer Space ownership | Maya / Ruth | Preserve a durable family context | Require accepted successor, no ownerless Space, clear billing and dependent consequences |
| LC-8 | Child becomes independent | Charlie | Grow into a private Kwilt identity | Bind or convert dependent profile without exposing prior caregiver-only data or losing earned history |
| LC-9 | Relationship rupture or abuse | Any | End access safely | Fast revocation, no coercive re-invites, support for safety-sensitive hidden contact/recovery rules |
| LC-10 | Offline authority state | Any | Understand what is actually true | Read last-known state with freshness; block or queue authority mutations and never claim success early |

### F. Payment and entitlement

| ID | Use case | Primary persona | Job performed | Required system behavior |
| --- | --- | --- | --- | --- |
| PE-1 | Household owner sponsors full members | Maya | Pay once for the people whose daily Kwilt use she supports | Sponsorship and seat state are explicit; they do not determine data access |
| PE-2 | Dependent participation | Maya / Charlie | Let a child use the relevant experience | Dependent access policy is clear and does not require a separate purchase decision at every capability |
| PE-3 | Free bounded recipient | Ruth | Receive or contribute to one shared thing | Recipe copy, check-in response, or scoped participation can work without full paid entitlement |
| PE-4 | Participant has their own plan | Ruth / Jordan | Use private Kwilt while joining other Spaces | Entitlements combine without merging data or households |
| PE-5 | Apple Family Sharing grants purchase access | Maya | Reduce purchase friction | Treat Apple receipt ownership as entitlement only, never Kwilt membership or authority |
| PE-6 | Sponsor loses or cancels payment | Any | Keep trust during downgrade | Preserve data and relationship truth; clearly limit paid actions without silently removing access or ownership |
| PE-7 | Billing owner changes | Maya / Blaire | Transfer payment responsibility | Billing transfer is independent of Space ownership and capability authority unless explicitly combined |

## Cross-use-case invariants

Every use case should satisfy these invariants:

1. A person can participate in more than one Space.
2. A Person identity is not a Space participation record.
3. A relationship label is not an effective permission.
4. A billing role is not a data-access role.
5. One-off shares do not require a durable Space.
6. Durable repeated groups can become named Spaces without migrating private data automatically.
7. Personal action surfaces aggregate responsibility across Spaces.
8. Focused Space views remain optional coordination views.
9. Each capability defines its own readable and mutable projection.
10. Copy and live-sharing semantics are explicit before the action.
11. Removal, leaving, reassignment, and downgrade have defined data consequences.
12. Authority-changing operations are server-authorized and auditable.

## Taxonomy recommendations for review

Do not change canonical JTBD files yet. Review these proposals first:

1. Add **See my responsibilities across all the contexts I participate in** as a step to Maya's job flow and a pressure-test step for Marcus.
2. Expand David's flow beyond Goals so “the right slice” can be a Goal, agreement, capability, object, or Space grant.
3. Run user research before adding a candidate child JTBD for carrying family knowledge across households and generations.
4. Treat payment clarity as part of `jtbd-trust-this-app-with-my-life`, not as a standalone demand node.
5. Treat Space creation, membership administration, and role configuration as mechanisms that must earn their existence by serving the job steps above.
