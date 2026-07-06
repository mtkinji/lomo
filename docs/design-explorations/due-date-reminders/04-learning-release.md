# Learning Release: due-date-reminders

## Concept To Build
When a user sets a due date on a to-do, Kwilt automatically carries one calm reminder for that date unless the user already chose a reminder.

## Capability Delta
Today, the user cannot:
- Set a due date and assume Kwilt will nudge them from that date.
- Tell whether a reminder is related to the due date or separately chosen.

After this release, the user can:
- Set a due date and see the reminder Kwilt will use.
- Keep the default, change it, or clear it.

Still intentionally not supported:
- Multiple due-date reminders.
- Learned default timing.
- Global due-date reminder preferences.
- Calendar-owned reminder sync.

## User Experience
The user encounters this in existing Activity detail and Quick Add due-date flows.

Happy path:
1. User opens a to-do and taps Due date.
2. User chooses Today, Tomorrow, Next Week, or a date.
3. Kwilt saves the due date and, if no manual reminder exists, sets one linked reminder.
4. The planning section summarizes the relationship: "Due Jul 8 - reminder morning of."
5. If the user wants a different nudge, they tap the reminder affordance and choose a time.

Notification-off path:
1. User can still set the due date.
2. The row names the date and states reminders are off.
3. The user can enable notifications from the existing notification settings path, but capture is never blocked.

## Existing Product Relationship
This enhances Activity due dates and reminders. It preserves:
- `scheduledDate` as due-date semantics.
- `reminderAt` as exact notification timestamp.
- `scheduledAt` as provider-backed scheduled-time semantics.
- Focus start consent and Focus Protection rules.
- Location and repeat triggers.

## Buildable Slice
Must be real:
- Pure helper for deriving a due-date reminder timestamp.
- Provenance or equivalent policy to avoid overwriting manual reminders.
- Activity detail due-date save updates `reminderAt` only when safe.
- Quick Add due-date save uses the same default.
- UI copy that makes the relationship visible.
- NotificationService continues scheduling from `reminderAt`.
- Tests for due-date reminder derivation, manual override preservation, today/past-time behavior, and clearing behavior.

Can be thin or temporary:
- The default timing can be a constant.
- The relationship display can start as copy in the existing planning section before a larger visual redesign.
- Analytics can start with existing activity create/update events plus a small source field if already available.

Intentionally excluded:
- User preference learning.
- Multiple reminders.
- Digest notifications.
- New settings screen.
- Any AI-driven mutation.

## Release Channel
`TestFlight build` after local simulator QA.

Rationale: notification behavior needs a real app bundle and OS notification path to produce truthful learning. Local simulator QA is enough for UI and state transitions, but not enough to trust notification delivery.

## Brand-Goodwill Guardrails
- One reminder maximum.
- Never overwrite a manual reminder.
- Never block due-date capture when notifications are off.
- Show the derived reminder relationship plainly.
- Keep notification copy calm and action-oriented.
- Keep Focus / Screen Time activation user-owned.
- Avoid making users choose reminder timing as a required part of setting a due date.

## Reversibility
The release can be rolled back by stopping automatic `reminderAt` derivation from due-date writes. Existing derived reminders should either keep firing as ordinary reminders or be cleared only if provenance safely identifies them as automatic. Avoid schema migration unless provenance cannot be represented with existing metadata.

## Permanent Product Threshold
Make this accepted product behavior when dogfooding and TestFlight show that due-date-created reminders are usually retained, surprise-notification complaints stay low, and users describe due-date setting as more trustworthy or less annoying.
