# Yes-And: To-do Schedule Sessions

Original idea: A to-do should not be scheduled again over the same moment by accident, but it may need multiple intentional work sessions in the same day or across days.

## Adjacencies

**Yes, and what if it could distinguish "move this session" from "add another session"?**

- Serves: `jtbd-carry-intentions-into-action`, `jtbd-trust-this-app-with-my-life`
- Job elevation: The user can edit an existing commitment without wondering whether Kwilt will create another calendar event.
- New value: Activity Detail can show different actions for a scheduled Activity: move current block, unschedule, or add another session.
- Cost delta vs. original: low
- Anti-pattern check: pass, if the copy stays plain and does not create planning jargon.

**Yes, and what if the first scheduled session became the "next session" rather than the only session?**

- Serves: `jtbd-move-the-few-things-that-matter`
- Job elevation: Work that needs multiple sittings can still be one Activity while Plan highlights the next honest time to engage it.
- New value: Existing surfaces can keep rendering one primary block while the Activity owns a small session history.
- Cost delta vs. original: medium
- Anti-pattern check: pass, if session history remains quiet and does not become a dashboard.

**Yes, and what if Plan could show repeated work on one Activity without making duplicate to-do cards?**

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: The user's lived work stays attached to one meaningful Activity instead of fragmenting into several near-identical tasks.
- New value: Multi-session tasks can appear as multiple calendar blocks but one Activity detail page.
- Cost delta vs. original: medium
- Anti-pattern check: pass, if Plan blocks are time-context UI and not a new task taxonomy.

**Yes, and what if duplicate calendar writes became impossible by construction?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: The user can retry after a shaky network/provider response without cleaning up a polluted calendar.
- New value: Calendar writes become idempotent by Activity + time window + provider event recovery, not just best-effort error handling.
- Cost delta vs. original: low to medium
- Anti-pattern check: pass. This is trust infrastructure, not a visible productivity feature.

**Yes, and what if "schedule again" became an intentional label only when the time is different?**

- Serves: `jtbd-carry-intentions-into-action`
- Job elevation: The user gets the repeated-session affordance only when it helps them continue the work, not when it duplicates the current block.
- New value: The schedule sheet can suppress or disable exact-overlap commits, while still offering nearby/other-day sessions.
- Cost delta vs. original: low
- Anti-pattern check: pass, if it avoids warning-heavy copy.

**Yes, and what if completing the Activity did not erase the value of past sessions?**

- Serves: `jtbd-capture-and-find-meaning`, `jtbd-make-sense-of-the-season`
- Job elevation: Multiple calendar sessions become evidence of actual work when Chapters or recaps look back.
- New value: Session history can later feed reflection without requiring the user to manually log each sitting.
- Cost delta vs. original: high if shipped now; low if designed as future-compatible data.
- Anti-pattern check: pass, if reflection remains humble and not time-tracking surveillance.

**Yes, and what if repeat rules stayed separate from multi-session work?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: "Work on this twice" does not accidentally become "repeat this forever."
- New value: Avoids conflating sessions, reminders, due dates, and recurrence.
- Cost delta vs. original: low
- Anti-pattern check: pass. This preserves calm semantics.

## Job Elevation

The original bug fix is about duplicate prevention. The larger product job is about making scheduled time blocks an honest extension of Activities: one Activity can require more than one sitting, but every sitting must be explicit, manageable, and non-duplicative.

## Frame Recommendation

**Run design-thinking-loop with the original frame** - the frame is already the right size. It is broader than a retry bug and narrower than a full recurrence redesign: "Activity schedule sessions" as an explicit managed-calendar extension.
