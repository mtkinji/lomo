---
id: brief-household-activity-assignment
title: Household Activity Assignment
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-carry-intentions-into-action, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-household-foundation, brief-chores-as-recurring-activities, brief-family-screen-time-controls]
owner: andrew
last_updated: 2026-07-23
---

# Household Activity Assignment

## Context

Activities are currently personal, owner-synced objects. Family Screen Time and ordinary household coordination both need one Activity to be handed to another household member without exposing the creator's surrounding personal data.

## Target audience

`audience-aspirational-family-organizers` needs lightweight household handoffs, not project management.

## Representative persona

Maya captures an errand, pickup, or responsibility and needs another family member to know it is theirs without repeatedly reminding them.

## Aspirational design challenge

How might we let Maya hand one ordinary Activity to the right household member while keeping capture personal by default and sharing only what that person needs to act?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` is the demand spine because assignment exists to move a real commitment through another person.

## Job flow step

`job-flow-maya-move-family-life-forward` scores **Schedule or hand off** 2/5 and **Family participation** 2/5. Assignment directly improves both if it remains lightweight.

## JTBD framing

When a family commitment belongs with someone else, Maya wants to make that handoff explicit and trustworthy without exposing her private system or managing a task board.

## Design

### Product rule

> An Activity with no other assignee is private. Choosing another household member in **Assigned to** shares that Activity with them.

There is no separate scope selector in the UI. Assignment is progressively disclosed:

- Without a Household, the assignment field does not appear in To-dos. A contextual **Assign to someone...** action may start the add-first-person flow.
- Household membership makes assignment eligible but does not change Quick Add, list density, filters, or navigation by itself.
- Activity detail gains one compact **Assigned to · You** row directly below title/steps and before schedule/planning fields; tapping it opens **Assign to**. It appears only when Household assignment is eligible or the Activity is already shared.
- Assignee markers and **Assigned to me** appear only after assigned inventory exists.

Detailed surface contract: [UX Review: Household Assignment in To-dos](../design-explorations/family-screen-time/ux-review-household-assignments.md).

### Participation facts

- Creator/requester.
- Current assignee household member.
- Household relationship used to authorize the share.
- Completion policy and completion actor.
- Assignment, reassignment, unassignment, completion, and deletion events.

Assignment targets a household member ID, not only an authenticated user ID, so dependent profiles can participate.

### Visibility

The assignee receives the minimum actionable Activity projection: title, safe notes/steps, schedule, recurrence occurrence when applicable, and completion controls. Assignment does not reveal the creator's personal list or automatically grant access to a linked private Goal or Arc.

### User flows

- Create normally → remains private.
- If Household exists, open Activity detail → **Assigned to** → choose a household member → preview that only this Activity becomes visible → assign.
- If no Household exists, choose **Assign to someone...** from Activity detail → add or invite the first person → Kwilt creates the Household atomically → return to the Activity with that person selected for confirmation.
- On assignment, the Activity leaves the creator's personal To-dos with **Moved to Charlie · View · Undo** and enters the assignee's responsibility scope.
- Assignee sees **Assigned to me** inside canonical To-dos and may complete according to policy.
- Creator sees the Activity and its current state in **For others** or the authorized named-member view, such as **Charlie's responsibilities**.
- Reassign/unassign explains the effect on access and any dependent family rule.

Quick Add remains unchanged for the first release. Family-context creation may preselect the relevant member because the user already entered through a child/household surface.

### View scope

Default list membership follows responsibility, not authorship:

- Personal system and custom views implicitly scope to Activities for which the current person is responsible.
- Existing and new personal views do not silently include Activities assigned to other household members.
- Household/member scopes are explicit, authorization-aware sources that feed the normal filter/sort/grouping system; they are not removable ordinary filters.
- Once outbound assignments exist, the existing To-dos Views menu gains named family/member projections and **For others**.
- A caregiver's member view contains household Activities they are authorized to coordinate, not a future teen's unrelated private To-dos.

See the full [view ownership contract](../design-explorations/family-screen-time/ux-review-household-assignments.md#view-ownership-responsibility-not-authorship).

For adult-to-adult handoff, product language should be relational rather than managerial. Acceptance may be added if real use shows unsolicited assignments are socially harmful. The persistence model must retain enough state to add it without redefining assignment.

### Sync and conflict contract

- Authorized assigned Activities are synchronized to the assignee's devices separately from personal owner-only Activities.
- Mutations carry immutable operation/event IDs and actor member IDs.
- Completion is idempotent and can be accepted locally when policy permits.
- Concurrent completion converges harmlessly; concurrent edit/reassignment retains explicit resolution history.
- Removing an assignee revokes future access while preserving auditable event history.

## Success signal

A family uses one-off assignment for a real errand or handoff without Screen Time. Both creator and assignee can explain who can see the Activity, who is expected to do it, and what happens after completion or unassignment.

A solo user with no Household experiences no visible or behavioral change to To-dos. A user who creates a Household but never assigns an Activity receives no permanent people chrome or empty assigned-work navigation.

A caregiver who assigns five recurring daily Activities to a child sees none of today's five in their personal To-dos, can reach all five through the named child view, and observes completion/review state without turning their personal list into a monitoring queue.

Evidence sufficient to consider **Schedule or hand off** moving from 2/5 to 3/5 requires observed useful handoffs, not only schema delivery.

## Non-goals

- Recurring chores or rotations.
- Rewards, approval queues, or Screen Time consequences.
- Multi-assignee collaboration.
- Sharing a Goal/Arc through assignment.
- A household dashboard.

## Open questions

- Should adults accept assignments before they appear as commitments, or is immediate assignment acceptable inside a household?
- Which Activity fields are always safe for an assignee, and which require creator confirmation?
- Does unassignment return the Activity to the creator or offer delete/duplicate choices when the assignee added meaningful detail?
- After how many real assignments, if any, should Quick Add learn a compact person shortcut?
