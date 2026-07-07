# Yes-And: due-date-reminders

Original idea: make reminders work as a function of due dates most of the time, so setting a due date automatically creates a useful follow-through nudge.

**Yes, and what if it could...** show "Due Jul 8, reminder morning of" as one combined planning row instead of two peer rows?

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: the user expresses the commitment once and sees the follow-through promise immediately.
- New value: reduces trigger-section maintenance without removing manual control.
- Cost delta vs. original: low
- Anti-pattern check: pass, as long as the copy stays calm and editable.

**Yes, and what if it could...** let users choose a simple per-activity reminder relationship such as "morning of," "evening before," or "off" from the due-date sheet?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: automatic reminders become transparent rather than mysterious.
- New value: handles household tasks that need preparation the day before without introducing multiple reminders.
- Cost delta vs. original: medium
- Anti-pattern check: pass if the default is one calm option and advanced choices stay tucked away.

**Yes, and what if it could...** remember the user's preferred due-date reminder timing after they override it a few times?

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: Kwilt adapts to the user's actual follow-through rhythm.
- New value: reduces repeated edits for users who consistently prefer evening-before or morning-of nudges.
- Cost delta vs. original: medium
- Anti-pattern check: risky if it silently changes behavior; fix by using an explicit preference prompt later, not in V1.

**Yes, and what if it could...** distinguish "due today" from "do now" so due-date reminders invite a next step but do not imply failure?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the reminder supports follow-through without shame or pressure.
- New value: strengthens Kwilt's notification trust contract.
- Cost delta vs. original: low
- Anti-pattern check: pass; avoid "overdue" urgency styling unless the user explicitly asks for urgency.

**Yes, and what if it could...** suppress duplicate nudges when a manual reminder, Focus session, or calendar-backed scheduled time already owns the moment?

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: the system feels coordinated rather than noisy.
- New value: prevents the "two pings for one to-do" failure mode.
- Cost delta vs. original: medium
- Anti-pattern check: pass; this is a reliability rule, not a new user-facing concept.

**Yes, and what if it could...** feed due-date reminder timing into Recommended / Smart order reason labels like "Due tomorrow" or "Nudge set for tomorrow morning"?

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: the date and nudge make the next-action surface more trustworthy.
- New value: connects reminder behavior to prioritization instead of hiding it in detail.
- Cost delta vs. original: medium
- Anti-pattern check: pass if labels stay sparse and do not turn every card into a status report.

**Yes, and what if it could...** make the notification action open the exact Activity with Focus ready when the task has enough shape?

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: the nudge reduces activation energy, not just memory load.
- New value: connects due-date reminder to doing.
- Cost delta vs. original: high
- Anti-pattern check: pass only if explicit Start Focus remains user-owned and Focus Protection consent is preserved.

## Frame recommendation
**Run design-thinking-loop with the original frame** - the original is well-scoped and reveals a strong product correction. The expanded frame should be noted for follow-ons, but V1 should stay focused on due dates carrying one default nudge.
