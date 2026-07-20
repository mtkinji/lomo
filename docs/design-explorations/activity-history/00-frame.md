# Frame: Activity History

## What the user said
> I think activities should have some form of history on them. My current use case is to track the number and duration of focus sessions, which could be useful in Chapters. I am also curious how this concept might interact with recurring to-dos.

## Restated in user voice
When I return to an Activity or look back on a season, I want Kwilt to remember the meaningful times I actually engaged the work, so that I can recognize real effort and patterns without maintaining a time tracker or reconstructing them from completed to-dos.

## Target audience
`audience-burned-out-productivity-power-users` - Burned-out productivity power users want trustworthy continuity between intention, action, and reflection without another system to maintain.

## Representative persona
Marcus: Marcus uses Activities to carry important work and Focus to engage it, but does not want a productivity dashboard or a manual work log.

- Current situation: Focus knows which Activity a session belongs to while it is running, but a completed session is not preserved as durable per-Activity evidence. Recurring Activities preserve completed occurrences under a stable series id.
- What they're trying to become/do: See honest evidence that meaningful work happened and let Chapters interpret that evidence later.
- Emotional state or tension: He wants his effort remembered, but does not want minutes and counts to become a score or another obligation.
- What would make this feel wrong to them: Manual time entry as the primary path, a KPI dashboard, streak pressure, planned calendar time presented as actual effort, or recurrence history flattened into one mutable task.

## Hero anchor
`jtbd-move-the-few-things-that-matter` - Help me make real progress in the few areas I most want to grow.

## Job flow step
`job-flow-marcus-move-the-few-things-that-matter`, steps 6-7:

- Step 6: Capture progress without maintaining the system. Current delivery score: 4.
- Step 7: Review whether the work is still worth doing. Current delivery score: 3.

Current product flow: an Activity can start a Focus session; timer expiry records global Focus completion state and may seed a Goal check-in; completed recurring occurrences remain as separate Activities linked by `repeatSeriesId`; Chapters aggregate completed Activities and `actualMinutes`.

Gap: Focus engagement is not stored as durable evidence attached to the Activity or recurrence occurrence, so Activity Detail cannot show it and Chapters cannot reliably use session count or duration.

## Active anchors
- `jtbd-capture-and-find-meaning` - Engagement should be remembered automatically from behavior the user already performs.
- `jtbd-make-sense-of-the-season` - Chapters need grounded counts and time as evidence, interpreted as a story rather than displayed as performance scoring.
- `jtbd-feel-arc-progress-without-tracking-tools` - The system should reveal movement without turning it into a tracking project.
- `jtbd-trust-this-app-with-my-life` - Planned time, actual engagement, completion, skips, and corrections must remain distinguishable and inspectable.

## Friction we're addressing
An Activity currently remembers its present state and, when recurring, its completed occurrence lineage. It does not remember the individual Focus sessions that contributed to the work. This makes a multi-session Activity look the same as a one-tap completion and deprives Chapters of useful, grounded evidence.

## System alignment
Constraint posture: `Extend the system`

Current system facts:
- Existing surface: Activity Detail already owns Focus, completion, repeat settings, notes, and attachments; Chapters already consume Activity metrics.
- Existing user flow: Activity -> optional planned schedule session -> user-started Focus -> optional Activity completion -> Chapter reflection.
- Existing domain/data model: `Activity` has `actualMinutes`, `startedAt`, and `completedAt`; recurrence creates one occurrence at a time and links the lineage with `repeatSeriesId`; the planned `ActivitySession` substrate already reserves later Focus and Chapter integration.
- Existing technical affordances: Focus lifecycle already emits activity id, goal id, session id, start, completion, and duration; Chapter generation already aggregates `actualMinutes` by Activity, Goal, and Arc.
- Existing UX/copy conventions: repeat surfaces stay terse; lifecycle explanation lives in compact secondary affordances; Chapters are retrospective and data-anchored without becoming dashboards.

Constraints to preserve:
- Activity remains the user-facing object; History is not a fifth top-level object or a new navigation destination.
- Focus starts only through user intent; planned calendar time is not evidence that work happened.
- Recurring Activities retain occurrence-level truth while allowing a quiet series-level lookback.
- History is captured automatically from meaningful actions and does not require Arc or Goal alignment.
- Counts and duration may ground reflection, but must not become streaks, scores, or judgment.

Constraints we may challenge:
- `actualMinutes` should no longer be the only durable representation of effort; it can become a derived total from immutable or correctable session evidence.
- A completed recurring occurrence can be viewed as one moment in the history of its repeat series, not only as an old independent Activity.
- The planned schedule-first session substrate may need an actual-engagement record before multi-session scheduling ships.

Design implication:
Treat Activity History as a quiet projection of durable evidence, not as a manually maintained audit log. Persist each meaningful engagement against the exact Activity occurrence, then aggregate by `repeatSeriesId`, Goal, Arc, or Chapter period when a broader reflection needs it. Keep planned sessions, Focus sessions, Activity completions, skips, and corrections semantically distinct.

## Aspirational design challenge
How might we help Marcus see and reuse honest evidence of engaging meaningful Activities, while preserving Activity-first simplicity and avoiding a productivity-tracking system?

## Out of scope
- A standalone history tab or analytics dashboard.
- Streaks, productivity scores, targets, or time quotas.
- Treating scheduled calendar blocks as completed effort.
- Automatically completing an Activity when a Focus timer ends.
- Reworking repeat cadence or notification behavior.

## Open question
Should the first history slice record only Focus timers that run to completion, or also preserve partial sessions when the user ends one early?
