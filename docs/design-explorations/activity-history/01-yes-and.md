# Yes-And: Activity History

Original idea: Activities should quietly preserve the number and duration of Focus sessions so the user can understand their engagement and Chapters can reflect it later.

## Adjacencies

**Yes, and what if Activity History showed returns to the work, not only final completion?**

- Serves: `jtbd-capture-and-find-meaning`
- Job elevation: A long-lived Activity can reveal that the user came back to meaningful work several times even before it was marked done.
- New value: Focus sessions become honest evidence of engagement instead of disappearing when the timer ends.
- Cost delta vs. original: low
- Anti-pattern check: pass, if session counts and duration remain descriptive rather than scored.

**Yes, and what if recurring Activities could reveal a rhythm without creating a streak?**

- Serves: `jtbd-feel-arc-progress-without-tracking-tools`
- Job elevation: The user can recognize how a recurring practice actually lived across a season without being rewarded or punished for perfect cadence.
- New value: Occurrence-level evidence can roll up into calm observations such as "You returned to this on four mornings" while preserving completed, skipped, and partial occurrences.
- Cost delta vs. original: medium
- Anti-pattern check: pass only if missed occurrences stay neutral and there is no streak count, red warning, or decay framing.

**Yes, and what if Chapters could distinguish frequency, depth, and completion?**

- Serves: `jtbd-make-sense-of-the-season`
- Job elevation: Reflection can tell the difference between touching many Activities briefly, returning deeply to one Activity, and closing an Activity after sustained effort.
- New value: Chapters gain grounded evidence fields such as session count, active minutes, days engaged, and occurrence outcomes without pretending those measures explain the person's life by themselves.
- Cost delta vs. original: medium
- Anti-pattern check: pass, if numbers ground humble narrative rather than become a KPI block.

**Yes, and what if Goal and Arc movement could be revealed from the same evidence without extra logging?**

- Serves: `jtbd-feel-arc-progress-without-tracking-tools`
- Job elevation: The user can feel movement in important directions from actions they already took, rather than maintaining progress percentages.
- New value: Activity evidence can aggregate through confirmed Goal and Arc links and later support Force Actual observations.
- Cost delta vs. original: medium
- Anti-pattern check: pass, if aggregation never auto-anchors unlinked Activities or reduces Forces to one score.

**Yes, and what if partial Focus sessions were preserved as honest attempts?**

- Serves: `jtbd-capture-and-find-meaning`, `jtbd-trust-this-app-with-my-life`
- Job elevation: Ending early no longer erases real engagement or forces the user to let a timer run merely to receive credit.
- New value: History can distinguish `completed` from `ended early` while counting actual active time in both.
- Cost delta vs. original: low to medium
- Anti-pattern check: pass, if "ended early" is neutral event truth and not treated as failure.

**Yes, and what if the evidence were correctable without becoming an editable timesheet?**

- Serves: `jtbd-trust-this-app-with-my-life`
- Job elevation: The user can remove an accidental timer or correct an obviously wrong duration and trust Chapters not to repeat bad data.
- New value: A compact detail action can exclude, delete, or correct a session with visible provenance.
- Cost delta vs. original: medium
- Anti-pattern check: pass, if correction is a secondary recovery path rather than routine manual administration.

**Yes, and what if planned time and actual engagement could later be compared without judging drift?**

- Serves: `jtbd-carry-intentions-into-action`, `jtbd-make-sense-of-the-season`
- Job elevation: The user can understand whether a planned attempt became real engagement, moved elsewhere, or was wisely abandoned.
- New value: The existing schedule-session strategy and new Focus evidence can share lineage while keeping planned minutes distinct from active minutes.
- Cost delta vs. original: high; future integration
- Anti-pattern check: pass only if missed plans are observations, not adherence scores or failure badges.

**Yes, and what if completion, skipping, reopening, and Focus all appeared through one quiet chronology?**

- Serves: `jtbd-capture-and-find-meaning`, `jtbd-trust-this-app-with-my-life`
- Job elevation: The Activity can explain what happened without making the user inspect several unrelated fields or trust a mutable final state.
- New value: History becomes a projection of typed evidence events while the Activity itself stays the user-facing object.
- Cost delta vs. original: medium to high
- Anti-pattern check: pass, if V1 keeps the visible chronology selective and refuses to expose a noisy technical audit log.

## Job Elevation

The initial use case is Focus-session history. The elevated job is to let Kwilt remember meaningful evidence of engagement automatically and reuse it at the right scale: exact-session truth on an Activity, occurrence rhythm for recurring work, and humble interpretation in Chapters. The value is not comprehensive event logging. It is preserving enough trustworthy evidence that real effort does not disappear.

## Frame Recommendation

**Run design-thinking-loop with an expanded frame** - define the capability as **Activity evidence, surfaced as History**. Focus sessions should be the first evidence type and the first visible slice. Recurring outcomes, completion-state changes, planned-versus-actual lineage, and broader Goal/Arc aggregation should remain future-compatible rather than all shipping in V1.
