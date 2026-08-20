---
id: brief-food-capability-onboarding
title: Make Meals Easier Capability Onboarding
status: accepted
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-feed-household-with-less-work
serves: [jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action, jtbd-capture-and-find-meaning, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-capability-routed-onboarding, brief-household-food-loop, brief-progressive-meal-commitment]
exploration: docs/design-explorations/food-capability-onboarding
owner: andrew
last_updated: 2026-08-19
---

# Make Meals Easier Capability Onboarding

## Context

The primary Food promise is not Recipe storage or meal planning in isolation. Kwilt can reduce work
from deciding what to make through ingredient compilation and cooking, but a clean-account person
currently encounters separate Recipes, Meal Planning, and Groceries surfaces with no shared
first-time path. The global capability-routed onboarding program needs one honest Food door whose
visible continuations are each polished enough to fulfill that broader promise.

## Target audience

`audience-aspirational-family-organizers` wants to feed a household with less repeated decision,
coordination, list-making, and phone juggling. The experience must remain complete for one person
and allow household participation to become useful later.

## Representative persona

Maya chooses **Make meals easier** because the next meal cycle is creating work. She should see how
Kwilt connects choosing meals, deciding together, building the ingredient list, and cooking, then
begin with a real meal without choosing among product capabilities or establishing a Household.

## Aspirational design challenge

How might we show Maya the complete meal loop in a lightweight, fun, simple way, then help her begin
with a real meal while Recipes, Meal Planning, and Groceries retain truthful ownership and optional
household participation never becomes required setup?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` — the onboarding must move an actual meal cycle forward, not
merely explain Food features or open a library.

## Job flow step

`job-flow-maya-feed-household-with-less-work` spans preserving food knowledge, choosing realistic
meals, gathering household input, compiling one correct list, and cooking without juggling the
phone. This brief improves the clean-account entry and handoffs across those steps. It does not
replace the owning capabilities' delivery and proof obligations.

## JTBD framing

When meal work is pressing, show me how choosing, deciding together, gathering ingredients, and
cooking stay connected. Then help me start with meals that sound good and carry that decision
forward without rebuilding the work.

## Design

### Promise and structure

The global chooser offers **Make meals easier**. Household Food then presents two lightweight,
animated illustrated moments:

1. pick Kwilt meals or add your own, with optional Household ideas and voting; and
2. carry chosen meals through a shared ingredient list and calm, resumable cooking.

The sequence ends with **Browse recipes** and opens the existing Recipe library with a contextual
coachmark on a real Recipe card. Onboarding must not introduce a duplicate picker or any other UI
that the native capability already owns. Exact Recipe, Plan, Grocery, and Cook
context bypasses the generic Food walkthrough when it can be honored safely.

The full screen, branch teaching, bypass, recovery, copy hierarchy, and first-value boundaries are
defined in
[`03-converge.md`](../design-explorations/food-capability-onboarding/03-converge.md).

### Ownership

Household Food coordinates onboarding state, walkthrough routing, and resumption only. It does not own
Food domain mutations.

- Meal Planning owns a durable `Next meals` result.
- Groceries owns compiled ingredient and list truth.
- Recipes owns Recipe identity and resumable Cook Mode.
- Each terminal capability emits authoritative first value.

### Release rule

**Make meals easier is committed scope for the new first-install branch.** Current domain gaps are
work to resolve, not reasons to omit the path from the target chooser. Production promotion remains
atomic: every claim in the walkthrough must be credible and polished before the new first-install
experience ships.

### Current readiness

The source-backed audit is
[`04-readiness-audit.md`](../design-explorations/food-capability-onboarding/04-readiness-audit.md).

| Meal-loop stage | Current assessment | Primary blocker |
| --- | --- | --- |
| Choose or add meals | Existing Recipe library handoff and contextual guide implemented in development rehearsal | Rendered hierarchy and applied-backend proof remain |
| Share and vote | Explicit personal-to-Household attachment implemented | Live multi-account authority and experiential proof remain |
| Build and share ingredients | Personal and Household compiler authority implemented | Applied migration, list rehearsal, and participant proof remain |
| Cook with less juggling | Walkthrough and one-time touch/resume guide implemented | Signed-device interruption, orientation, timer, and keep-awake proof remain |

### Learning release

The development rehearsal now includes the connected walkthrough and individual-first native
handoff. Keep it development-only while migration execution, rendered acceptance, real Household
participation, and signed-device Cook proof are completed. Promote Food and the global entry policy
atomically rather than exposing a partial production chooser.

## Success signal

A clean-account tester selects **Make meals easier**, understands that Kwilt connects choosing,
deciding together, ingredients, and cooking, then keeps at least one real meal in a durable Plan.
Plan works without Household setup; an existing Household can participate through bounded sharing
and voting; selected Recipes produce a shared list with provenance; and Cook restores the correct
cue without replaying generic onboarding.

The path is not promotion-ready until the complete rendered flow passes normal and large text,
VoiceOver, Reduce Motion, relaunch, native destination, and required lifecycle proof, followed by
Andrew's visual and experiential acceptance.

## Resolved decisions and remaining validation

- `organizer_person_id` is durable ownership; Household and organizer-membership IDs are optional,
  explicit collaboration attachment.
- Food first value remains a live-confirmed Meal Plan receipt, not walkthrough or library-entry completion.
- Existing assets do not cover the two illustration jobs; composed icons are development
  placeholders pending visual acceptance and any justified illustration brief.
- The coordinator stores only path/checkpoint/completion receipts and does not duplicate Food data.
