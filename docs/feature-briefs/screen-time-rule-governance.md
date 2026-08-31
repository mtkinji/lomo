---
id: brief-screen-time-rule-governance
title: Screen Time Rule Governance
status: accepted
audiences: [audience-burned-out-productivity-power-users, audience-aspirational-family-organizers]
personas: [Marcus, Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-marcus-move-the-few-things-that-matter
serves: [jtbd-put-intention-before-impulse, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-screen-time-controls-contextual-setup, brief-family-screen-time-controls, brief-screen-time-controls, brief-screen-time-rule-system-consolidation]
owner: andrew
last_updated: 2026-08-31
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

The scoped add action opens one structured, full-screen builder after the
established initial Screen Time setup pattern. From Settings, subject is
already Me, so the first question is which apps the rule should manage. Apple
selection advances directly into a sentence-shaped rule composer whose visible grammar is
**Rule behavior / Allow or Pause access to [selected apps] / When / [condition]**.
The selected apps belong to the behavior statement instead of a page title or repeated summary
row. Selectable outcome, target, condition field, operator, and value phrases use compact picker
fields rather than underlined text. Conditions live in their own white well beneath **When**.
Additional conditions extend that well with an editable **AND** or **OR** connector. **Add
condition** remains inside that well. There is no separate **Then** section, behavior step, or
sentence receipt.
From a contextual Focus, real-step, or daily-use offer, the known condition is
prepopulated but remains editable.
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

The outcome is explicit and concrete: **Allow access** or **Pause access**.
When a rule has more than one condition, the connector is equally explicit:
**AND** means every condition must match; **OR** means any condition may match.
Tapping the connector changes it through a two-choice radio drawer. The UI and
runtime consume the same normalized aggregate so the visible connector is not
decorative copy.

Examples:

> Instagram and Reddit pause while Focus is running.

> Games are available to Charlie on school days from 4–7 PM, after today's responsibilities are complete, for up to 30 minutes.

Condition owners define compatible fields and deterministic semantics. The
personal composite supports time of day, device-local daily usage, Focus,
real-step completion, and budget truth. Screen Time owns the composed rule;
Money owns eligible budget names, condition semantics, and current budget
truth. This allows a budget condition to participate honestly in the same
visible AND/OR aggregate instead of creating a hidden second rule. The control
plane continues to preserve each named restriction and AND enforcement across
overlapping saved rules.

Personal composite rules are repeatable. Every saved aggregate owns one stable
rule ID and native selection ID; editing, toggling, reconciling, and clearing
act on that aggregate rather than its individual conditions. V1 Focus,
real-step, and daily-limit records migrate to equivalent one-condition V2
aggregates. Only an exact duplicate of targets, outcome, connector, and
condition configuration is rejected.

Overlapping rules are unordered. An app remains paused while any applicable
rule is active; satisfying one rule never implies that another rule was
cleared. The native shield summarizes how many rules apply and names the first
actionable blockers without using sequential language. The in-app guide lists
the concrete rules so the person can inspect every remaining blocker.

For one active personal composite rule, the native shield names the blocked app
and states the condition values that currently cause the pause, such as the
current time or a reached daily-use limit. It does not substitute the selected
app or category name for the reason. The same bounded condition details travel
with the shield handoff into Kwilt. **Open Screen Time** presents them in a
full-height, scrollable guide; older native records without condition details
retain the generic review message. When multiple rules affect the same target,
the shield keeps the unordered rule-count summary and the guide lists each
resolved rule rather than implying that one action clears every blocker.

Personal rules are private to the signed-in person. Household rules are shared with authorized caregivers. Money rules remain personal unless Money later defines an explicitly shared scope. Children see only their understandable agreement and current next action.

Temporary **Allow until…** and **Pause until…** actions remain versioned,
expiring overrides outside the standing-rule builder.

Delivery is sliced. The first slice replaces the inline personal prototype with
the shared builder semantics and proves both modes using Focus and real-step
rules. The second applies the same builder anatomy to typed Household access
agreements. The third adds Household pause triggers and temporary actions.
The accepted Screen Time rule-system consolidation supersedes standalone Money
app-control editing. Money supplies budget choices and current truth to this
composer; Screen Time owns every rule's identity, lifecycle, and enforcement.

## UI contract

Job: When Screen Time is set up, the user needs to see and govern the rules affecting their private and Household scopes, so they can trust what pauses apps and why.

Authority chain: accepted Screen Time briefs and control plane -> Kwilt Settings components/tokens -> iOS Family Controls conventions -> shadcn Item/Field anatomy as upstream quality reference.

Three-second read: Screen Time is allowed; I have N private rules and N Household rules; I can see which targets each concrete rule governs and what it does.

Primary actions: **Add rule** within each collection.

Primary information: concrete behavior, then target summary and state; in the
personal builder, the editable When conditions, visible connector, and Then
outcome.

Secondary information: capability/subject context when useful, authorization,
and delivery detail.

Reveal later: app selection, condition configuration, deletion, temporary
override duration, and technical recovery detail.

Scan order: authorization -> My rules/count/add -> Household rules/count/add -> setup/recovery rows.

Must not add: global dashboard, tabs, generic wizard instructions or repeated
context, decorative rails, an enclosing condition card, a result card, green
emphasis, separate user-authored rule names, inconsistent dividers inside a
choice list, global personal visibility, or unverified device claims. The
generated rule sentence serves as the inventory title; the target summary is
supporting context.

Reuse map: the canonical secondary Settings page shell; Apple
FamilyActivityPicker for app volume; standard BottomDrawer and radio-row
mechanics for condition detail; DurationPicker and native time picker for
values; Button for one commit action; existing Money and Household
authority/persistence routes. The green full-screen treatment remains reserved
for initial Screen Time onboarding, not ongoing rule management.

Required states: no rules, personal only, Money present, Household setup,
applying/needs-attention, permission revoked, either builder mode, builder
incomplete/invalid, current state available/paused/unknown/still blocked by
another rule, picker cancelled, duplicate, unsaved exit, persisted rule,
VoiceOver, and largest Dynamic Type.

Proof path: Settings > Screen Time on iPhone 17 Pro Simulator; signed physical device for native selection and enforcement claims.

## Success signal

The person can correctly count and explain visible private and Household rules,
choose the intended outcome and connector, configure every
representative parent-administration case, predict the current outcome, find a
Money-backed rule, and distinguish desired Household state from applied device
state.

## Spec refinement

- The first release uses one add action per group, not a global add action.
- Scoped Add rule opens a dedicated full-screen guided sequence; it does not
  insert an inline sentence or restate context in a generic setup wizard.
- New drafts choose `available` or `pause` and store an explicit `all` or `any`
  connector. A connector is shown only when two or more conditions exist.
- The flat composer is the source of truth; it does not duplicate the rule as a
  read-only agreement receipt. Inventory copy uses the same normalized
  conditions and connector as enforcement.
- Personal conditions include Focus, real step, a device-local daily usage
  allowance, time of day, and Money-owned budget truth. Existing personal records derive their mode, so adding the allowance
  kind requires no rewrite of older records. Chat may carry a self subject,
  suggested app label, bounded minute allowance, and daily reset into the same
  native builder; Apple token selection and save remain native-only.
- A saved personal aggregate contains at most one condition of each current
  device-monitoring type. A qualifying real-step or Focus event refreshes host
  truth for every enabled aggregate that references it; time and usage truth
  remain device-local.
- Household Add rule retains the child-specific authority path, then opens the
  same builder screen with a Household adapter. Typed V2 Household agreement JSON
  is introduced behind normalization and legacy reading; IDs, selections, and
  desired/applied version behavior remain stable.
- A composed rule stores a stable budget source ID, display name, and
  Money-defined predicate. Money supplies current truth to Screen Time without
  owning or separately enforcing any rule. The consolidation phase clears and
  retires standalone Money policies rather than preserving a permanent
  projection path.
- Changing a condition field replaces only that condition and its incompatible
  operator/value. The composer contains no lifecycle controls. A saved rule's
  header overflow reveals **Turn on/off rule** and **Delete rule**, with deletion
  visually destructive and confirmed before native enforcement is removed. The
  My rules list owns the frequent direct enabled switch and exposes deletion by
  swipe; tapping the rest of the row opens the rule detail. There is no Rule
  management or danger-zone section.
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
