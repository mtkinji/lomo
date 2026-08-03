# Diverge: Private Day Bridge

## Fixed frame

Help Marcus turn one Kwilt Activity into protected time across a fragmented day, while keeping calendars separate, revealing only the minimum necessary information, and adding no system he has to maintain.

## Axis of variation

The alternatives vary by who initiates protection and where the product carries the complexity: each commitment, one-time calendar policy, Kwilt-only private awareness, or background calendar mirroring.

## Alternative A: Protect This Commitment

When Marcus places an Activity during working hours, the schedule confirmation includes one quiet line: `Writes to Kwilt · Protected on Work as Busy`. The configured default write calendar remains unchanged. If protection has not been configured yet, Marcus can use that line to choose one protection calendar; he does not choose where the detailed event goes. Kwilt creates the normal planned event and an anonymous work blocker as one managed relationship. The Activity shows a concise receipt afterward.

- Objects touched: Activity only; Plan remains the placement surface.
- Capture-first stance: capture is unchanged and never asks for calendar decisions.
- Persona fit: high; the behavior is concrete, reviewable, and attached to the moment of intent.
- Design-challenge answer: directly turns one intention into privately protected time without a new destination or settings project.
- System fit: high; extends the existing Plan proposal, binding, receipt, undo, and reconciliation paths.
- Best when: the user schedules Activities through Kwilt and wants confidence at the moment of commitment.
- Fails when: the user expects every pre-existing personal calendar event to be mirrored automatically.
- Anti-pattern check: pass; deterministic, user-authored, and calm.

## Alternative B: Protection In Settings

Marcus visits the existing Plan calendar settings and chooses one optional `Protect planned time on` calendar alongside the existing read calendars and default write calendar. Thereafter, every planned item that overlaps working availability receives an anonymous blocker on the protection calendar. Individual commits only report the result.

- Objects touched: Activity plus global Plan calendar preferences.
- Capture-first stance: capture remains open, but initial calendar setup is more consequential.
- Persona fit: medium-high; repeated behavior becomes effortless after setup.
- Design-challenge answer: adds one stable protection preference without changing the write-calendar contract.
- System fit: high; extends the current read-calendar/default-write preference model with one optional reference and updates calendar mutation paths.
- Best when: the user has stable calendar boundaries and schedules frequently.
- Fails when: protection setup feels abstract before the user has experienced the benefit, or an individual commitment needs an exception.
- Anti-pattern check: pass if activation is contextual; fail if presented as a dense integration control panel.

## Alternative C: One Private Day

Kwilt reads all selected calendars, displays their combined availability privately, and places Activities only on the chosen destination calendar. It never writes anonymous blockers elsewhere. The product optimizes for private comprehension and avoids cross-calendar mutation entirely.

- Objects touched: Activity and Plan calendar lens; no new external relationship.
- Capture-first stance: fully preserved.
- Persona fit: medium; it is exceptionally calm and private for the user.
- Design-challenge answer: solves the user's own double-booking risk but not coworkers booking apparently free work time.
- System fit: very high; most of the capability already exists.
- Best when: the user controls all booking decisions and only needs one private view.
- Fails when: another person or employer schedules against a calendar that cannot see the private conflict.
- Anti-pattern check: pass, but it does not satisfy the central protection outcome.

## Alternative D: Invisible Busy Mirror

Marcus chooses personal and work calendars, and Kwilt continuously mirrors every busy interval between them with stripped metadata. Existing events, new events, moves, cancellations, recurrences, and deletions all propagate in the background. Activities are only one source among many.

- Objects touched: external calendars broadly; Activity is no longer the organizing unit.
- Capture-first stance: unaffected, but the capability no longer depends on capture.
- Persona fit: superficially high because setup promises to make the problem disappear.
- Design-challenge answer: broad double-booking protection across all calendar activity.
- System fit: low; requires background sync, webhooks, loop prevention, recurrence semantics, pairwise direction rules, conflict policy, and extensive provider recovery.
- Best when: Kwilt intends to compete primarily as calendar-sync infrastructure.
- Fails when: employer policy blocks access, sync loops or duplicates occur, or users cannot understand why a blocker exists.
- Anti-pattern check: fail for this frame; it creates hidden automation, a rules surface, and a parallel product center of gravity.

## Comparative read

| Alternative | Outcome completeness | Calmness | System fit | Privacy legibility | Maintenance burden |
| --- | --- | --- | --- | --- | --- |
| A. Protect This Commitment | High for Kwilt Activities | High | High | High | Low |
| B. Protection In Settings | High for Kwilt Activities | High after setup | High | Medium-high | Low-medium |
| C. One Private Day | Partial | Very high | Very high | High | Very low |
| D. Invisible Busy Mirror | Broad | Low when anything fails | Low | Low | Very high |

## Divergence conclusion

Alternative A is the strongest activation interaction. Alternative B contains the correct durable preference model, but it should be configured contextually from A rather than required before first value. Alternative C remains the graceful fallback when the user does not authorize protection writes. Alternative D should remain explicitly out of scope.
