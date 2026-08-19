# Frame: Chore Recurrence Resolution

## What the user said

> The contract for how recurring chores works is a bit under developed. What happens if Charlie doesn't feed Scout one day? Do chores pile up? Do we need logic to allow some chores to pile up and others don't?

The child footer also needs a final product and hierarchy pass.

## Restated in user voice

When ordinary household work repeats and real life interrupts it, Maya wants Kwilt to show Charlie only the work that is still useful now, preserve an honest record of what was completed or missed, and explain the current family agreement without turning yesterday into a growing wall of debt.

## Target audience

`audience-aspirational-family-organizers` - families who want repeatable organization that children can adopt without a parent maintaining a productivity system.

## Representative persona

Maya is helping her family share ordinary responsibilities. Charlie is the child actor in this surface: he needs to know what still needs doing now, not reconcile recurrence mechanics.

- Current situation: a daily or weekly chore may pass without being completed.
- What they're trying to become/do: keep a dependable family rhythm with less reminding and negotiation.
- Emotional state or tension: Maya needs accountability without shame; Charlie needs a finite, current list.
- What would make this feel wrong to them: duplicate overdue copies, false credit, silently erased misses, or a footer that conflates chores, tokens, and Screen Time.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - routine work matters only when Kwilt helps the family act on what is useful now.

## Job flow step

`job-flow-maya-move-family-life-forward`, step 7: let family members participate without turning life into admin. Current delivery is 3/5; ordinary household responsibility remains early and the recurrence-resolution contract is incomplete.

## Active anchors

- `jtbd-carry-intentions-into-action` - recurring intent must become the right current occurrence without manual cleanup.
- `jtbd-invite-the-right-people-in` - the child participates through a bounded, comprehensible projection rather than caregiver administration.
- `jtbd-trust-this-app-with-my-life` - missed work, qualifying credit, tokens, and Screen Time inputs must remain separate and truthful.

## serves snippet

`serves: [jtbd-carry-intentions-into-action, jtbd-invite-the-right-people-in, jtbd-trust-this-app-with-my-life]`

## Friction we're addressing

The accepted copy says missed recurring copies do not pile up, but the local Chores adapter advances a recurring series only after trusted completion or caregiver approval. Time passing does not resolve an uncompleted occurrence, so a missed daily chore can remain stale and prevent the series from advancing.

The child footer then summarizes all visible occurrences as one agreement. In the captured completed state it says both **All chores done for this week** and **Needed for weekend Screen Time**, while the token balance competes as a third concept. The words do not make the benefit state or the next useful action clear.

## System alignment

Constraint posture: `Fit the system`

Current system facts:

- Existing surface: the Chores child projection contains **My chores**, **Choose a chore**, and an anchored agreement bar.
- Existing user flow: a child completes or submits one Activity-backed occurrence; caregiver approval may qualify it; the agreement projection counts qualifying completions.
- Existing domain/data model: Activities already distinguish calendar-scheduled recurrence from after-completion recurrence, use one active copy, and allow `skipped` as a closed occurrence. Chores currently lacks a child-facing missed/expired state and a time-driven reconciliation step.
- Existing technical affordances: `repeatBasis` already separates `scheduled` from `after_completion`; `getNextOccurrenceDate` skips historical scheduled copies rather than backfilling them.
- Existing UX/copy conventions: no overdue shame, no chore dashboard, no inferred expectation, tokens optional, Screen Time represented only as an input agreement rather than an enforcement claim.

Constraints to preserve:

- One canonical Activity occurrence and completion history.
- No duplicate chore stack by default.
- A miss never becomes a completion, token earning, streak event, or Screen Time credit.
- The child sees current work; history and exceptions remain secondary.
- The footer states only active, data-backed agreement clauses.

Constraints we may challenge:

- The current blanket phrase **Missed copies will not pile up** is directionally right but insufficient. A recurring chore also needs to say whether an unfinished need refreshes at the next window or remains open until someone does it.
- The completed agreement bar should not keep three equally weighted concepts alive when no action remains.

Design implication:

Do not add a generic “allow chores to pile up” switch. Reuse the existing recurrence basis to support two child-legible outcomes: **start fresh next time** for calendar-window work and **keep open until done** for persistent work. Preserve the missed or late occurrence in history, but keep at most one actionable child row per series. Treat true multi-occurrence debt as a later, evidence-driven exception rather than first-release behavior.

## Aspirational design challenge

How might we help Maya and Charlie recover cleanly when recurring household work is missed, while preserving honest history, a finite current list, and a calm statement of what matters now?

## Out of scope

- Sibling ranking, penalties, debt scores, or overdue urgency treatment.
- Automatic claims that Screen Time has been delivered to a device.
- Rotation, swaps, team chores, and generic exception workflows.
- Multiple simultaneous actionable copies of one chore series in the first release.

## Decision

Andrew chose to include **Keep open until done** in this release. It is a progressive caregiver choice shown only for repeating chores; **Start fresh next time** remains the default.
