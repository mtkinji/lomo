# Diverge: due-date-reminders

## Axis of variation
Deterministic default vs. explicit relationship control vs. adaptive preference. All alternatives stay inside the Activity object and preserve capture-first behavior.

## Alternative 1: Due Date Carries One Default Nudge
When the user sets a due date, Kwilt automatically sets `reminderAt` using a deterministic default, such as 9 AM on the due date or the evening before for near-term dates. The Activity detail surface shows a combined planning summary: "Due Jul 8 - reminder morning of." The existing Reminder sheet remains available as "Change reminder," and clearing the due date offers to clear the linked reminder.

- Audience/persona fit: strong for Maya because it removes the extra setup step in ordinary family tasks.
- Design-challenge answer: the user sets the due date and Kwilt carries a calm follow-through moment.
- System-fit note: fits existing fields and notification service; requires relationship policy and UI copy, not a new model.
- Best when: most due-date tasks need one nudge.
- Fails when: users expect due dates to be purely informational and dislike automatic notifications.
- Primer anti-pattern check: pass. It respects Activities as the day-level planning unit and does not add dashboard or productivity pressure.

## Alternative 2: Reminder Relationship Inside Due Date
The due-date sheet becomes "Due and reminder." Users choose the date and a small relationship control: "Morning of," "Evening before," "Custom," or "Off." The row then displays both values, but the user has explicitly selected how the nudge relates to the date.

- Audience/persona fit: good for Maya when she wants trust but still wants visible choice.
- Design-challenge answer: follow-through is attached to the due date, but not silently assumed.
- System-fit note: fits existing sheets and fields, but adds a new user-facing control and relationship language.
- Best when: reminder trust requires explicit opt-in to the relationship.
- Fails when: the added choice still makes the user act as the reminder engine, just inside a different sheet.
- Primer anti-pattern check: pass if compact; failure if it becomes scheduling configuration.

## Alternative 3: Smart Reminder Preference
Kwilt starts with a default due-date nudge, observes manual overrides, and later offers to remember the user's pattern: "Use evening-before reminders for due dates?" This makes due-date reminders adaptive over time without making users configure a global setting up front.

- Audience/persona fit: medium for Maya, stronger for Marcus once he has repeated patterns.
- Design-challenge answer: the system becomes more helpful while keeping explicit consent for durable preference changes.
- System-fit note: requires preference storage, detection thresholds, and careful notification trust rules.
- Best when: users repeatedly correct the default and appreciate gentle adaptation.
- Fails when: Kwilt appears to infer too much from sparse behavior or changes notification timing without consent.
- Primer anti-pattern check: risky for silent automation; fix by deferring durable learning until after V1 evidence.

## Alternative 4: Due Date Does Not Schedule, But Prompts At Save
When the user sets a due date and no reminder exists, Kwilt shows a small inline invitation: "Add a reminder for the morning of?" The default remains no reminder unless accepted. This is maximally conservative around notifications.

- Audience/persona fit: mixed. It protects trust, but still asks Maya to manage the reminder decision every time.
- Design-challenge answer: partially answers the problem by connecting the concepts, but does not fulfill the user's expectation that due dates carry follow-through automatically.
- System-fit note: easiest to implement and lowest notification risk.
- Best when: notification permission or trust concerns dominate.
- Fails when: the extra prompt becomes the same annoyance in a prettier outfit.
- Primer anti-pattern check: pass, but lower job strength.

## Alternative 5: Due-Date Digest Instead Of Per-To-Do Reminders
Due dates never create per-task reminders. Instead, Kwilt sends one calm daily or evening digest of upcoming due items: "Three things are due tomorrow." Users open Kwilt to choose the next action.

- Audience/persona fit: useful for crowded family lists, but weaker for specific follow-up commitments.
- Design-challenge answer: reduces notification volume but does not solve the one-to-do trust moment.
- System-fit note: requires a new notification type and grouping policy.
- Best when: many due dates would create spam.
- Fails when: a single important to-do needs a concrete prompt.
- Primer anti-pattern check: pass only if the copy avoids dashboard/accountability tone.

## Divergence read
Alternative 1 is the smallest product correction that honors the user's stated expectation and removes reminder-engine burden. Alternative 2 is a safer-control version if trust concerns are paramount, but it risks preserving the core annoyance. Alternative 3 is a later adaptation layer. Alternative 4 is too timid for the pain. Alternative 5 is a different notification strategy and should not be V1.
