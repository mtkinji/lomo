# Frame: Screen Time Rule Governance

## What the user said

> In my mind, rules were the kinds of things that we would be able to set up using a rule builder, but that's not what we have here. I don't know how many rules I have. I don't know how to govern the rules without tapping on each of these things that sort of looks like a rule. It's a little confusing to me.

## Restated in user voice

When Screen Time protection becomes relevant in a workflow, I want one trustworthy setup experience and one place to build and govern the resulting rules, so I can understand what will be blocked, when, why, and where to change it.

## Target audience

`audience-burned-out-productivity-power-users` — capable people who have already maintained too many productivity systems and will reject another opaque configuration layer.

## Representative persona

Marcus wants a small number of self-authored guardrails, not two fixed feature toggles dressed up as a rule system.

- Current situation: He has enabled personal Screen Time protection from more than one Kwilt context.
- What he's trying to become/do: Put intentional action before drift without maintaining another elaborate system.
- Emotional state or tension: He wants stronger agency but cannot form a reliable mental model of what exists.
- What would make this feel wrong to him: A dashboard, an automation language, hidden overlapping conditions, or a global editor that obscures which capability owns an agreement.

## Hero anchor

`jtbd-move-the-few-things-that-matter` — Screen Time is useful only insofar as it helps meaningful action win without adding system maintenance.

## Job flow step

`job-flow-marcus-move-the-few-things-that-matter`, step 5: **Decide what to do next** currently scores 3/5. Kwilt can protect Focus or require a real step, but the management surface does not let Marcus quickly understand which personal guardrails exist or govern them as a coherent set.

## Active anchors

- `jtbd-put-intention-before-impulse` — each rule should create a chosen, understandable pause before drift.
- `jtbd-trust-this-app-with-my-life` — current enforcement must be inspectable, reversible, and accurately attributed to its owner.

## Friction we're addressing

The page labels two hard-coded personal modes as `Rules`, but it does not expose the basic grammar of a governed rule collection: a count, identity, trigger, targets, state, creation path, or removal path. The user must open rule-like cards to infer what exists. The current implementation reinforces the mismatch by allowing at most one `real_step` rule and one `focus` rule, with fixed IDs and replacement by kind.

The overview also fragments one Screen Time system by presentation type. Personal modes render as rule cards, Household activation renders under a misleading **Family** heading, and active Money policies collapse into one aggregate **Money app controls** row outside the Rules collection. This prevents the page from answering the basic question: **What Screen Time rules exist?**

## Lifecycle scope correction

The existing product already substantially covers awareness, first-time offer, Apple approval, and handoff to Settings. This exploration should preserve and refine that path only where necessary to land cleanly in rule management. The missing product step is the post-setup rule inventory and builder.

The Settings surface must distinguish:

- **Rule inventory:** every existing personal, Money, and Household Screen Time rule, with a truthful total count and owner/subject context.
- **Rule construction:** one canonical Settings-owned builder using condition types supplied by Kwilt capabilities.
- **Capability setup:** a Household member such as Charlie who can be configured but does not yet have a rule. This is not itself a rule and should appear in a clearly separate **Household** section.
- **Condition ownership:** Money, Focus, Activities, and Household remain authoritative for the facts that activate a rule even when the rule is visible and governed from Screen Time.

## System alignment

Constraint posture: `Bend the system`

Current system facts:

- Existing surface: **Settings > Screen Time**, with a personal management section and routed Family and Money summaries.
- Existing user flow: contextual entry points can start one shared first-time setup flow; the current flow combines authorization, app selection, and fixed-mode selection before rendering those modes as cards in Settings.
- Existing domain/data model: `personalRules` is an array, but `PersonalScreenTimeRuleKind` is limited to `real_step | focus`; creation uses one fixed ID per kind, and replacement removes any existing rule of the same kind.
- Existing technical affordances: each personal rule already has its own ID, selection ID, targets, enabled state, condition-specific fields, and last-updated timestamp. The shared control plane already projects named personal, Money, and Family agreements into enforcement.
- Existing UX/copy conventions: personal agreements can be edited here; Money and Family agreements route to their canonical owners; system permission and authoritative application state must remain distinct.

Constraints to preserve:

- Screen Time remains an overview and router across policy domains, not a universal Family/Money rule editor.
- Personal, Money, and Family rules share enforcement infrastructure but not authority or meaning.
- Overlapping restrictions retain AND semantics; disabling or deleting one rule does not clear another rule's restriction.
- Apple app/category tokens remain device-local and privacy preserving.
- Rules remain optional, reversible, calm, and non-shaming.

Constraints we may challenge:

- Exactly one personal rule per fixed kind.
- Fixed rule IDs and fixed rule titles.
- Contextual setup that toggles a hidden global mode instead of creating or resuming a visible agreement.
- A management surface that presents templates or modes as if they were rule instances.

Design implication:

Treat **Do a real step first** and **Protect Focus** as rule-builder condition choices, not the user's rule inventory. Contextual surfaces should explain why Screen Time might help and enter the same capability setup or canonical builder; they should not contain a separate miniature builder or silently create a rule. The Screen Time settings area makes the complete collection legible and owns rule construction and governance, while condition truth can still come from Focus, Activities, Money, or Household.

## Recommended product model

Use rules as the inspectable control-plane object, with one shared activation path and one canonical construction surface.

1. **Contextual awareness:** Focus, To-do, Plan, Money, or Household may show the same first-time Screen Time offer when the capability becomes relevant. Context supplies entry provenance and a truthful return target, not a different onboarding flow.
2. **Shared first setup:** one flow explains Screen Time, obtains Apple authorization, and establishes privacy and reversibility. It does not create a hidden global mode.
3. **Canonical rule construction:** after approval, Settings > Screen Time lands on the rule collection and its **Create first rule** path. The builder uses supported condition types rather than an open-ended automation grammar.
4. **Centralized governance:** Settings > Screen Time answers how many rules exist, which are enabled or applying, what each one does, and which capability supplies its condition.
5. **Capability-owned truth:** Screen Time owns rule identity, selected apps, enabled state, and lifecycle; Focus, Activities, Money, and Household remain authoritative for the condition data they expose.
6. **Safe overlap:** the overview explains overlapping active claims, while the control plane preserves AND enforcement and clears only the changed rule.

After authorization already exists, contextual affordances may deep-link to **Add rule** with a visible, editable condition suggestion. They do not commit the rule until the user reviews it in Settings. If a matching rule already exists, the affordance links to that rule rather than creating a duplicate.

## Visibility and authority model

Keep one Screen Time capability, one user-facing **Rules** vocabulary, one inventory pattern, and one builder system. Separate collections by who can see and govern them:

- **My rules** are private to the signed-in person and their personal device authorization. Another household adult does not inherit visibility into Focus, To-do, or private Money conditions.
- **Household rules** are shared with authorized owners/caregivers for the named child. Andrew and Blair see the same desired rule and delivery state; the child sees only the understandable agreement and current next action appropriate to them.
- **Money rules** remain personal unless Money itself later introduces an explicitly shared financial scope. Household membership alone never reveals them.

Triggered pauses and richer access agreements are rule shapes, not separate products or top-level destinations. The builder reveals the fields required by the chosen rule shape, while the inventory groups rules by scope. `Policy` may remain an internal control-plane term for versioning and enforcement, but it should not create a second customer-facing management area.

Illustrative Settings structure:

```text
Screen Time

MY RULES · 3
Do a real step first
Protect Focus
Review Shopping before access

HOUSEHOLD RULES · 2
Charlie · Games after responsibilities
Olive · Games on school days
```

Each authorized adult sees their own **My rules** plus the same shared **Household rules**. Counts stay scoped rather than implying that every viewer shares one universal rule inventory.

## Aspirational design challenge

How might we help Marcus discover Screen Time when it becomes relevant, complete one trustworthy setup, and then build and govern every rule in one calm settings surface, while preserving capability-owned condition truth rather than building another automation dashboard?

## Out of scope

- A universal automation language.
- Rebuilding the existing contextual-awareness and Apple-authorization lifecycle.
- Editing Family or Money conditions from the personal rule builder.
- Arbitrary compound boolean logic.
- Usage analytics, streaks, enforcement scores, or surveillance-oriented reporting.
- Claiming signed-device enforcement proof from source or Simulator evidence.

## Open question

Should the governance surface use the user-facing noun **Rules**, **Agreements**, or **Protections**, while retaining `ScreenTimeRule` as the underlying control-plane object?

## Anchor linkage

```yaml
serves: [jtbd-put-intention-before-impulse, jtbd-trust-this-app-with-my-life]
```
