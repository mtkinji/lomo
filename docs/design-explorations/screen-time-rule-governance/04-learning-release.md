# Learning Release: Screen Time Rule Governance

> Superseded by the delivery slices in
> `07-structured-rule-builder-contract.md`. This file records the earlier inline
> personal-builder slice; the grouped inventory requirements remain current.

## Concept To Build

Turn Settings > Screen Time into a grouped, countable rule library with scoped add actions and a constrained personal rule builder, while routing Household construction through the named child's existing authority-aware path.

## Capability Delta

Today, the user cannot:

- see a truthful personal rule count or Money rules in the same inventory;
- distinguish Household setup from an existing rule;
- create a supported personal rule from Settings.

After this release, the user can:

- scan **My rules · N** and **Household rules · N**;
- see one row per personal or Money rule with owner, condition, target count, and state;
- add a personal Focus or real-step rule through a constrained sentence builder;
- start Household rule creation from the Household group and continue with the chosen child.

Still intentionally not supported:

- a new server migration for generalized Household rules;
- arbitrary condition composition;
- editing Money thresholds outside Money;
- signed-device claims not observed on a signed physical device.

## User Experience

The authorized person opens Settings > Screen Time. A compact permission row is followed by **My rules** and **Household rules**, each with its own add action. Personal rows include Focus, meaningful-first, and individual Money category policies. Household rows name the child and show setup/application state without pretending a child activation is a rule.

**Add rule** under My rules inserts one sentence editor inside the collection while saved rules remain visible. The person selects **Pause apps while Focus is running** or **Pause apps until I take a real step**, chooses Apple apps/categories, reviews the sentence, and creates the rule. Saving collapses the draft into the inventory. **Add rule** under Household rules enters the existing Household/child setup path because shared authority and delivery remain child-owned.

## Existing Product Relationship

This replaces the current post-setup management composition. It preserves first-time setup, Apple authorization, native selection, Money policy evaluation, Household authority, and device-delivery contracts.

## Buildable Slice

Must be real:

- cross-domain My-rules projection;
- scoped counts and add actions;
- personal rule builder state, validation, persistence, and reconciliation;
- per-rule Money rows routing to their Money category;
- Household naming and truthful setup routing;
- automated tests for projections and personal rule mutation logic;
- rendered Simulator review of normal, empty, and builder states.

Can be thin or temporary:

- Household rows may use current activation state until all server agreements are cheaply projected into the overview;
- Household Add rule may route through the existing child setup/editor rather than share the exact personal builder component in this release.

Intentionally excluded:

- backend schema changes;
- arbitrary AND/OR;
- a second policy destination;
- usage analytics dashboard;
- cross-adult personal rule visibility.

## Release Channel

**Local build.** This is a substantial information-architecture and local-rule persistence change. Simulator visual acceptance and source gates come first; signed-device verification remains required for Apple picker, selection-specific enforcement, and overlapping native claims.

## Brand-Goodwill Guardrails

- No rule is created until the person reviews and commits it.
- Counts include only genuine rules, never setup destinations.
- Money and Household rows identify their owner and route truthfully.
- The builder uses ordinary sentences and no productivity gamification.

## Reversibility

The release reuses existing persisted rule and policy records. The new presentation projection and builder can be reverted without deleting rules. No server migration or irreversible conversion is included.

## Permanent Product Threshold

Promote after the grouped inventory is visually accepted, multiple local personal rules preserve independent native selections, Money routing is truthful, and Household presentation no longer confuses activation with an applied rule. Signed-device evidence is required before claiming enforcement behavior changed.
