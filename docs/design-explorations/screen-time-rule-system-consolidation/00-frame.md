# Frame: Screen Time Rule System Consolidation

## What the user said

> There shouldn't be a separate Money-owned Screen Time system. There should just be one consistent system across the whole app.

## Restated in user voice

When I use Kwilt to put intention before an easy-to-open app, I want every rule to look, behave, and remain editable as part of one understandable Screen Time system, regardless of whether its condition comes from Money, Focus, time, usage, or a real step, so I never have to infer which hidden subsystem controls my phone.

## Target audience

`audience-aspirational-family-organizers` — Aspirational family organizers. The primary consolidation risk is most visible when a calm spending guardrail turns into a separate finance-admin workflow.

Secondary audience: `audience-burned-out-productivity-power-users`. The same architecture must let Marcus govern private rules without learning which Kwilt capability supplied a condition.

## Representative persona

Maya is using a budget-aware app pause to make an intentional spending choice, not to administer Screen Time infrastructure.

- Current situation: Her Screen Time list contains rules that appear together but open different editors, store state differently, and expose different lifecycle controls.
- What she's trying to do: Understand and change what controls access to an app, in one place and one interaction model.
- Emotional state or tension: She wants a calm guardrail, but inconsistent ownership makes the restriction feel opaque and potentially difficult to reverse.
- What would make this feel wrong to her: A rule that changes identity when it references Money, duplicate controls, or a restriction that remains active after the visible rule is removed.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — The guardrail exists to help Maya follow through on an intentional choice, not to create another configuration system.

## Job flow step

`job-flow-maya-review-budget-reality-before-spending`, step 8: **Choose whether to continue, adjust the plan, or keep a spend-triggering app blocked.**

- Current offering: Category-specific Screen Time app controls plus a shield handoff and temporary review decision.
- Delivery score: 3/5.
- Gap: The choice exists, but budget-backed rules are governed through a separate editor, storage model, and reconciliation path, while signed-device enforcement remains unproven.

Secondary job-flow effect: Marcus's **Decide what to do next** step remains 3/5. One comprehensible rule system reduces maintenance and makes the guardrail easier to trust.

## Active anchors

- `jtbd-put-intention-before-impulse` — Every rule should create the same calm, user-owned pause regardless of condition source.
- `jtbd-review-budget-reality-before-spending` — Money must continue to provide trustworthy budget evidence without owning Screen Time rule identity or lifecycle.
- `jtbd-trust-this-app-with-my-life` — Device restrictions must be inspectable, reversible, and consistent enough that the user does not have to understand internal ownership.

## Friction we're addressing

Kwilt currently presents one Screen Time inventory while maintaining multiple rule systems behind it. New composite rules, legacy personal rules, and Money app-control policies have different storage, editors, lifecycle actions, and reconciliation paths. The shared list makes this fragmentation less visible, but does not remove it; a rule's behavior still depends on where it originated.

## System alignment

Constraint posture: `Bend the system`

The existing capability boundary is the problem: Money currently owns both budget truth and Screen Time policy lifecycle. We should preserve Money's ownership of financial evidence while moving rule identity, composition, persistence, lifecycle, and native projection into Screen Time.

Current system facts:

- Existing surface: Settings > Screen Time shows a combined **My rules** inventory. Money category detail also exposes app controls.
- Existing user flow: Personal rules open the composite composer; budget policies open `MoneyAppControlScreen`; changing a Money rule to a non-budget behavior can transfer its selection into the composite composer.
- Existing domain/data model: V2 `PersonalCompositeScreenTimeRule` supports budget, time-of-day, daily-usage, Focus, and real-step conditions. Legacy personal records and `MoneyAppControlSettings.policies` remain separately persisted.
- Existing technical affordances: stable native selection IDs, selection transfer, condition-owner evaluation, atomic personal-rule actions, shared native restriction stores, inventory projection, and a replacement bridge that removes a Money policy after a composite rule saves.
- Existing UX/copy conventions: one secondary Settings shell; sentence-shaped rule composition; one rule-row disclosure path; direct list toggle; lifecycle overflow; destructive deletion confirmed or revealed by swipe.

Constraints to preserve:

- The canonical editor is the sentence-based composer developed and implemented through this design thread: **Allow access to / Pause access to [selected apps] / When / [condition sentence]**, with inline picker fields, additional sentence conditions, and an explicit AND/OR connector only when needed. Consolidation must route every rule into this composer rather than reopening the editor paradigm.
- Apple's opaque FamilyActivitySelection stays device-local and must survive migration without silently asking the user to select apps again when transfer is possible.
- Money owns eligible budget categories, display names, financial predicate semantics, freshness, and current truth.
- Screen Time owns the rule aggregate, app selection, connector, outcome, lifecycle, overlap semantics, native projection, and explanation of active blockers.
- Personal and Household privacy/authority remain explicit. A single system does not mean a single visibility scope.
- Existing restrictions must never become orphaned, duplicated, or unintentionally cleared during migration.
- Simulator, signed-device enforcement, TestFlight, and production proof remain separate evidence gates.

Constraints we may challenge:

- The separate `kwilt:money:app-control:v1` persistence model.
- `MoneyAppControlScreen` and `MoneyAppControlBudgetPickerScreen` as rule editors.
- Money-specific Screen Time foreground reconciliation.
- Inventory branching on a `money` rule domain.
- Imported briefs that describe the Money category as the canonical Screen Time policy editor.

Design implication:

Unification is not a visual reskin. It requires one canonical rule aggregate and action boundary, with condition providers supplying typed facts instead of owning parallel policies. Money entry points should open the common composer with a budget condition and category preselected. Andrew has explicitly waived preservation of existing rules for this phase, so cutover should safely clear legacy native enforcement and records, then start the canonical system empty rather than build migration infrastructure.

## Aspirational design challenge

How might we help Maya understand and govern every app-access rule through one calm Screen Time system, while preserving Money's trustworthy financial truth, Apple's private selections, and explicit personal-versus-Household authority?

## Out of scope

- Redesigning Money budgets or their financial predicates.
- Expanding Household rule semantics beyond the already accepted shared-builder direction.
- Replacing Apple's Screen Time authorization, picker, shield, or entitlement model.
- Adding new rule names, dashboards, automation taxonomies, or a second migration-management UI.
- Claiming physical-device enforcement before signed-device proof.

## Open question

Household may retain a distinct authority and persistence adapter in this phase, but it must use the same aggregate grammar and composer contract. Full Household persistence consolidation remains sequenced work rather than a blocker for retiring the personal and Money split.
