## feature brief — Calendar Export (ICS) + Activity Scheduling Model (MVP)

### Purpose

Ship “Add to calendar” as an MVP feature without requiring Google/Microsoft OAuth by using a standard **`.ics` export** via share sheet. This is also the foundation for future true calendar sync.

### References

- Launch plan: `docs/launch/mvp-app-launch-jan-1-2026.md`
- Activity model: `src/domain/types.ts` (includes `scheduledAt?: string | null` and `scheduledDate?: string | null`)
- Activity detail UI: `src/features/activities/ActivityDetailScreen.tsx`
- The retired Today view no longer renders calendar data; active calendar presentation belongs to Plan.

---

## Problem (resolved by additive model)

Historically `Activity.scheduledDate` was used inconsistently:

- In some places it behaves like a “due date / end of day”.
- In Today it’s rendered like a scheduled time.

For calendar export, we need a consistent “start time” concept.

---

## MVP requirements (implemented)

### Data model (additive)

Add a new field:

- `Activity.scheduledAt?: string | null` — ISO timestamp representing the intended start time.

Keep existing `scheduledDate` for deadline/due semantics (or “anytime”).

### UX

In Activity detail:

- Add “Add to calendar” action (Pro-gated or freemium teaser per Monetization feature brief).
- User selects a date/time if missing (or use `scheduledAt`).
- Export an `.ics` file via share sheet.

### Output

- `.ics` includes:
  - Title: Activity title
  - Description: optionally include Goal title + a short note
  - Deep link back to the Activity's Focus sheet (`kwilt://activity/<activityId>?openFocus=1`)
  - DTSTART / DTEND computed from `scheduledAt` and `estimateMinutes` if present

### Focus handoff

Calendar export should bridge the user back to Kwilt, not start a Focus Session by itself. The calendar event description can say:

```text
Open in Kwilt to start a Focus Session:
kwilt://activity/<activityId>?openFocus=1
```

That link opens the to-do with the Focus sheet ready. It does not immediately activate Focus Protection or Screen Time restrictions. Protections activate only when the user starts the Focus Session from a Kwilt-owned surface, such as the Focus sheet, a Kwilt notification action, a widget, Shortcut, or App Intent that explicitly means "Start Focus."

---

## Future-proofing (post-launch)

- True provider sync:
  - Google Calendar (OAuth), Microsoft Graph, Apple CalDAV
- Bi-directional updates (calendar edits reflect back into Kwilt)
- Recurrence integration using `repeatRule` and/or RRULE

---

## Acceptance criteria

- Exported `.ics` imports into Apple Calendar successfully.
- No OAuth required for MVP.
- Scheduling data model avoids breaking migrations by using a new field.
