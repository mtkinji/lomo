# Diverge: Activity Evidence Surfaced As History

## Axis Of Variation

Where should Activity evidence become meaningful first: in Focus itself, across planned and actual sessions on Activity Detail, across a recurring series, only as a compact aggregate, or later inside Chapters?

## Planning Semantics Clarification

User feedback: capture a session whenever a to-do is added as a planned or scheduled item.

For this exploration, that means:

- Committing an Activity to a concrete time window in Plan creates a planned session.
- Scheduling that time onto a calendar adds a durable calendar binding to the planned session; it does not create a second session for the same window.
- Accepting a recommendation counts only when it commits a real time window. Merely showing or previewing a recommendation does not create history.
- An Activity whose lifecycle `status` is `planned` does not create a session by itself.
- A due date, reminder, or anytime-today date is not a session because it does not represent bounded time set aside for engagement.
- Moving, cancelling, or unscheduling a committed session preserves its history while updating its current state.
- Planned duration and actual Focus duration remain separate. Planned time is evidence of intention, not evidence that work happened.

## Alternative A: Focus Sessions Only

Persist a durable `FocusSessionRecord` whenever a Focus timer completes or is ended early. Activity Detail gains a compact Focus section showing a summary such as `3 sessions · 1h 25m` and a short expandable list of session dates and durations. No other Activity state changes become history events in V1, and recurring Activities simply display the Focus records attached to the selected occurrence.

Audience/persona fit: Strong for Marcus' immediate use case because it records work he already performs without asking him to maintain anything.

Design-challenge answer: Directly preserves evidence of meaningful engagement, but treats History as synonymous with Focus and leaves completion or recurrence outcomes outside the model.

System-fit note: Smallest extension. It reuses the existing Focus lifecycle and Activity Detail, adds one durable record type, and lets `actualMinutes` become a derived sum. It touches Activity and later Chapter inputs without changing the four-object model.

Capture-first stance: Pass. Starting or ending Focus works exactly as today; persistence is automatic and never requires Goal or Arc selection.

Best when: The priority is a fast, understandable learning release with low model risk.

Fails when: The product soon needs one chronology containing completion, skip, reopen, manual evidence, or planned-versus-actual relationships and must migrate a Focus-specific record into a broader model.

Primer anti-pattern check: Pass. No dashboard, streak, score, forced alignment, public sharing, or AI interpretation is introduced.

## Alternative B: Planned And Actual Session Timeline

Introduce a durable internal `ActivitySession` whenever an Activity is committed to a concrete Plan window or scheduled calendar block. A session holds planned time and optional calendar binding; Focus engagement attaches actual evidence to that session when launched from it. Starting Focus without a matching plan creates an actual-only session. A typed evidence ledger preserves meaningful changes such as session planned, moved, cancelled, Focus completed, or Focus ended early, while Activity Detail collapses those events into one readable session row instead of showing raw audit noise. Chapters query planned and actual measures separately, and recurring series aggregate occurrence-owned sessions through `repeatSeriesId`.

Audience/persona fit: Strong if the ledger remains invisible as infrastructure. Marcus gets trustworthy detail and future continuity without learning or managing another object.

Design-challenge answer: Best fit for the expanded frame because it preserves the full intention-to-engagement path while keeping planned time distinct from actual work.

System-fit note: Extends the existing schedule-session strategy instead of inventing a parallel history model. Activity stays the user-facing doing object; a session is the bounded attempt; evidence events preserve what changed; History is a projection; Chapter stays retrospective. It requires stable session identity, duplicate prevention, optional calendar binding, Focus linkage, sync, correction, and aggregation rules.

Capture-first stance: Pass. Evidence is emitted after behavior the user already chose. Unanchored Activities remain fully supported.

Best when: The team wants Plan, calendar scheduling, Focus, recurrence, and Chapters to share one truthful seam without exposing sessions as a fifth top-level object.

Fails when: Planned-session infrastructure, Focus evidence, and visible history are all attempted at once without a staged release, or when raw move/cancel events leak into a noisy user-facing log.

Primer anti-pattern check: Pass with guardrails. Only meaningful evidence types may surface; the UI must refuse raw audit-log noise, scoring, auto-anchoring, and identity percentages.

## Alternative C: Recurring Rhythm

Make recurring Activities the primary history surface. Each current occurrence includes its own Focus evidence, completion, or skip outcome, and Activity Detail offers a calm series lookback such as recent dates with duration and outcome. Non-recurring Activities receive only a minimal Focus summary. Chapters derive patterns primarily from repeat-series rhythm: how often the user returned, where sessions clustered, and when cadence naturally changed.

Audience/persona fit: Strong for repeated practices and routines; weaker for one-off, multi-session Activities such as a project deliverable.

Design-challenge answer: Gives the clearest answer to the recurrence question and avoids streak language, but makes the broader Activity-history value depend too heavily on repeat rules.

System-fit note: Reuses today's occurrence lineage through `repeatSeriesId` and keeps missed copies from piling up. The smallest extension is a series-history selector plus Focus evidence per occurrence. It touches Activity only; Chapters consume a derived series projection.

Capture-first stance: Pass. Evidence remains automatic, though the richest value appears only after the user configures recurrence.

Best when: Dogfooding shows recurring Focus practices are the dominant use case.

Fails when: Most meaningful Focus engagement happens on long-lived non-recurring Activities or the series view begins to feel like a habit tracker.

Primer anti-pattern check: Conditional pass. It must use neutral rhythm language, never streaks, adherence percentages, missed-day warnings, or identity scoring.

## Alternative D: Summary Without Timeline

Persist individual Focus sessions internally, but expose only derived fields on Activity Detail: total active time, session count, and most recent engagement. There is no visible list of sessions in V1. Chapters can use the records, while a secondary correction action allows the user to clear or adjust the aggregate if it is wrong.

Audience/persona fit: Strong for low-clutter users who only need reassurance that effort was remembered.

Design-challenge answer: Delivers the essential signal with the least UI, but hides the evidence needed to understand or correct how a total was formed.

System-fit note: Small visible change and moderate infrastructure change. Activity owns a projection; Chapters consume the records. The four-object model stays intact.

Capture-first stance: Pass. All capture is automatic.

Best when: The summary itself creates enough value and detailed history would rarely be opened.

Fails when: Trust requires inspecting individual sessions, partial sessions create confusing totals, or recurring occurrences need a readable chronology.

Primer anti-pattern check: Pass if the summary is quiet and secondary. Risk if counts and minutes become prominent productivity metrics or sort/ranking controls.

## Alternative E: Chapter-First Invisible Evidence

Persist Focus evidence but add no Activity History UI at first. Chapter generation receives session count, active minutes, days engaged, and recurrence occurrence outcomes, then uses them only as grounded inputs for retrospective narrative. The user encounters the capability when a Chapter says something like, "You returned to this work across three different days," with the Activity link providing provenance.

Audience/persona fit: Strong for users who value meaning over logs and weak for Marcus' need to inspect whether Kwilt remembered his work accurately.

Design-challenge answer: Best expression of evidence as reflection rather than tracking, but defers the user's stated Activity-level history need.

System-fit note: Enhances Chapter inputs and adds durable Focus evidence without changing Activity Detail. Activity remains the source object and Chapter remains retrospective. It introduces more AI interpretation risk than the other alternatives.

Capture-first stance: Pass. No new input or classification is required.

Best when: Chapters are already the primary dogfooded reflection surface and Activity Detail history would distract from the core value.

Fails when: Chapter phrasing exposes incorrect or surprising totals that the user cannot inspect, correct, or understand at the source.

Primer anti-pattern check: Conditional pass. Chapter language must be humble, data-anchored, and retrospective; no anthropomorphic voice, overconfident inference, future prescription, or productivity celebration.

## Divergence Summary

- **Focus Sessions Only** optimizes for immediate simplicity.
- **Planned And Actual Session Timeline** optimizes for continuity from committed time through real engagement and reflection.
- **Recurring Rhythm** optimizes for repeated practices and occurrence lineage.
- **Summary Without Timeline** optimizes for reductive Activity Detail UI.
- **Chapter-First Invisible Evidence** optimizes for reflection rather than inspection.

All five preserve Activity as the user-facing unit of doing. None adds a fifth top-level object, requires alignment during capture, or treats planned time as proof of engagement.
