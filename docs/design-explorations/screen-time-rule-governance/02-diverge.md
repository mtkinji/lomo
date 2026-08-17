# Diverge: Screen Time Rule Inventory And Builder

## Accepted frame

One Screen Time capability contains two differently visible collections:

- **My rules** — private personal, Focus, To-do, and Money rules.
- **Household rules** — shared rules visible to authorized owners/caregivers for named children.

Both use one rule vocabulary and one builder system. `Policy` remains internal
language. Subsequent builder research and use-case analysis selected a structured
single-screen builder with two fixed semantic modes; see
`07-structured-rule-builder-contract.md`. The inventory directions below remain
the relevant divergence evaluated by this file.

## Axis of variation

How should the inventory balance immediate whole-system visibility against scope clarity and family-oriented growth?

## Direction A: Grouped Rule Library

One scrolling Settings page shows a compact authorization row, **My rules · N**, and **Household rules · N**. Every rule uses the same list-row anatomy: readable sentence, scope/owner context, target count, state, direct switch where authorized, and disclosure into detail. Each group has its own **Add rule** action, carrying personal or Household scope into the same builder system so the user does not choose scope twice. Eligible household members without rules appear as restrained setup rows below the Household collection rather than masquerading as rules.

- Audience/persona fit: Marcus can understand the complete system without maintaining separate views; Maya and another caregiver see the same Household collection without seeing each other's private rules.
- Design-challenge answer: centralizes visibility and governance while keeping scope explicit through section boundaries.
- System fit: extends the current overview and reuses its route; requires per-rule Money and Household projections instead of aggregate destination rows.
- Reference grounding: shadcn `ItemGroup`/`Item` anatomy for inventory rows and `FieldSet`/`Field` choice anatomy for the builder, localized through Kwilt React Native components.
- Best when: most users have a small number of rules and need the whole system to remain legible in one glance.
- Fails when: rule counts become large enough that a single scroll needs filtering or search.
- Anti-pattern check: passes; no dashboard, policy workspace, arbitrary logic, or nested card stack.

## Direction B: Scope Tabs

The Settings page has a compact segmented control for **Mine** and **Household**, each with its own count and list. **Add rule** inherits the active scope, so the builder begins with the subject already selected. Household can show caregiver-shared delivery state without competing with private personal rules. A small summary above the control states the total rules visible to the current person.

- Audience/persona fit: gives strong privacy and authority clarity, especially as Household rules grow.
- Design-challenge answer: makes the two persistence and sharing scopes unmistakable.
- System fit: introduces a new view-state concept and requires the user to switch scopes to reconstruct the complete set.
- Reference grounding: shadcn `Tabs` as a web anatomy reference, translated to Kwilt's native small-set selection pattern rather than copied directly.
- Best when: both collections frequently contain several rules and users usually work within only one scope at a time.
- Fails when: users overlook Household rules, misunderstand the total, or experience the capability as two separate products.
- Anti-pattern check: passes narrowly, but risks creating an unnecessary mode switch and hiding important rules.

## Direction C: Person Shelves

The inventory groups rules by subject: **Me**, **Charlie**, **Olive**, and future managed people. Personal Focus and Money rules live under Me; shared child agreements live under that child. Each subject header shows rule count, authorization/readiness, and a local add action. The builder starts from the selected subject and reveals only condition types valid for that person and authority scope.

- Audience/persona fit: highly concrete for Maya, who thinks first about which child needs an agreement; still understandable for Marcus when only Me exists.
- Design-challenge answer: makes subject and authority primary rather than asking metadata to carry privacy meaning.
- System fit: bends the current owner-grouped control-plane presentation toward people; risks conflating a person setup router with the rule inventory.
- Reference grounding: shadcn grouped `Item` lists and section actions, localized to Kwilt Settings groups.
- Best when: Household Screen Time becomes the dominant use case with several children and several rules per child.
- Fails when: the Me shelf becomes a mixed bag of personal, Focus, and private Money rules, or people without rules add empty-state noise.
- Anti-pattern check: passes if empty people remain hidden or restrained; fails if it becomes a family administration dashboard.

## Cross-direction builder anatomy

All three inventory directions use the same structured, single-screen builder:

1. **For** — Me or an authorized household member; implicit when entered from a scoped add action.
2. **Rule type** — either conditional availability or triggered pause, with its consequence visible.
3. **Apps** — Apple app/category selection plus a readable saved label when required.
4. **Requirements or triggers** — compatible owner-defined choices with fixed ALL or ANY semantics derived from rule type.
5. **Agreement** — a complete read-only sentence.
6. **Right now** — the predicted result composed with other active claims.
7. **Create rule** — one commit action; no partial activation.

Triggered personal example:

> Pause **Instagram and Reddit** when **Focus is running**.

Shared Household example:

> **Games** are available to **Charlie** on **school days from 4–7 PM**, after **today's responsibilities are complete**, for up to **30 minutes**.

The builder does not expose arbitrary boolean groups, priority, notifications,
user-authored rule names, or temporary overrides. Multiple criteria are
supported only through the fixed mode semantics and owner-defined condition
types.

## Preliminary read

Direction A best matches the accepted frame today: one capability and one visible inventory, with honest scope boundaries, scoped add actions, and no mode switch. Direction B is a credible density response if rule counts grow. Direction C is the strongest future family-administration shape but prematurely makes people the primary Screen Time information architecture.
