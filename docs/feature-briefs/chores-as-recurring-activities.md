---
id: brief-chores-as-recurring-activities
title: Chores as Recurring Assigned Activities
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-carry-intentions-into-action, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]
related_briefs: [brief-household-foundation, brief-household-activity-assignment, brief-family-screen-time-controls]
owner: andrew
last_updated: 2026-07-23
---

# Chores as Recurring Assigned Activities

## Context

Families repeat ordinary responsibilities and need today's work to be legible to a child. Kwilt should support that rhythm without creating a separate chore database or turning responsibilities into points and screen-time currency.

## Target audience

`audience-aspirational-family-organizers` wants repeatable family organization that children can actually adopt without ongoing administrative upkeep.

## Representative persona

Maya wants her child to know that feeding the dog is theirs today, complete it independently, and have tomorrow's responsibility remain intact.

## Aspirational design challenge

How might we make recurring assigned Activities clear and doable for Maya's family while keeping Activities canonical and avoiding a transactional chore economy?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` is the demand spine because routines matter only when today's responsibility becomes real follow-through.

## Job flow step

`job-flow-maya-move-family-life-forward` scores **Family participation** 2/5 and **Know the next doable action** 2/5. A child-friendly projection of today's assigned occurrences targets both gaps.

## JTBD framing

When a family responsibility repeats, Maya wants the right person to see and complete today's occurrence without recreating it or arguing about its state, so the household rhythm moves with less reminding.

## Design

### Domain stance

A chore is an assigned recurring Activity presented for household use. Activities remain the canonical object; dated occurrences remain the canonical completion unit.

The first release may use an Activity type/preset named `chore` if that improves presentation and defaults, but it must not create a second task or completion store.

### Recurrence and occurrence contract

- Stable recurring series.
- Dated occurrence identity.
- Assignment and review policy inherited from the series with explicit occurrence overrides.
- Completion of one occurrence never completes future occurrences.
- Reassign today versus this and future occurrences is explicit.
- Schedule/time-zone changes have deterministic occurrence behavior.

### Completion policy

- **Child can complete:** local completion immediately becomes canonical unless later invalidated by an explicit conflict rule.
- **Caregiver review:** child submits completion; the occurrence remains awaiting review until an authorized caregiver decides.

Review is a policy on the Activity/series, not a universal requirement. The learning release defaults to child completion without review.

### Surfaces

- Canonical To-dos continues to own Activity detail and completion.
- **Assigned to me** appears only after inbound assigned work exists and auto-hides when empty.
- Assigning a recurring Activity to a child removes its daily occurrences from the creator's personal views; the caregiver inspects them through the authorized child/member scope.
- The child sees only currently relevant dated occurrences, not future copies of the recurrence series.
- Do not add a global **Chores** capability for the first release. A restrained child-facing **Responsibilities** or **Chores** projection may show today's work only if testing demonstrates that the canonical role-aware To-dos/Today view is not understandable.
- Adult personal To-dos receives no chore chrome merely because a Household exists.
- No household KPI dashboard, scores, streaks, rankings, or overdue shame.

### Offline contract

- Preload a bounded future occurrence window.
- Allow authorized child completion locally.
- Reconcile through an idempotent outbox retaining actor and occurrence IDs.
- Preserve explainable state for duplicate, late, or out-of-order completion/review events.

## Success signal

A child can answer “What is mine today?” and complete a recurring responsibility during a fully offline day without caregiver help. A caregiver sees the same eventual truth after reconnection without recreating or correcting the chore.

Observed independent child participation is required before proposing a job-flow score increase.

## Non-goals

- Allowance, money, points, rewards, streaks, penalties, or rankings.
- Photo/AI proof.
- Rotations, multiple assignees, or chore marketplaces in the learning release.
- Automatic Screen Time consequences.
- A new Chore domain object.

## Open questions

- Is **Chores** a useful child-facing label/shortcut, or should every surface continue to say To-dos/responsibilities?
- Which recurrence horizon is sufficient for normal offline use without creating stale future state?
- Should a caregiver be able to undo a trusted child completion, and how should that affect a dependent access agreement?
