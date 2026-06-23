---
id: brief-todo-dependencies
title: To-Do Dependencies
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action, jtbd-capture-and-find-meaning, jtbd-trust-this-app-with-my-life]
related_briefs: [todo-organization-triage, todo-list-grouping-config, dynamic-next-best-action]
owner: andrew
last_updated: 2026-06-23
---

# To-Do Dependencies

## Context

Kwilt already has a narrow form of related Activities: from an Activity's checklist, a step can be converted into a standalone Activity. The original step remains in place as a linked redirect row, and completion mirrors the linked Activity. The store also preserves related Activity snapshots during delete/undo so parent rows and child provenance can be restored safely. That existing substrate is valuable, but it is not yet a user-authored dependency model: it works when the relationship starts as a converted step, not when the user later realizes an existing to-do is a prerequisite or wants to create a prerequisite without going through step conversion.

## Target Audience

Aspirational family organizers need Kwilt to help ordinary family and personal commitments stay oriented without requiring project-management habits. Dependencies matter for this audience when they make a crowded list more honest: some things are important, but not ready because another thing has to happen first.

## Representative Persona

Maya has captured real family and personal to-dos in Kwilt. Some items depend on calls, appointments, purchases, replies, or another family step. She does not want a dependency graph; she wants the app to remember "this is waiting on that" and help her find the next doable action.

## Aspirational Design Challenge

How might we help Maya show that one to-do is waiting on another and see the next doable action, while preserving capture-first behavior and avoiding project-management setup work?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` - The demand spine is helping the user make real progress in the few areas she most wants to grow. Dependencies serve that job only when they reduce false choices and clarify what can move now.

## Job Flow Step

`job-flow-maya-move-family-life-forward` scores "See what matters, what can wait, and what is blocked" and "Know the next doable action" as 2. Kwilt currently supports Activities, Quick Add, views, scheduling, step-converted linked to-dos, and related Activity preservation for undo. It does not yet let the user add dependency relationships after capture or use those relationships as actionability signals.

## JTBD Framing

When one Kwilt to-do cannot really move until another thing happens, I want the app to remember that relationship and show me the next doable thing, so that my list feels oriented instead of full of false choices.

## Design

### Product Shape

Add first-class directed dependencies between Activities:

- **Waiting on**: this Activity is not fully actionable until another Activity is done.
- **This unlocks**: completing this Activity makes one or more waiting Activities ready again.

The user-facing vocabulary should stay concrete. Use "Waiting on" and "This unlocks" in product copy. Avoid "dependency graph," "blocked by," "predecessor," "critical path," or power-user project-management language.

### V1 Behaviors

From Activity detail, the user can:

1. Attach an existing incomplete Activity as something this Activity is waiting on.
2. Create a new prerequisite Activity inline and attach it immediately.
3. Open the linked prerequisite.
4. Unlink the prerequisite without deleting either Activity.
5. See which Activities the current Activity unlocks.

The current linked-step and related-undo behavior should continue working. Converted steps can be represented as one dependency origin, but V1 should distinguish provenance so future UI can tell whether a relationship came from step conversion, manual attachment, inline prerequisite creation, or another existing relationship source.

### Actionability

Dependencies should feed the priority/actionability model from `brief-todo-organization-triage`:

- An Activity with incomplete prerequisites can be treated as waiting or not currently recommended.
- A prerequisite can receive a reason such as "Unlocks: Book appointment."
- Completing the final prerequisite can make the waiting Activity ready again.
- Smart order and Recommended should avoid presenting blocked work as the next best action unless the user explicitly opens it.

This should not replace scheduling. A to-do can be waiting on another to-do and still have a due date, reminder, recurrence, or planned time.

### Data Shape

Prefer a relationship model that coexists with existing step links and the current `relatedActivities` undo-snapshot behavior:

```ts
type ActivityDependency = {
  id: string;
  waitingActivityId: string;
  prerequisiteActivityId: string;
  source: 'manual_existing' | 'manual_new' | 'converted_step' | 'ai_proposed';
  parentStepId?: string | null;
  createdAt: string;
  createdBy: 'user' | 'system' | 'ai';
};
```

V1 can store this embedded or normalized depending on the existing persistence path, but the model should preserve these semantics:

- directed relationship;
- multiple prerequisites are possible, though the UI should keep V1 simple;
- cycles are disallowed;
- deleting an Activity detaches or removes affected dependency records without leaving broken rows;
- unlinking a dependency does not delete either Activity;
- completing a prerequisite never auto-completes the waiting Activity.

### UI Placement

On the waiting Activity:

- show a compact "Waiting on" section near steps or planning details;
- list each prerequisite as a tappable linked to-do row with completion state;
- include an add action for "Add waiting item" or similar calm copy;
- provide unlink in the row menu.

On the prerequisite Activity:

- show a compact "This unlocks" section only when there are dependent Activities;
- avoid noisy badges in the main list unless the dependency affects actionability.

In list surfaces:

- waiting Activities can appear in a Waiting view/section when priority state supports it;
- Recommended should favor ready prerequisites over blocked parents;
- reason copy should be inspectable, e.g. "Waiting on: Call the school."

### AI Behavior

AI should not silently create dependency records in V1. Later, Kwilt can propose dependencies from language like "after," "once," "waiting for," or from related task titles. Proposals must be explicit, dismissible, and reversible.

### Migration And Compatibility

Existing converted-step links should keep rendering as they do today. The current `relatedActivities` snapshot path should continue to restore linked parent/child state during undo. If a normalized dependency model is introduced, migration can be lazy: converted steps continue to be read from `step.linkedActivityId` and `activity.origin`, while new manual dependencies use the relationship model. A later cleanup can backfill `converted_step` relationship records if that simplifies querying.

## Success Signal

Qualitatively, Maya can say which to-do is waiting and what needs to happen first without configuring a view. Behaviorally, users attach existing to-dos as prerequisites, complete prerequisite Activities, and then act on the unblocked parent from Smart order or Activity detail without manually re-sorting the list.

## Open Questions

- Should dependency records live inside the waiting Activity, inside a store-level relationship collection, or in the eventual backend as a separate table?
- Should a waiting Activity automatically receive `priorityState: waiting`, or should dependencies only contribute an actionability reason until the priority model ships?
- What is the safest V1 cycle-prevention rule for nested converted steps and manual dependencies?
- Should the add action say "Waiting on," "Add prerequisite," or "Link to-do"?
- Should completing a prerequisite show an in-app nudge that another Activity is now ready, or only update ordering quietly?
