# Frame: To-Do Dependencies

## What The User Said

> I want a design thinking loop to create dependencies between to-dos.
>
> We already have a version of this with linked to-dos, but we don't have a mechanism to add a linked to do outside of converting it from the list

## Restated In User Voice

When one to-do cannot really move until another thing happens, I want Kwilt to remember that relationship and show me the next doable thing, so that my list feels oriented instead of full of false choices.

## Target Audience

`audience-aspirational-family-organizers` - Aspirational family organizers need Kwilt to help ordinary family and personal to-dos feel organized without requiring a productivity methodology.

## Representative Persona

Maya is a mother helping her family use Kwilt because it has already proven useful in ordinary life. In this situation, she has captured related tasks across errands, appointments, follow-ups, and household responsibilities, but the relationship between those tasks is not visible unless one began life as a checklist step.

- Current situation: Maya can create to-dos and convert steps into linked to-dos, but she cannot attach an existing or newly captured to-do as a prerequisite later.
- What she's trying to become/do: feel naturally organized around the next possible action for herself and her family.
- Emotional state or tension: she wants relief from the pile, not a new project-management system.
- What would make this feel wrong to her: dependency charts, power-user terminology, hidden AI rewiring, or a flow that blocks quick capture.

## Hero Anchor

`jtbd-move-the-few-things-that-matter` - The feature matters only if dependencies help Maya make real progress on ordinary commitments that matter.

## Job Flow Step

`job-flow-maya-move-family-life-forward` identifies "See what matters, what can wait, and what is blocked" and "Know the next doable action" as underserved steps, both scored 2. Kwilt has Activities, Quick Add, views, scheduling, and linked steps, but it does not yet let the user create dependency relationships after capture or use those relationships as actionability signals.

## Active Anchors

- `jtbd-move-the-few-things-that-matter` - dependencies should improve the user's ability to move the few important things rather than track more work.
- `jtbd-carry-intentions-into-action` - prerequisites often represent fragile follow-through that needs to be carried across time.
- `jtbd-capture-and-find-meaning` - dependency creation must not make capture heavier; alignment should remain gentle and retroactive.
- `jtbd-trust-this-app-with-my-life` - relationships must be transparent, reversible, deletion-safe, and not silently created by AI.

## Friction We're Addressing

Linked to-dos currently exist as a step-conversion path: a checklist step can become its own Activity and redirect back from the parent step. The store also has a `relatedActivities` concept for delete/undo snapshots, so linked rows and child provenance can be restored safely. That is useful infrastructure, but it is not yet a user-authored related-Activity or dependency model. It helps preserve relationships that already exist; it does not help when Maya later realizes an existing to-do is a prerequisite, or when she wants to create the prerequisite without converting a step.

## Aspirational Design Challenge

How might we help Maya show that one to-do is waiting on another and see the next doable action, while preserving capture-first behavior and avoiding project-management setup work?

## Out Of Scope

Full project dependency graphs, multi-user assignment workflows, critical path scheduling, automatic AI mutation, and goal-level dependency modeling.

## Open Question

Should V1 turn the existing linked-step/related-undo substrate into a generalized Activity relationship model, or add the smallest manual dependency layer alongside it?
