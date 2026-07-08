# Frame: Activity Session Substrate

## What the user said
> Nice - I like this. Run a full design-thinking-loop on it to produce a well considered build plan and feature brief.

Context being framed: "Activities are the durable intention; sessions are the time-bound attempts to live it out." This should fit the longer-term application strategy without turning Kwilt into a productivity system.

## Restated in user voice
When I use Kwilt to plan, do, and later understand my life, I want the app to preserve the difference between what I meant to do, when I tried to do it, when I actually engaged it, and what it meant afterward, so that the system helps me see real movement without asking me to maintain another calendar/task/history machine.

## Target audience
`audience-burned-out-productivity-power-users` - Burned-out productivity power users need less system upkeep and more trustworthy continuity between intention, action, and reflection.

## Representative persona
Marcus: Marcus has tried calendars, task apps, habits, AI chats, and custom systems. He wants Kwilt to make important work easier to carry without becoming another brittle planning layer.

- Current situation: Marcus can create Activities, schedule some onto calendars, start Focus, and later read Chapters. These surfaces are valuable but still loosely connected by ad hoc fields and flows.
- What they're trying to become/do: Keep meaningful commitments alive through planning, doing, and reflection without turning every attempt into a task-management artifact.
- Emotional state or tension: He wants the app to remember what actually happened, but he is allergic to time-tracking dashboards, productivity scoring, and hidden automation.
- What would make this feel wrong to them: A visible "session management" area, analytics-heavy productivity language, automatic interpretation that overclaims, or a new object he must maintain.

## Hero anchor
`jtbd-move-the-few-things-that-matter` - Help me make real progress in the few areas I most want to grow.

## Job flow step
`job-flow-marcus-move-the-few-things-that-matter`, steps 5-7:

- Step 5: Decide what to do next.
- Step 6: Capture progress without maintaining the system.
- Step 7: Review whether the work is still worth doing.

Current product flow: Activities hold concrete work, Plan places work into time, Focus helps the user engage a single Activity, and Chapters retrospectively make sense of what happened. The current job-flow scores are 3 for deciding the next action, 4 for capture progress, and 3 for reviewing worth.

Gap this work addresses: Kwilt has the right conceptual pieces, but not a shared substrate for "attempts." Calendar blocks, Focus Sessions, completed Activities, and Chapter evidence can drift into separate truths. A session substrate could make those surfaces cohere while staying quiet.

## Active anchors
- `jtbd-move-the-few-things-that-matter` - Sessions matter only if they help important work move through time into action.
- `jtbd-carry-intentions-into-action` - A session is the attempt layer between intention and real engagement.
- `jtbd-capture-and-find-meaning` - The app should remember attempts and actual work without making capture feel like admin.
- `jtbd-trust-this-app-with-my-life` - The substrate must be explicit, reversible, inspectable, and non-invasive.

## Friction we're addressing
The current scheduled-block model can answer "when is this Activity scheduled?" but not the larger strategic question: "what attempts did I make to live this Activity out?" Focus can answer "when did I work?" but it is not always planned. Chapters can tell a story, but they need trustworthy evidence. The system needs a small internal primitive that ties these together without becoming a visible product layer.

## System alignment
Constraint posture: `Extend the system`

Current system facts:
- Existing surface: Activity Detail, Plan, Focus, Today, and Chapters already touch the intention/action/reflection chain.
- Existing user flow: Activity -> optional scheduled calendar block -> optional Focus Session -> completion/evidence -> Chapter reflection.
- Existing domain/data model: `Activity` is the atomic doing object; `scheduledAt`/`calendarBinding` represent one managed calendar commitment; Focus has its own session runtime; Chapters are retrospective.
- Existing technical affordances: Provider calendar APIs, managed event bindings, Focus lifecycle store/service, Activity persistence, Chapter generation, analytics, and sync already exist.
- Existing UX/copy conventions: Plan reduces decision load; Focus starts only by user intent; Chapters are lookbacks; scheduled calendar blocks must not become due dates, reminders, or automation triggers.

Constraints to preserve:
- Activity remains the only forward-planning object at the day level.
- Chapters remain retrospective and never become planning containers.
- Focus and Screen Time protections activate only when the user starts Focus.
- No session dashboard, productivity scoring, streak pressure, or time-tracking posture.
- Capture cannot require Goal/Arc alignment or session classification.

Constraints we may challenge:
- The app can introduce an internal `ActivitySession` or `ActivityEngagementSession` primitive that is not a top-level user-facing object.
- Existing `scheduledAt` can become a compatibility projection rather than the durable source of truth.
- Focus Sessions and scheduled calendar sessions can eventually share an evidence relationship without becoming the same thing.

Design implication:
The long-term strategy should define a quiet substrate first and visible UI second. V1 should prove the substrate through schedule-session behavior, then later let Focus and Chapters consume it once the semantics are trusted.

## Aspirational design challenge
How might we help Marcus carry one meaningful Activity through planned time, actual engagement, and later reflection, while preserving Kwilt's four-object model and avoiding a visible productivity-session system?

## Out of scope
- Full time tracking.
- Session dashboards or reports.
- Automatic AI interpretation of every session.
- Cross-app data sharing beyond a strategy note.
- Replacing Focus Sessions, Chapters, recurrence, due dates, or reminders.
- Immediate implementation across all surfaces.

## Open question
Should the substrate start as schedule-session infrastructure only, or should the first build slice define a broader domain type that can later also represent Focus and reflection evidence?
