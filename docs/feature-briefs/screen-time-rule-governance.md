---
id: brief-screen-time-rule-governance
title: Screen Time Rule Governance
status: accepted
audiences: [audience-burned-out-productivity-power-users, audience-aspirational-family-organizers]
personas: [Marcus, Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves: [jtbd-put-intention-before-impulse, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-screen-time-controls-contextual-setup, brief-family-screen-time-controls, brief-screen-time-controls]
owner: andrew
last_updated: 2026-08-18
---

# Screen Time Rule Governance

## Context

Kwilt already introduces Screen Time contextually, guides Apple approval, and lands the person in Settings. The post-setup surface does not yet behave like a governed rule system: two fixed personal modes appear as cards, Household setup is labeled Family, and Money policies collapse into one aggregate destination outside Rules.

## Target audience

Burned-out productivity power users need inspectable guardrails without another automation system to maintain. Aspirational family organizers need shared Household rules that both authorized caregivers can see without exposing either adult's private personal or Money rules.

## Representative persona

Marcus wants to understand and govern his private rules at a glance. Maya and another caregiver need the same shared child agreements and delivery truth while retaining separate personal collections.

## Aspirational design challenge

How might we help people build and govern understandable Screen Time rules in one calm settings surface, while preserving private personal scope, shared Household authority, capability-owned condition truth, and selection-specific enforcement?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — Screen Time exists to protect meaningful action, not to create another configuration hobby.

## Job flow step

This improves Marcus's **Decide what to do next** step, currently 3/5, by making device guardrails comprehensible and maintainable. It also supports Maya's incomplete **Family participation** and **Keep using the system** steps, but does not raise family delivery scores without signed two-device evidence.

## JTBD framing

When Screen Time protection is active, the person wants to know which private and shared rules the device follows and govern them without reconstructing hidden modes, so the pause before distraction feels chosen, understandable, and trustworthy.

## Design

Settings > Screen Time contains one compact authorization row followed by two collections:

- **My rules · N** — private personal, Focus, To-do, and Money rules.
- **Household rules · N** — shared child rules visible to authorized owners/caregivers.

Each collection has its own **Add rule** action. The action carries scope into the common builder system. Rule rows lead with the selected apps or categories, then state the concrete behavior. Capability or subject context appears only when it disambiguates ownership, such as Money or a child. Each row has one direct enabled control when authority permits and one disclosure path.

The scoped add action opens one structured, full-screen guided builder after
the established initial Screen Time setup pattern. It continues from entry
context and asks one unresolved question at a time. From Settings,
subject is already Me, so the first question is which apps the rule should
manage; after selection, the builder asks what should happen with those apps.
From a contextual Focus or real-step offer, behavior is already known, so the
builder asks only for apps and proceeds directly to a sentence receipt.
When authorization already exists, these workflow offers present the same
builder through a root drawer host so the originating workflow remains visible
behind it. The originating To-do, Focus surface, or other offer context selects
the suggested general rule; it does not become a saved criterion or bind the
rule to that object. If authorization is still required, the existing
full-screen explanation and Apple approval flow runs first, returns to the
originating workflow, and then presents the contextual drawer.
The large app-selection answer opens the picker. The picker's **Done** action confirms a
valid selection and advances to the next unresolved question. Cancel or an
empty selection stays on the apps question, avoiding a redundant second
confirmation.

The broader Household model distinguishes two consequential rule modes:

- **Set when apps are available** — apps begin unavailable and become available
  only when every selected requirement is met.
- **Pause apps at certain times** — apps begin available and pause when any
  selected trigger applies.

This is not an availability toggle and the builder does not expose AND/OR
controls. Each mode fixes its baseline and connector semantics. Guided fields
configure apps and compatible criteria. Prior answers collapse into quiet
editable summaries while the current unanswered prompt remains dominant. A
read-only agreement sentence makes the resulting behavior predictable; a
**Right now** receipt appears only when a condition owner can supply truthful
runtime state.

Examples:

> Instagram and Reddit pause while Focus is running.

> Games are available to Charlie on school days from 4–7 PM, after today's responsibilities are complete, for up to 30 minutes.

Condition owners define compatible fields and deterministic semantics. The builder does not combine independently owned Focus and Money claims into one rule. The control plane continues to preserve each named restriction and AND enforcement across overlapping rules.

Personal rule kinds are repeatable. A person may create multiple Focus,
real-step, or daily-limit rules when the targets or configuration differ. Every
saved rule owns a stable rule ID and native selection ID; editing, toggling,
reconciling, and clearing act on that identity rather than on its condition
kind. Only an exact duplicate of kind, targets, and condition configuration is
rejected.

Overlapping rules are unordered. An app remains paused while any applicable
rule is active; satisfying one rule never implies that another rule was
cleared. The native shield summarizes how many rules apply and names the first
actionable blockers without using sequential language. The in-app guide lists
the concrete rules so the person can inspect every remaining blocker.

Personal rules are private to the signed-in person. Household rules are shared with authorized caregivers. Money rules remain personal unless Money later defines an explicitly shared scope. Children see only their understandable agreement and current next action.

Temporary **Allow until…** and **Pause until…** actions remain versioned,
expiring overrides outside the standing-rule builder.

Delivery is sliced. The first slice replaces the inline personal prototype with
the shared builder semantics and proves both modes using Focus and real-step
rules. The second applies the same builder anatomy to typed Household access
agreements. The third adds Household pause triggers and temporary actions.
Money continues to own creation of Money-backed rules.

## UI contract

Job: When Screen Time is set up, the user needs to see and govern the rules affecting their private and Household scopes, so they can trust what pauses apps and why.

Authority chain: accepted Screen Time briefs and control plane -> Kwilt Settings components/tokens -> iOS Family Controls conventions -> shadcn Item/Field anatomy as upstream quality reference.

Three-second read: Screen Time is allowed; I have N private rules and N Household rules; I can see which targets each concrete rule governs and what it does.

Primary actions: **Add rule** within each collection.

Primary information: target summary, concrete behavior, and state; in the
shipping personal builder, the current unanswered question and accumulated
answers. The expanded Household builder adds criteria, agreement, and a
truthful current-state result.

Secondary information: capability/subject context when useful, authorization,
and delivery detail.

Reveal later: app selection, condition configuration, deletion, temporary
override duration, and technical recovery detail.

Scan order: authorization -> My rules/count/add -> Household rules/count/add -> setup/recovery rows.

Must not add: global dashboard, tabs, editable sentence fragments, generic
wizard instructions or repeated context, arbitrary boolean logic, a global
availability toggle, rule names, global personal visibility, or unverified
device claims.

Reuse map: the initial Screen Time setup's full-screen pine surface, progress
rail, close affordance, typography, and inverse action hierarchy; large
accessible touch cards for consequential choices; Apple FamilyActivityPicker
for app volume; standard BottomDrawer mechanics for condition detail; Button
for one commit action; existing Money and Household authority/persistence
routes.

Required states: no rules, personal only, Money present, Household setup,
applying/needs-attention, permission revoked, either builder mode, builder
incomplete/invalid, current state available/paused/unknown/still blocked by
another rule, picker cancelled, duplicate, unsaved exit, persisted rule,
VoiceOver, and largest Dynamic Type.

Proof path: Settings > Screen Time on iPhone 17 Pro Simulator; signed physical device for native selection and enforcement claims.

## Success signal

The person can correctly count and explain visible private and Household rules,
choose the intended baseline without programming boolean logic, configure every
representative parent-administration case, predict the current outcome, find a
Money-backed rule, and distinguish desired Household state from applied device
state.

## Spec refinement

- The first release uses one add action per group, not a global add action.
- Scoped Add rule opens a dedicated full-screen guided sequence; it does not
  insert an inline sentence or restate context in a generic setup wizard.
- New drafts choose `available_when` or `pause_when`. The connector is derived:
  every access requirement must pass; any pause trigger may block.
- The agreement sentence is a read-only receipt. The current-state receipt uses
  the same deterministic evaluation semantics as enforcement and composes with
  other active restriction claims.
- Personal conditions include Focus, real step, and a device-local daily usage
  allowance. Existing personal records derive their mode, so adding the allowance
  kind requires no rewrite of older records. Chat may carry a self subject,
  suggested app label, bounded minute allowance, and daily reset into the same
  native builder; Apple token selection and save remain native-only.
- Personal condition kinds are repeatable. A qualifying real-step event updates
  every enabled rule for which that event satisfies the rule's own release
  policy; rule IDs, selections, and unlock state remain independent.
- Household Add rule retains the child-specific authority path, then opens the
  same builder screen with a Household adapter. Typed V2 Household agreement JSON
  is introduced behind normalization and legacy reading; IDs, selections, and
  desired/applied version behavior remain stable.
- Money rules are projected individually but their condition configuration
  remains Money-owned.
- Changing a saved rule's type is a deliberate replacement flow that confirms
  removal of incompatible criteria. Rule enabled state remains a separate
  persisted control.
- Temporary Allow/Pause actions are overrides, not builder modes.
- Logic projections and personal rule mutations require tests first; UI composition may be implemented directly with component tests for key states.
- A Chat handoff is not a saved rule or enforcement receipt. It reports only
  that native review opened; the builder owns persistence and signed-device
  monitoring remains a separate proof gate.
- Completion requires representative-case verification, diff-aware source gates,
  Simulator visual/accessibility evidence, and signed-device enforcement proof
  kept as a separate gate.

## Open questions

- Which child responsibility collection supplies `complete today` truth?
- Do school hours come from a stored family schedule or a named rule preset?
