# Participation Spaces System-Design Rubric

Use this rubric to evaluate any proposed Spaces model, UX, schema, feature brief, or implementation plan. A high aggregate score cannot compensate for a hard failure.

## Scoring

| Score | Meaning |
| --- | --- |
| 0 | Cannot perform the job, produces unsafe behavior, or contradicts an established product rule |
| 1 | Possible only through a confusing workaround, duplicated data, broad access, or significant administration |
| 2 | Performs the job with visible friction or unresolved lifecycle/edge conditions |
| 3 | Performs the job clearly, safely, and with less user-maintained structure than plausible alternatives |

For unbuilt concepts, scores are **design-coverage scores**, not delivery scores. They say whether the specification responds to the case, not whether Kwilt can perform it today.

## Hard-fail conditions

A model cannot converge if it does any of the following:

1. Requires a user to switch Spaces to understand My To-dos, Today, or Plan.
2. Makes **All To-dos** mean “all items in the currently selected Space.”
3. Makes Space membership expose all capability data by default.
4. Treats a family relationship label such as parent, grandparent, or partner as sufficient authority.
5. Treats payment, Apple Family Sharing, or a paid seat as sufficient data access.
6. Requires a durable Space, account, or paid seat for a simple one-off copy share.
7. Makes copy and live collaboration indistinguishable.
8. Duplicates one Activity into separate per-Space records without an explicit copy action.
9. Treats adult self-control and guardian-managed child Screen Time as equivalent authority.
10. Lets the client claim an authority change succeeded while offline and unacknowledged.
11. Removes or destroys personal data merely because sponsorship, membership, or a relationship ends.
12. Requires solo users to understand Spaces, roles, or people management before personal value.
13. Creates a public discovery graph, default-public feed, or social-pressure loop.
14. Gives Agent implicit access to every Space a person can enter without visible request scope.

## Rubric dimensions

### 1. Demand and vocabulary

| Criterion | What a 3 requires | Priority |
| --- | --- | --- |
| User-job grounding | Every Space, role, and grant exists because a documented job/use case needs it | Hard |
| Friendly language | User-facing language is household- and relationship-appropriate; enterprise terms stay internal | Important |
| Space necessity | One-off sharing works without creating a Space; durable Spaces emerge only for repeated group value | Hard |
| Role restraint | Roles are understandable presets or descriptions, not a sprawling user-managed taxonomy | Important |

### 2. Personal continuity

| Criterion | What a 3 requires | Priority |
| --- | --- | --- |
| Unified responsibility | My To-dos aggregates every Activity the person is responsible for across authorized sources | Hard |
| Unified time surfaces | Today and Plan organize relevant work across Spaces without a global current-Space mode | Hard |
| Source legibility | Source/Space appears only when it prevents confusion; personal items remain quiet | Important |
| Exact mutation | Completing or editing from a personal projection updates the one authoritative source object | Hard |
| Focused coordination | Named Space/member views are available when coordinating others but never required for personal action | Important |

### 3. Privacy and authority

| Criterion | What a 3 requires | Priority |
| --- | --- | --- |
| Private by default | Personal capability data remains private until an explicit capability/object action shares it | Hard |
| Least privilege | Participation and grants disclose the minimum required projection and mutation set | Hard |
| Role/grant separation | Human relationship labels and role presets are distinct from effective server-enforced grants | Hard |
| Capability ownership | Each capability declares what can be read, changed, assigned, copied, or shared live | Hard |
| Scope preview | Invitations and grant changes preview who will see/do what before applying | Hard |
| Agent scope | Agent shows which Space/object evidence it used and cannot widen scope silently | Hard |

### 4. Identity and multi-Space participation

| Criterion | What a 3 requires | Priority |
| --- | --- | --- |
| Stable Person identity | Auth identity, dependent profile, Person, and Space participation are distinct and linkable | Hard |
| Multiple Spaces | One person can participate differently in multiple Spaces without duplicate accounts | Hard |
| Scoped outsiders | A trusted person can enter one capability/object without baseline access to the whole Space | Hard |
| No inferred kinship authority | “Grandparent,” “brother,” and similar labels never grant rights by themselves | Hard |
| Space independence | Two households can collaborate without merging ownership, billing, or private rosters | Important |
| Dependency lifecycle | Dependent-to-independent transitions preserve appropriate identity and history | Important |

### 5. Sharing semantics and provenance

| Criterion | What a 3 requires | Priority |
| --- | --- | --- |
| Copy versus live | The sender and recipient understand whether changes remain connected | Hard |
| One authoritative source | Live collaboration has one owner/source and deterministic mutation history | Hard |
| Provenance | Copies and shared artifacts retain understandable source and attribution | Important |
| Cross-Space sharing | An item can be copied or shared to people in another Space without joining that Space | Important |
| Conversion restraint | Repeated sharing may offer a named Space, but never auto-creates one or widens existing shares | Important |

### 6. Invitation and lifecycle

| Criterion | What a 3 requires | Priority |
| --- | --- | --- |
| Consent | Adult-to-adult durable participation is accepted, not silently imposed | Hard |
| Calm pending state | Pending, declined, and expired invitations do not create notification pressure | Important |
| Revocation | Future access ends promptly and stale devices cannot continue mutating after refresh | Hard |
| Data aftermath | Leave/remove flows explain ownership, copies, assignments, history, and export | Hard |
| Ownership transfer | Durable Spaces cannot become ownerless; successor and billing consequences are explicit | Important |
| Safety exit | Coercive or abusive relationships can be ended without repeated re-entry or surprise exposure | Hard |

### 7. Payment and entitlement

| Criterion | What a 3 requires | Priority |
| --- | --- | --- |
| Entitlement separation | Paid access, Space participation, authority, and data ownership remain separate facts | Hard |
| Bounded free participation | Receiving a copy or performing a narrow invited action does not require full payment | Important |
| Sponsorship provenance | A person can see why they have paid access and what happens if sponsorship ends | Important |
| Multiple entitlement sources | Personal purchase, sponsorship, Apple-shared receipt, and internal grants resolve predictably | Hard |
| Humane downgrade | Payment loss preserves data and relationship truth while limiting only paid operations | Hard |
| Billing transfer | Billing responsibility can change without silently changing Space ownership or authority | Important |

### 8. Offline, sync, and audit

| Criterion | What a 3 requires | Priority |
| --- | --- | --- |
| Truthful offline read | Cached participation and policy state includes freshness and does not overclaim | Hard |
| Authority mutations | Invite acceptance, role/grant changes, and removal require authoritative server acceptance | Hard |
| Safe local action | Eligible object actions can occur offline with idempotent reconciliation where policy permits | Important |
| Audit history | Invitation, grant, role, share, reassignment, removal, and sponsorship changes are attributable | Hard |
| Conflict semantics | Concurrent edit, completion, reassignment, and removal have deterministic outcomes | Important |

### 9. Reductive and calm UX

| Criterion | What a 3 requires | Priority |
| --- | --- | --- |
| Solo invisibility | A person who never shares sees no Space administration or empty collaboration chrome | Hard |
| Contextual activation | Space formation and sharing appear at the moment another person is needed | Important |
| No admin dashboard dependency | Useful participation does not require maintaining a people/role dashboard | Hard |
| Progressive detail | Effective access is inspectable without making every everyday row carry permission metadata | Important |
| Notification restraint | Participation produces only actionable, recipient-respecting notifications | Important |

### 10. Platform coherence

| Criterion | What a 3 requires | Priority |
| --- | --- | --- |
| Single global owner | Identity, permission evaluation, entitlement, notification routing, deletion, and export have one platform owner | Hard |
| Capability boundaries | Goals, Activities, Money, Recipes, Stories, and Screen Time keep domain-specific policy and data ownership | Hard |
| Reusable primitives | Invitations, Person identity, participation, grants, shares, and audit are shared where semantics match | Important |
| Migration safety | Existing personal data and Goal partners do not silently change visibility or ownership | Hard |
| Evidence boundary | Simulator, signed-device, TestFlight, entitlement, and production proof remain distinct | Important |

## Use-case coverage scorecard

For each model, fill this matrix using the stable IDs from [the use-case catalog](./jobs-personas-and-use-cases.md#use-case-catalog).

| Use-case family | IDs | Score | Evidence or design explanation | Blocking question |
| --- | --- | ---: | --- | --- |
| Personal continuity | PC-1–PC-6 |  |  |  |
| Direct household | HH-1–HH-8 |  |  |  |
| Extended/cross-household | XF-1–XF-9 |  |  |  |
| Support/accountability | SP-1–SP-5 |  |  |  |
| Lifecycle | LC-1–LC-10 |  |  |  |
| Payment | PE-1–PE-7 |  |  |  |

## Persona pressure-test questions

### Maya

- Can Maya capture and act without choosing a Space?
- Can she coordinate Charlie without seeing his work in My To-dos?
- Can she invite Grandma for one child/capability without giving household-wide access?
- Can she understand the system without learning permission terminology?

### David

- Can David invite support without turning his Goal into co-owned property?
- Can he preview exactly what the supporter sees?
- Can he end support calmly and reversibly?
- Does the design avoid surveillance and shame?

### Ruth

- Can Ruth send a recipe without joining, paying for, or administering a Space?
- Is copy versus live sharing obvious?
- Does provenance survive copying and later edits?
- Can repeated family contribution become durable without forcing it on the first share?

### Jordan

- Can Jordan participate in several Spaces without duplicate accounts?
- Are all of Jordan's responsibilities visible in one personal surface?
- Can child/caregiving authority differ across Spaces and children?
- Can Jordan leave one relationship without harming unrelated personal or shared data?

### Marcus

- Does the system add any routine classification or switching work?
- Can every new UI element justify itself with active shared inventory?

### Nina

- Can Agent explain which Space supplied each fact?
- Can Nina narrow or remove Space scope before an AI action?
- Is every mutation still capability-owned and reversible?

## Convergence threshold

A system model is eligible for convergence only when:

1. every hard-fail condition is demonstrably avoided;
2. each use-case family scores at least 2;
3. PC-3 unified My To-dos, HH-6 managed child Screen Time, XF-1 recipe copy, SP-2 scoped supporter, LC-6 removal, and PE-6 downgrade each score 3 at the design-contract level;
4. the model needs no more than one new user-visible platform noun beyond **Space** and familiar capability-specific relationship words;
5. the solo experience remains unchanged; and
6. unresolved questions are explicitly isolated rather than hidden behind generic “role” or “member” abstractions.
