---
id: brief-due-date-reminders
title: Due Date Reminders
status: draft
audiences: [audience-aspirational-family-organizers]
personas: [Maya]
hero_jtbd: jtbd-move-the-few-things-that-matter
job_flow: job-flow-maya-move-family-life-forward
serves: [jtbd-move-the-few-things-that-matter, jtbd-carry-intentions-into-action, jtbd-trust-this-app-with-my-life]
related_briefs: [todo-organization-triage, notifications-v1-5, calendar-export-ics, focus-protection]
owner: andrew
last_updated: 2026-07-06
---

# Due Date Reminders

## Context

Activity detail currently treats Reminder and Due date as separate trigger rows. That matches the data model, but it asks the user to maintain a reminder timestamp even when the real user thought is simpler: "this is due on this date; Kwilt should know when to nudge me." The deeper annoyance is not that reminders exist. It is that Kwilt makes the user act as the reminder engine after they have already expressed the commitment. The product opportunity is to let due dates carry one calm reminder by default while preserving manual reminder control for exceptions.

## Target audience

Aspirational family organizers need ordinary commitments to come back at the right time without learning a productivity system. Due dates are a natural way for Maya to express family follow-through; reminders should usually be support attached to that date, not a second planning chore.

## Representative persona

Maya has a family or personal to-do that cannot happen right now. She knows when it is due, but she does not want to decide whether "Reminder" needs separate setup every time.

## Aspirational design challenge

How might we help Maya set a due date and trust that Kwilt will carry the reminder burden for her, while preserving calm notifications, capture-first behavior, and explicit control over exceptions?

## Hero JTBD

`jtbd-move-the-few-things-that-matter` - The due date matters because it helps Maya move real commitments forward, not because Kwilt needs another scheduling field.

## Job flow step

`job-flow-maya-move-family-life-forward` scores "Schedule or hand off work when it cannot happen now" as 2. Kwilt has Activities, Quick Add, due dates, reminders, location, repeat, Plan, and notification settings, but the ordinary dated to-do flow still feels like separate setup rather than one trusted follow-through promise.

## JTBD framing

When I give a to-do a due date, I want Kwilt to carry the follow-through moment for me, so that I do not have to become the reminder engine just to trust that the thing will come back at the right time. This serves `jtbd-carry-intentions-into-action` directly and must satisfy `jtbd-trust-this-app-with-my-life` because automatic reminders are only helpful when they are calm, transparent, and reversible.

## Design

### Product behavior

When a user sets an Activity due date and the Activity does not already have a manual reminder, Kwilt creates one due-date-derived reminder.

Product principle:
- Due date is the user's commitment.
- Reminder is Kwilt's support behavior.
- Manual reminder editing is for exceptions, not the normal completion of a due-date flow.

Initial V1 policy:
- If due date is tomorrow or later, set the reminder to 9 AM local time on the due date.
- If due date is today and 9 AM has passed, set the reminder to a calm same-day fallback such as 6 PM, unless that is too soon to be useful.
- If the Activity already has `reminderAt`, do not overwrite it.
- If notifications are off, still save the due date and show that reminders are off.
- If the user edits the reminder manually, treat it as manual from that point forward.

### Data and provenance

Keep the existing semantic split:
- `scheduledDate` remains the due-date / anytime-today marker.
- `reminderAt` remains the exact notification timestamp.
- `scheduledAt` remains calendar-backed scheduled-time semantics.

The implementation needs a safe way to distinguish due-date-derived reminders from manual reminders. Prefer the smallest compatible metadata shape available in the Activity model. If no existing metadata can carry this safely, add a narrow provenance field rather than overloading `reminderAt` or `scheduledDate`.

Suggested provenance concept:

```ts
reminderSource?: 'manual' | 'due_date_default' | 'ai'
```

The exact field name can differ if the codebase already has a source/provenance pattern.

### Activity detail UX

The planning section should express the relationship:
- Default derived state: `Due Jul 8 - reminder morning of`
- Manual override: `Due Jul 8 - reminder Jul 7 at 6 PM`
- Reminder only: `Reminder Jul 8 at 9 AM`
- Due only because notifications are off or reminder cleared: `Due Jul 8 - reminders off`

The user can still open Reminder and choose a custom time. The manual reminder sheet remains the exception path, not the main path.

### Due-date sheet

The Due sheet can keep the existing choices: Today, Tomorrow, Next Week, Pick a date, Clear due date. Add one line of expectation-setting after save or inside the sheet:

```text
Kwilt will remind you that morning.
```

Keep this quiet. Do not add a multi-option reminder selector in V1 unless learning shows the default timing is the real problem.

The due-date flow should feel complete after the date is chosen. If the UI requires a reminder relationship choice every time, the design has likely preserved the annoyance in a new shape.

### Quick Add

Quick Add due-date selection should use the same derivation helper as Activity detail. Quick Add AI trigger enrichment already infers reminder and scheduled date together; this feature makes the ordinary due-date flow consistent with that expectation.

### Notification behavior

NotificationService should continue scheduling Activity reminders from `reminderAt`. This feature changes when `reminderAt` is populated, not the notification delivery path.

Guardrails:
- One notification per Activity reminder.
- No duplicate due-date reminder if a manual reminder exists.
- No Focus Session or Screen Time activation from a due-date reminder alone.
- Notification copy stays calm and action-oriented.

### Clearing and editing rules

If the user clears a due date:
- If the reminder was due-date-derived and still points at that due date, clear it or ask to clear it depending on implementation confidence.
- If the reminder is manual, preserve it.

If the user changes a due date:
- If the reminder was due-date-derived, move it with the new due date.
- If the reminder is manual, preserve it and show the resulting relationship plainly.

If the user clears a reminder:
- Keep the due date.
- Treat the Activity as due-only unless the user later sets a new due date and explicitly re-enables reminder behavior.

### Tests and verification

Required tests:
- Pure helper derives 9 AM local on future due dates.
- Pure helper handles today after the default time.
- Setting a due date creates a reminder only when no manual reminder exists.
- Manual reminder is preserved when due date changes.
- Due-date-derived reminder moves when due date changes.
- Clearing due date does not clear manual reminder.
- Notification scheduling still uses `reminderAt` and skips done/skipped/cancelled Activities.

Manual QA:
- Activity detail due-date path on iPhone simulator.
- Quick Add due-date path.
- Notifications-off state.
- Real device or TestFlight notification delivery for a dated to-do.

## Success signal

Users with dated to-dos feel that Kwilt will bring the commitment back without them setting a separate reminder. Behaviorally, most newly dated to-dos keep the derived reminder, manual reminder edits become exception cases, and notification opt-outs or surprise reports do not rise. Qualitatively, users should describe the due-date flow as complete rather than as reminder fiddling.

## Spec refinement

Assumptions Codex made:
- Maya is the primary lens; Marcus is a secondary maintenance-reduction guardrail.
- V1 should start deterministic rather than adaptive.
- The first default should be 9 AM local on the due date unless dogfooding contradicts it.
- Provenance is needed to safely preserve manual reminders.
- The strongest product signal is reducing reminder-engine burden, not exposing more reminder controls.

Implementation questions to settle before code:
- Is there an existing Activity metadata/provenance field we should reuse, or should we add `reminderSource`?
- Should clearing a derived reminder suppress future automatic derivation for that Activity?
- What exact "too soon" threshold should prevent same-day fallback reminders?
- Should notification-off copy link to settings or only state the condition?

Acceptance criteria:
- Setting a due date creates a derived reminder when safe.
- Manual reminders are never overwritten.
- The UI shows due date and reminder as one understandable relationship.
- Notifications-off users can still set due dates.
- Setting a due date does not require choosing reminder timing.
- `npm run verify:changed -- --run` passes, plus real notification QA before ship.

## Open questions

- Should evening-before be the default for some household tasks, or should V1 keep a single morning-of default?
- Should due-date-derived reminder behavior become a global preference after learning, or remain per-activity and quiet?
