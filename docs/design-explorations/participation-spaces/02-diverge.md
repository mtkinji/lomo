# Diverge: Participation Space System Models

This phase explores materially different system shapes. It does not converge. The axis of variation is **where access context lives**: in one globally active Space, in each shared object, in named Spaces plus scoped grants, or in a graph of nested circles.

All models must preserve the Arc → Goal → Activity → Chapter hierarchy. Space is context and authority, not a fifth meaning/progress object. Capture-first remains non-negotiable.

## Option A — Active Space workspaces

### Sketch

Each account belongs to one or more named Spaces. The user selects **Personal**, **The Watanabes**, or **Watanabe Family** from a global switcher. To-dos, Goals, Recipes, Money, Search, and Agent then render the currently active Space.

### Persona and challenge fit

- Maya: moderate for focused household administration, poor for a mixed personal day.
- David: poor; one supporter relationship becomes a navigation context.
- Ruth: understandable for a family cookbook after adoption, heavy for first share.
- Jordan: very poor; multiple households create constant switching.
- Marcus: fails immediately through system maintenance.

### System fit

This resembles established enterprise collaboration architecture and simplifies per-query authorization, but contradicts Kwilt's accepted personal action model. It would make the shell and every capability Space-aware before demand exists.

### Best when

Every Space is a largely separate world with its own work, navigation, payment, and administration.

### Fails when

A person needs one To-do list, one Plan, or one Agent interaction across responsibilities.

### Anti-pattern check

Fails the explicit no-space-switching rule and risks turning family life into workspace administration.

### Coverage snapshot

| Family | Score | Reason |
| --- | ---: | --- |
| Personal continuity | 0 | Requires a current Space |
| Direct household | 2 | Strong roster and focused context, heavy everyday use |
| Extended family | 2 | Can model groups, but overcommits one-off shares |
| Support/accountability | 1 | Creates needless Spaces or overbroad membership |
| Lifecycle | 2 | Familiar membership lifecycle, unclear cross-Space objects |
| Payment | 2 | Easy per-Space billing, but likely conflates payment and participation |

Verdict: **reject as the user-facing system**. Some internal storage or policy partitions may resemble it, but the experience must not.

## Option B — Object-only sharing

### Sketch

There are no named Spaces beyond a person's private account. Every Activity, Goal, recipe, story, child profile, or Screen Time agreement owns its own invite list and role set. Repeated groups are reselected or copied from recent recipients.

### Persona and challenge fit

- Maya: strong for one Activity, weak for durable household roles and managed children.
- David: strong for one Goal or agreement.
- Ruth: excellent for one recipe copy or live share; weak for a sustained family collection.
- Jordan: personal aggregation can remain strong, but authority is repeated object by object.
- Marcus: low setup initially; repeated permission work becomes maintenance.

### System fit

This extends existing Goal membership and proposed Activity assignment with the smallest common abstraction. It preserves capability ownership and avoids a generic people system, but cannot elegantly express one caregiver's authority over several child capabilities or a durable family group.

### Best when

Sharing is sparse, one-off, and attached to a single object.

### Fails when

The same people repeatedly participate across many objects, when dependent identities exist, or when a durable capability such as Money or Screen Time needs stable authority.

### Anti-pattern check

Passes capture-first and avoids dashboards. Risks repeated invitation/admin work and inconsistent role semantics across capabilities.

### Coverage snapshot

| Family | Score | Reason |
| --- | ---: | --- |
| Personal continuity | 3 | Personal projections can aggregate shared objects |
| Direct household | 1 | No durable roster, dependent identity, or reusable authority |
| Extended family | 2 | Excellent one-off sharing, weak repeated collaboration |
| Support/accountability | 3 | Naturally scoped to the supported object/agreement |
| Lifecycle | 1 | Removal and role changes repeat across every object |
| Payment | 1 | No coherent sponsorship boundary |

Verdict: **preserve as the one-off sharing layer**, but insufficient as the whole participation system.

## Option C — Named Spaces with scoped participation and personal projections

### Sketch

Every person has an implicit private context. Durable groups may create named Spaces such as **The Watanabes** or **Watanabe Family**. A person can participate in several Spaces. Participation establishes presence and minimal relationship context; effective grants determine capability/object access. A scoped participant can receive one grant without normal Space-wide access. One-off shares remain object-level and need no Space. My To-dos, Today, Plan, Search, Notifications, and Agent are person-centered projections across authorized sources.

The model separates:

```text
Person / dependent profile
  -> participation in a Space, if durable presence is needed
  -> optional role preset for understandable defaults
  -> explicit effective grants
  -> object share or capability projection
  -> entitlement or sponsorship provenance
```

### Persona and challenge fit

- Maya: strong; direct household becomes one Space while Grandma receives only named grants.
- David: strong if supporter access can remain scoped without creating a Space or co-ownership.
- Ruth: strong if recipe copy remains outside Space and repeated contribution can later form one.
- Jordan: strongest option for multiple contexts plus unified responsibility.
- Marcus: acceptable only if personal capture and action surfaces remain Space-agnostic.
- Nina: strong if Space/source scope is inspectable in Agent.

### System fit

This bends the current unified architecture from one global household identity toward a broader participation platform while preserving capability-owned permissions and the personal shell. It can absorb the Household primitives rather than discard them. The blast radius is substantial: identity, permissions, sync, global projections, deletion/export, Agent evidence, notifications, and entitlement all need explicit Space awareness.

### Best when

Kwilt expects both durable multi-capability family participation and sparse object-level sharing.

### Fails when

The implementation treats Space as a universal owner of all data, gives every participant baseline capability access, or exposes Space selection throughout daily navigation.

### Anti-pattern check

Passes in concept. It fails if the user-facing product becomes a permission dashboard, if every relationship creates a Space, or if “member” becomes a broad access shortcut.

### Coverage snapshot

| Family | Score | Reason |
| --- | ---: | --- |
| Personal continuity | 3 | Person-centered projections are a first-class contract |
| Direct household | 3 | Stable roster, dependents, roles, and grants fit |
| Extended family | 3 | Supports copies, live objects, durable Spaces, and cross-Space people |
| Support/accountability | 3 | Scoped participant/grant avoids co-ownership and new Space creation |
| Lifecycle | 2 | Model can express it, but transfer, co-parenting, and data aftermath need deeper contracts |
| Payment | 2 | Clean separation exists, but sponsorship and downgrade rules remain unresolved |

Verdict at divergence: **leading hypothesis**, subject to lifecycle, ownership, and payment pressure tests. Those tests are completed in the later lifecycle, entitlement, and scenario documents.

## Option D — Nested circles and family graph

### Sketch

People create named Circles that can contain people and other Circles. **The Watanabes** and **Grandma & Grandpa Watanabe** can both join **Watanabe Family**. Permissions and payment may inherit through circle nesting. Relationship labels form a reusable private family graph.

### Persona and challenge fit

- Maya: expressive, but likely too difficult to reason about.
- David: overbuilt for one supporter.
- Ruth: appealing family-tree metaphor, but turns recipe sharing into graph maintenance.
- Jordan: may model complex family relationships, but inherited authority becomes dangerous.
- Marcus: fails on administration.

### System fit

This is the most general model and the least compatible with Kwilt's reductive posture. Nested membership creates hard questions about revocation, duplicate paths, permission precedence, child identity, and billing. It also encourages the system to model kinship rather than support capability jobs.

### Best when

The product's primary job is maintaining a family network or organization graph.

### Fails when

Users need to understand exactly why one person can see or change one sensitive thing.

### Anti-pattern check

Fails through administrative overhead, likely inherited access surprises, and family-graph product drift.

### Coverage snapshot

| Family | Score | Reason |
| --- | ---: | --- |
| Personal continuity | 2 | Aggregation possible, but provenance becomes complex |
| Direct household | 2 | Expressive but inheritance risks overbroad authority |
| Extended family | 3 | Richest family structure |
| Support/accountability | 1 | Excessive graph for one relationship |
| Lifecycle | 0 | Revocation and precedence are unsafe without major complexity |
| Payment | 1 | Nested sponsorship and seat counting become opaque |

Verdict: **reject inheritance and nested Spaces**. A UI may reuse a recent group of people, but effective access should resolve from direct participation and explicit grants, not nested circle membership.

## Comparative pressure test

| Requirement | Active Space | Object-only | Spaces + grants | Nested graph |
| --- | ---: | ---: | ---: | ---: |
| One personal To-do layer | 0 | 3 | 3 | 2 |
| No setup for one-off share | 1 | 3 | 3 | 1 |
| Durable household roles | 3 | 1 | 3 | 2 |
| Scoped accountability partner | 1 | 3 | 3 | 1 |
| Cross-household family collection | 2 | 2 | 3 | 3 |
| Legible least privilege | 2 | 3 | 3 | 0 |
| Dependent child identity | 3 | 1 | 3 | 2 |
| Humane lifecycle | 2 | 1 | 2 | 0 |
| Payment separation | 2 | 1 | 2 | 1 |
| Reductive Kwilt fit | 0 | 2 | 2 | 0 |

## Questions carried into the strengthening pass

Option C was not ready to converge until the design answered:

1. Does a scoped participant become visible in the Space roster, a capability roster, or both?
2. What minimum information does ordinary Space participation reveal before grants?
3. Can one person be a full participant in multiple household-type Spaces, and what does that mean for children and Money?
4. Does every object have one owning Space, or can a personal object remain personally owned while shared into a Space?
5. What are the exact copy, live-share, move, and assignment transitions?
6. How are effective grants explained without exposing a generic permission editor?
7. What survives leaving or removal when a person authored meaningful shared content?
8. How does sponsorship resolve when a person has a personal purchase, Apple-shared receipt, and one or more Space sponsors?
9. Which bounded participant actions remain free?
10. How do personal projections sync and operate offline without mixing private Space data on the wrong device/account?

The common contracts now answer these at platform level. Capability briefs must still make their own field, mutation, export, offline, and safety policies explicit.

The next convergence phase should answer these through scenario walkthroughs, not by naming more abstractions.
