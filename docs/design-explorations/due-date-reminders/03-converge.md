# Converge: due-date-reminders

## Qualitative scoring

| Alternative | Persona fit | JTBD strength | System fit | Blast radius | Trust risk | Read |
| --- | --- | --- | --- | --- | --- | --- |
| Due Date Carries One Default Nudge | High | High | High | Medium | Medium | Best V1 |
| Reminder Relationship Inside Due Date | Medium-high | High | Medium | Medium | Low-medium | Good if explicitness matters more than flow |
| Smart Reminder Preference | Medium | Medium-high | Medium | High | High | Later |
| Prompt At Save | Medium | Medium | High | Low | Low | Too weak |
| Due-Date Digest | Medium | Medium | Medium | High | Medium | Different feature |

## Capability delta
Today, the user cannot:
- Set a due date and trust Kwilt to create a reasonable reminder from it.
- See due date and reminder as one follow-through promise.
- Avoid deciding between two separate trigger rows for the common case.

After this concept ships, the user can:
- Choose a due date and receive one default due-date nudge without manually configuring a separate reminder.
- Override the reminder timing when the default is wrong.
- Understand when a reminder was created from the due date.

Still intentionally not possible:
- Multiple reminders per due date.
- Silent learned notification timing.
- Starting Focus or Screen Time protection merely because a due-date reminder fires.
- Treating `scheduledAt` calendar blocks as due dates.

## Reductive design pass
- Smallest elegant version: one deterministic derived reminder when a due date is set and no explicit reminder exists.
- Enhance existing feature: yes, this enhances Activity detail / Quick Add due date behavior.
- Replace or collapse: visually collapse Reminder and Due date into a combined "Due" planning story where practical, while preserving manual reminder editing.
- Refuse to add: no global reminder rules screen, no reminder profiles, no urgency labels, no multiple pings, no AI preference learning in V1, and no required reminder relationship picker.
- Clutter risk: adding a relation selector every time would recreate the problem because it still makes the user design reminder behavior.
- One sharp job: make due dates trustworthy by carrying one calm nudge.

## Chosen direction
Ship **Due Date Carries One Default Nudge**.

Default policy:
- When a user sets `scheduledDate` and `reminderAt` is empty, set `reminderAt` to a calm default tied to that due date.
- For V1, start with 9 AM local time on the due date unless product QA shows evening-before is more natural.
- If the due date is today and 9 AM has passed, use the next calm near-term slot, such as 6 PM today, or skip the auto-nudge if the next slot is too soon.
- If the user already has a manual `reminderAt`, do not overwrite it.
- If the user clears the due date and the reminder was derived from that due date, offer to clear the reminder or clear it automatically only if provenance makes that safe.

## Accepted trade-offs
- A derived reminder may occasionally be unnecessary, but this is easier to correct than a missing follow-up.
- V1 may need a small provenance marker to distinguish automatic due-date reminders from manual reminders.
- The first default may be imperfect; learning should come from dogfooding and event evidence before adding adaptive preferences.

## Rejected trade-offs
- Do not make every due-date save ask an extra reminder question.
- Do not silently change existing manual reminders.
- Do not make notification permission a precondition for setting a due date.
- Do not add a dashboard or notification tuning center for this.
- Do not make the user choose reminder timing before a due date feels complete.

## Activation path
The user is most ready when setting or changing a due date. Teach this contextually inside the due-date sheet and summary row, not through onboarding.

Suggested copy:
- Due sheet confirmation: "Kwilt will remind you that morning."
- Summary row: "Due Jul 8 - reminder morning of."
- Manual override entry: "Change reminder."
- Notifications off state: "Due Jul 8 - reminders are off."

Helpful education means one line of expectation-setting at the due-date moment. Anything more will feel promotional.

## Stated bet
We're betting that most Kwilt users who set a due date want Kwilt to take responsibility for one calm reminder instead of asking them to act as the reminder engine. If that turns out not to be true, we'd revisit by making due-date reminders opt-in or relationship-based rather than default.

## Success signal
In dogfooding and TestFlight, users set due dates more often than manual reminders, leave the derived reminder in place for most dated to-dos, and describe the due-date flow as feeling like Kwilt carried the follow-through burden without creating surprise notification noise.
