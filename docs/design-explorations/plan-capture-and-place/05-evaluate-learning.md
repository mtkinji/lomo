# Evaluate Learning: plan-capture-and-place

## Learning Questions

- Does direct calendar-slot capture feel natural in Plan, or does it feel hidden?
- Does the user mostly create new Activities from slots, or place existing Activities?
- Does this reduce tab switching from Plan to Activities during daily planning?
- Do created blocks feel trustworthy because they are real calendar events?
- Does the feature create duplicate Activities that should have been existing placements?
- Does the user confuse scheduled calendar time with due dates or reminders?

## Evidence Plan

Supporting evidence:
- Andrew creates or places real dogfooding todos from Plan on multiple days.
- New blocks appear in the external calendar and can be moved/unscheduled from Plan.
- The flow is used without needing explanatory copy.
- The resulting Activities remain lightweight but meaningful enough to keep.

Disconfirming evidence:
- Andrew keeps returning to Activities/Quick Add instead.
- Calendar taps are accidental or confusing.
- The new flow creates duplicate todos because existing Activity selection is too weak.
- Calendar write failures or uncertain confirmations make the feature feel untrustworthy.
- Users interpret scheduled blocks as due dates.

Brand-goodwill evidence:
- No surprise calendar events.
- No forced Goal/Arc classification.
- Error states explain what happened and how to recover.

## Instrumentation

Useful events or logs:
- `plan_empty_slot_tapped`
- `plan_slot_moved`
- `plan_slot_resized`
- `plan_slot_new_activity_started`
- `plan_slot_existing_activity_started`
- `plan_slot_activity_committed`
- `plan_slot_commit_failed`
- `plan_slot_drawer_dismissed`

Qualitative notes:
- Why the user chose new vs existing.
- Whether the selected slot duration matched the real work.
- Whether the resulting Activity needed immediate editing.

Do not track:
- Full calendar event titles from external calendars.
- Sensitive Activity notes.
- Fine-grained passive calendar browsing.

## Decision Rule

Proceed to permanent implementation if Andrew uses the flow for at least five real scheduled Activities across several days, with no unresolved calendar trust failures and no recurring confusion between due date and scheduled time.

Revise if direct tapping is not discovered or existing Activity placement is the dominant need.

Retire or hide if calendar write uncertainty makes the surface feel unsafe or if it increases task duplication more than it reduces planning friction.

## Expected Next Action

Build the local learning release behind the existing Plan surface, verify with focused tests plus `npm run verify:changed -- --run`, then dogfood on-device with real calendar writes before TestFlight.

## 2026-07-13 dogfooding update

The long-press-and-drag learning release failed the discovery question: the gesture existed in the latest build, but Andrew was still unable to use Plan the way he expected. Outlook mobile and Google Calendar supplied the stronger interaction contract: a single tap creates a visible default block, handles make resizing explicit, the block body moves the selection, and a compact editor remains secondary to the calendar.

Decision: replace long press as the primary contract with tap-to-select and visible direct-manipulation affordances. Keep explicit calendar commit and the Activity-first drawer model unchanged.
