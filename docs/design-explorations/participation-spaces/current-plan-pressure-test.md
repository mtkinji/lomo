# Current Plan Pressure Test Against Participation Spaces

This review asks how well the current Household, Activity assignment, Screen Time, shared Goal, unified shell, and monetization plans respond to the broader jobs. It does not invalidate the bounded family Screen Time learning release.

## Summary

The current plan is strong for one direct household and one managed child. It already contains several correct platform ideas: dependent profiles, independent auth bindings, capability-scoped grants, private-by-default data, auditable authority, responsibility-based My To-dos, and separation from Apple Family Sharing.

It is not yet a general Spaces architecture. It assumes Household as the main durable participation boundary and does not fully specify multiple Spaces, scoped non-household participants, cross-household sharing, unified projections beyond household Activities, or sponsorship lifecycle.

## Existing contract assessment

| Existing contract | What holds up | What does not yet cover | Rubric result |
| --- | --- | --- | --- |
| Household Foundation | Stable member/profile IDs, owner/caregiver/child roles, grants, invitations, audit, private-by-default capabilities | Multiple Spaces, outside scoped participants, cross-household participation, entitlement sponsorship | Strong vertical slice; partial platform |
| Household Activity Assignment | Responsibility-based list membership, minimum actionable projection, no creator-list clutter, offline/idempotent completion posture | Non-household assignees, Space provenance across all personal views, object ownership versus source Space | Strong and reusable with generalization |
| Chores | Activity remains canonical, occurrences remain completion truth, no separate chore object | Participation outside one Household | Correct capability consumer |
| Family Screen Time | Separates Kwilt role from Apple authorization, desired policy from applied receipt, online authority from offline enforcement | Adult scoped supporter, grandparent outside Household, multi-household caregiving | Strong child vertical; not platform owner |
| Goal Partners | Invitations, authenticated identity, signals-only support, recipient experience, leave/remove direction | Distinguishes support from co-ownership only partially; no reusable Space/grant contract | Valuable donor, semantically too Goal-specific |
| Unified Kwilt architecture | One global owner for auth, permissions, entitlements, notifications, deletion/export; capability boundaries | Names user and household identity, not Person/Space/participation as the broader platform | Needs a future architecture amendment if Spaces converge |
| Monetization brief | Entitlement is distinct from shared Goal identity | Older Apple-roster-only family posture conflicts with app-managed sponsorship needs | Requires separate re-review; do not inherit as Spaces truth |

## Use-case coverage

Design-coverage scores only; `0–3` uses the [rubric](./system-design-rubric.md#scoring).

| Use-case family | Current design coverage | Evidence | Main gap |
| --- | ---: | --- | --- |
| Personal continuity | 2 | Household Assignment clearly protects My To-dos | Today, Plan, Search, Notifications, and Agent are not yet specified across Spaces |
| Direct household | 3 | Household, Assignment, Chores, and Screen Time roadmap | Multiple children/devices are deliberately deferred but model-compatible |
| Extended/cross-household | 1 | Broader-family participation is explicitly separate | No copy/live model, shared collections, or cross-household participant contract |
| Support/accountability | 2 | Goal Partners and signals-only check-ins work | Scoped support is still tied to a Goal membership model; adult Screen Time support is absent |
| Lifecycle | 2 | Invite, remove, release, audit, and offline authority are acknowledged | Ownership transfer, participant-authored data, dependent independence, and co-parenting remain thin |
| Payment | 1 | Billing is correctly declared separate from authority | No accepted sponsor/seat/free-participant/downgrade model |

## Hard-fail audit

The current family plan avoids most hard failures:

- It does **not** expose all household data on membership.
- It does **not** treat Apple Family Sharing as Kwilt authorization.
- It does **not** force a Space switcher for household To-dos.
- It does **not** duplicate chores into a separate object store.
- It does **not** conflate adult `.individual` and child `.child` Screen Time authorization.
- It does **not** claim offline authority mutations can succeed immediately.

The broader system would fail if implementation extended the current plan by:

- making Household the only target for every share or assignment;
- making a global Household selector govern To-dos or Agent;
- turning every goal supporter or recipe recipient into a household member;
- treating an Apple-shared subscription as evidence of Space membership;
- requiring an extended-family paid seat for a recipe copy; or
- reusing `co_owner` as the only non-household participation role.

## Recommended plan relationship

### Keep the family Screen Time learning release bounded

The existing sequence remains valid as a vertical proof:

```text
Household
  -> one-off Activity assignment
  -> managed child device
  -> recurring chores and time-of-day controls
  -> chore-gated family agreement
```

Do not add extended family, adult accountability, recipe sharing, multiple households, or billing to that learning release.

### Move common primitives upward before permanent architecture

The Spaces direction has now converged at the design-contract level. A permanent platform plan should own:

- Person and dependent-profile identity;
- named Space lifecycle;
- participation and invitation;
- role presets and effective grants;
- object copy/live-share provenance;
- person-centered aggregate projections;
- sponsorship and entitlement provenance;
- audit, removal, deletion, and export contracts.

Household then becomes a Space configuration with dependent profiles and family-specific role presets. Goals, Activities, Recipes, Stories, Money, and Screen Time remain capability owners that opt into the platform contract.

### Preserve capability truth

The Spaces platform must not own:

- Activity completion or recurrence;
- Goal progress/check-in semantics;
- recipe content or version behavior;
- Money account/transaction access policy;
- Screen Time device authorization, policy evaluation, or enforcement; or
- entitlement purchase/reporting truth.

It may provide the identity, participation, grant, share, and audit substrate those capabilities consume.

## Next documentation reconciliation

The model has passed its convergence rubric, but canonical taxonomy and feature-brief changes still require an explicit reconciliation pass:

1. Add the cross-Space responsibility step to Maya's canonical job flow.
2. Broaden David's job flow from Goal-only support to a bounded slice of life.
3. Decide whether Ruth's family-knowledge job deserves a persona/JTBD/job flow.
4. Replace Household as the single global identity noun in the unified architecture with Person/Space participation, while retaining Household as a first-class Space type.
5. Refactor Household Foundation to consume a Spaces platform brief rather than own all shared identity primitives.
6. Generalize Activity assignment eligibility beyond household members only if adult/cross-Space handoff is actually selected for a release.
7. Reconcile the monetization brief with app-managed sponsorship, bounded free participation, Apple Family Sharing, and humane downgrade.

## Risks the first learning slices must still test

1. **Unified responsibility:** a technically correct permission system still fails if My To-dos, Today, Plan, or Agent fragments by Space.
2. **Extended-family value:** the architecture may be overbuilt if real demand stops at sending a recipe copy; the activation ladder prevents that demand from forcing a Space.
3. **Support versus co-ownership:** the scoped-support contract is coherent, but Goal UX must still prove people understand the difference.
4. **Lifecycle safety:** the common contract contains ordinary transitions, while adversarial co-parenting, dependent independence, and abuse recovery remain gated specialist work.
5. **Payment distortion:** the entitlement-source contract prevents access coupling, but commercial seat decisions could still create unwanted sharing friction.

## Completed strengthening challenge

The leading Spaces-plus-grants hypothesis has now been walked through child assignment, recipe copy/live collaboration, grandparent caregiving, accountability support, leaving one of several Spaces, and billing transfer. Each story explains:

- source and ownership;
- who participates and why;
- effective rights;
- personal aggregation;
- offline truth;
- exit/removal; and
- payment consequences.

The result is documented in [Critical Scenario Walkthroughs](./critical-scenario-walkthroughs.md) and [Converge: Person-Centered Spaces](./03-converge.md). The next challenge is to reconcile the existing feature briefs and select the first learning checkpoint, not to broaden the platform further.
