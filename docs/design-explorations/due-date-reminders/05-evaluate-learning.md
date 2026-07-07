# Evaluate Learning: due-date-reminders

## Learning questions
- Do users expect a due date to carry one reminder by default?
- Is 9 AM local time on the due date a good enough first default?
- Do users understand the relationship between due date and reminder?
- Do users override or clear derived reminders often?
- Does automatic reminder creation increase trust or create notification surprise?
- Does this make the Activity detail planning section feel less like reminder fiddling?
- Do users feel Kwilt is carrying follow-through instead of handing reminder-system design back to them?

## Evidence that supports the bet
- Andrew dogfoods dated to-dos without needing to set manual reminders most of the time.
- TestFlight users leave derived reminders unchanged for most newly dated to-dos.
- Manual reminder creation shifts toward exceptional cases.
- Users set due dates without also opening Reminder.
- Qualitative feedback uses trust language: "I knew it would remind me," "that made sense," "less setup."
- Qualitative feedback says the due-date flow felt complete without reminder fiddling.

## Evidence that disconfirms the bet
- Users frequently clear reminders immediately after setting due dates.
- Users report surprise pings for dates they meant as passive labels.
- Users still open Reminder every time because the default is wrong.
- Notification settings opt-outs rise after the release.
- The planning section feels more confusing because "due" and "reminder" provenance is unclear.

## Brand-goodwill evidence
- No increase in notification annoyance reports.
- No new "Kwilt changed my reminder" confusion in dogfooding.
- Manual reminders remain stable when due dates change.
- Notifications-off users can still use due dates without friction.

## Instrumentation plan
Useful events or properties:
- `activity_due_date_set` with `source`, `had_existing_reminder`, `derived_reminder_created`, and `derived_reminder_offset`.
- `activity_reminder_changed` with `source`, `was_due_date_derived`, and `change_kind`.
- `activity_reminder_cleared` with `was_due_date_derived`.
- `activity_notification_scheduled` already exists; include derived provenance if practical.
- Dogfooding notes for surprise, delight, or annoyance.

Do not track:
- Notification body text content.
- Sensitive task titles beyond existing event policy.
- Location or household inference for this feature.

## Decision rule
Proceed to permanent behavior if, after at least two weeks of dogfooding and one TestFlight build, most dated to-dos keep the derived reminder and there is no meaningful surprise-notification signal.

Revise if users like the relationship but override timing often. The next revision would add a compact relationship choice inside the due-date sheet.

Retire or make opt-in if users treat due dates as passive labels and clear derived reminders frequently.

## Expected next action
Implement the TestFlight learning slice from the feature brief, then run simulator state QA plus a real-device/TestFlight notification check before calling it shipped.
