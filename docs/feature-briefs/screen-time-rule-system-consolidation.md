---
id: brief-screen-time-rule-system-consolidation
title: Screen Time Rule System Consolidation
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-review-budget-reality-before-spending
serves: [jtbd-put-intention-before-impulse, jtbd-review-budget-reality-before-spending, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-screen-time-rule-governance, brief-screen-time-controls, brief-screen-time-controls-contextual-setup]
owner: andrew
last_updated: 2026-08-28
---

# Screen Time Rule System Consolidation

## Context

Kwilt currently presents one Screen Time inventory while retaining multiple rule systems behind it. New composite rules, older personal rules, and Money app-control policies have separate persistence, editors, lifecycle behavior, inventory projections, and reconciliation paths. Budget is already a supported condition in the sentence-based composite composer, so the separate Money rule lifecycle is now both unnecessary and inconsistent with the product direction established through the Screen Time redesign.

Andrew has explicitly waived preservation of every existing development Screen Time rule, including current composite, legacy personal, and Money rules. This release can therefore use a clean cutover instead of a migration platform, but it must clear native enforcement before deleting any record so discarded rules cannot leave apps invisibly blocked.

## Target audience

The primary audience is aspirational family organizers. A spending-aware pause should help Maya make an intentional choice without asking her to administer two products or understand which Kwilt capability owns a device restriction. Burned-out productivity power users are secondary: Marcus needs one inspectable rule model that reduces system upkeep rather than becoming a configurable automation hobby.

## Representative persona

Maya has selected apps that make spending easy and wants budget reality to provide a calm pause before opening them. She expects the rule to remain a Screen Time rule even when Money supplies its condition. It would feel wrong if the rule opened a different editor, exposed different lifecycle controls, or continued blocking an app after its visible record was removed.

## Aspirational design challenge

How might we help Maya understand and govern every app-access rule through one calm Screen Time system, while preserving Money's trustworthy financial truth, Apple's private selections, and explicit personal-versus-Household authority?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — Screen Time is valuable only when it helps a person carry an intentional choice into action without creating another system to maintain.

## Job flow step

This brief improves step 8 of `job-flow-maya-review-budget-reality-before-spending`: **Choose whether to continue, adjust the plan, or keep a spend-triggering app blocked.** The current delivery score is 3/5. The choice exists, but budget-backed rules are governed through a separate editor, storage model, and runtime, and signed-device enforcement remains unproven.

It secondarily improves Marcus's **Decide what to do next** step, also 3/5, by making intentional-access guardrails comprehensible and maintainable.

## JTBD framing

When a selected app is easy to open before the action or review that matters, the user wants one understandable rule that says what will happen and when, so the pause feels chosen, reversible, and trustworthy. A budget condition may use Money truth, but the user should never have to understand Money as a separate Screen Time owner.

## Design

### One rule system

Screen Time owns every rule's identity, selected apps, outcome, conditions, connector, lifecycle, native projection, explanation, and contextual return. Conditions are supplied through typed providers:

- Money supplies eligible budgets, predicate semantics, current truth, freshness, and a destination for inspecting financial evidence.
- Focus supplies current session truth.
- Activities supplies real-step completion truth without blocking capture or requiring Arc/Goal alignment.
- Device-local monitors supply time-of-day and daily-usage truth.

Providers never persist or enforce a parallel Screen Time policy.

### Canonical sentence composer

Every personal rule uses the sentence-based composer developed in the preceding Screen Time governance work. The editable grammar is:

> Allow access to / Pause access to [selected apps and categories]
>
> When [condition field] [operator] [value]

Additional conditions extend the same white condition well. The user chooses one explicit **AND** or **OR** connector only when two or more conditions exist. Interactive sentence parts use compact input-like picker fields. The composer contains no separate behavior page, duplicated result card, `Rule enabled` section, bottom danger zone, migration UI, or provider taxonomy.

Saved-rule lifecycle remains progressively disclosed:

- the **My rules** list owns the frequent enabled switch;
- tapping the row opens the same composer;
- swipe reveals Delete;
- the edit-page overflow contains Turn on/off and Delete;
- deletion is confirmed before native enforcement is removed.

### Contextual entry

Settings > Screen Time remains the canonical management surface. Money category detail, Focus, Activities, and Chat may open the same composer with known context preselected. Money entry selects the relevant budget condition and returns to the exact Money category; it does not open a Money rule editor. Apple's picker remains the only authority for selecting native apps and categories.

### Clean cutover

The first launch of the accepted learning build performs one versioned, idempotent cleanup:

1. Stop legacy personal and Money writers and reconcilers.
2. Enumerate canonical-development, legacy-personal, and Money rule/selection IDs that predate the consolidated system.
3. Clear every associated native ManagedSettings restriction and DeviceActivity usage monitor.
4. Persist cleanup progress so interruption can resume safely.
5. Delete all existing development Screen Time records only after their native cleanup succeeds or is durably marked for recovery.
6. Start the canonical rule collection empty.

Successful cleanup is silent. Failure appears as one calm recovery row in Screen Time Settings. It must never display schema, migration, provider, or storage terminology.

### Retirement

This phase removes rather than adapts the parallel implementations:

- Money app-control storage, policy ownership, editor, budget picker, evaluation loop, foreground reconciliation, inventory domain, and navigation routes;
- legacy personal rule storage, projection, and lifecycle paths;
- compatibility code that can create, edit, or reapply a retired rule;
- historical documentation claims that the Money category is the canonical policy editor.

Household may retain a distinct authority and persistence adapter during this phase, but it must share the aggregate grammar and sentence composer contract. A separate authority scope is not a separate rule system.

### Overlap and explanation

Rules remain unordered. An app stays paused while any applicable saved rule still requires it. Satisfying or temporarily opening one rule cannot imply that another rule was cleared. Inventory copy, Chat answers, shield explanation, and native enforcement derive from the same normalized aggregate.

### Conversational control

Chat list/get/deactivate/delete operations use canonical rule IDs. Creating or materially changing a rule remains a reviewed native handoff because Apple app selection is opaque and device-local. Chat may prefill ordinary-language intent but cannot silently select apps or activate enforcement.

## UI contract

Job: When a person wants a calm guardrail before an easy-to-open app, they need to create and govern one readable rule regardless of condition source, so they can trust what their phone will do.

Authority chain: this accepted brief and Screen Time governance -> Kwilt Settings primitives and tokens -> iOS Family Controls conventions -> the localized React Native primitive anatomy.

Three-second read: which apps are controlled, whether access is allowed or paused, and the condition that makes that true.

Primary action: Save/Add rule.

Primary information: outcome, selected apps/categories, conditions, and connector.

Secondary information: provider-specific source context when needed to understand or inspect truth.

Reveal later: lifecycle actions, app picker, condition values, evidence destination, recovery detail.

Scan order: behavior statement -> When conditions -> commit action.

Must not add: a second editor, behavior step, receipt card, management section, migration wizard, provider dashboard, rule names, nested Boolean groups, green emphasis, or explanatory subcopy that compensates for weak labels.

Reuse map: `SettingsPage`, Settings groups/rows, `RuleSentencePickerField`, native FamilyActivityPicker, standard drawers/radio rows, native time/duration controls, `DropdownMenu`, `KwiltSwitch`, `HapticPressable`, and atomic rule actions.

Required states: clean empty state, draft, invalid, saved, enabled, disabled, overlapping, temporarily open, deleted, cleanup in progress, cleanup recovery, permission revoked, source truth unavailable, VoiceOver, largest Dynamic Type, and signed-device enforcement.

Proof path: Settings > Screen Time and Money category detail on iPhone 17 Pro Simulator for composition; entitlement-enabled physical iPhone for cleanup, selection, enforcement, overlap, temporary open, and delete.

## Success signal

Andrew can enter from Settings and Money, create equivalent rules in the same composer, combine a budget with another condition, save, toggle, relaunch, understand why an app is paused, temporarily open it, and delete it without encountering a legacy surface or leaving an orphan restriction.

The phase is accepted only when install-over-current-build cleanup clears every pre-consolidation selection, all representative sentence/evaluator cases pass, no retired writer or runtime remains reachable, and signed-device evidence shows that the visible rule and native enforcement agree.

## Spec refinement

- The clean reset includes current composite development rules, older personal rules, and Money policies. No existing rule or app selection is preserved.
- Record deletion never precedes native restriction/monitor cleanup. Failed cleanup retains a recoverable identifier without retaining a usable legacy writer.
- Cleanup is versioned and idempotent; relaunch resumes rather than repeats destructively.
- The canonical personal schema may be renamed from `PersonalCompositeScreenTimeRule` only if the rename reduces ownership ambiguity without creating a parallel compatibility type.
- New and edited rules write only to the canonical store from the first implementation slice.
- Budget conditions store stable category source ID, display name, and Money-defined predicate. Current truth is resolved through a typed provider, not `MoneyAppControlSettings` policy state.
- Money category detail may inspect or correct budget evidence, but rule editing always opens the common composer.
- Static retirement checks prevent legacy storage keys, screens, routes, writers, and reconcilers from returning.
- Logic, cleanup, evaluation, persistence, and reconciliation are regression-first. UI composition may be implemented directly with focused interaction and accessibility tests.
- Simulator, signed-device, TestFlight, and production proof remain separate. This clean reset is authorized for current development data only; production-user reset or migration requires a separate decision.

## Open questions

- Which Household persistence adapter will first consume the canonical aggregate after personal and Money consolidation?
- Does the current shield extension have enough rule metadata to explain multi-condition budget rules without a native payload revision?
