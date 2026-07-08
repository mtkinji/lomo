# Diverge: Activity Session Substrate

## Axis Of Variation

How broad should the session primitive be at first: schedule-only, engagement-wide, evidence-only, or app-suite platform?

## Alternative A: Schedule-Only Substrate

Start with schedule sessions only. An Activity can own multiple planned calendar sessions, each with a managed calendar binding. Focus and Chapters remain unchanged except for future-compatible field names and source metadata. `scheduledAt` remains a derived compatibility field for the next active schedule session.

Audience/persona fit: Strong for Marcus' immediate pain. It fixes duplicate calendar trust and supports multi-session planning without broad conceptual overhead.

Design-challenge answer: Carries an Activity through planned time, but not yet actual engagement or reflection.

System-fit note: Smallest extension of current Activity Detail and Plan flows.

Best when: The team wants a low-risk TestFlight learning release.

Fails when: The app later needs to reconcile planned sessions with Focus history and must retrofit names/ids.

Primer anti-pattern check: Pass. Activity remains the planning object; no dashboard.

## Alternative B: Unified Activity Session Substrate

Define a single internal `ActivitySession` model with typed phases or sources: planned calendar session, focus engagement, manual effort evidence, and later reflection inclusion. V1 still only exposes schedule-session UI, but the model is designed so Focus can attach actual engagement to a planned session and Chapters can consume completed/attempted sessions later.

Audience/persona fit: Strong if kept quiet. Marcus gets better continuity without being asked to manage sessions.

Design-challenge answer: Best answer to the full strategy: durable Activity, planned attempt, actual engagement, retrospective evidence.

System-fit note: Requires careful domain design, adapters, and compatibility projections. More model work than schedule-only, but less future rework.

Best when: The goal is a durable app substrate, not only a scheduling patch.

Fails when: The abstraction becomes visible too early or forces Focus/Chapters migration before V1 scheduling proves itself.

Primer anti-pattern check: Pass if UI remains existing-surface-first. Risk if this becomes a top-level object.

## Alternative C: Engagement Evidence Ledger

Ignore planned sessions as the primary model. Instead, record every meaningful engagement event as evidence attached to Activities: Focus sessions, manual completions, calendar-derived attempts, notes, and receipts. Plan can still use calendar bindings, but the strategic primitive is retrospective evidence rather than planned sessions.

Audience/persona fit: Medium. It strengthens Chapters and meaning-making but under-serves the immediate scheduling trust problem.

Design-challenge answer: Strong for "what happened," weaker for "when will I work on this?"

System-fit note: More aligned with Chapters and capture, less aligned with Plan.

Best when: The product strategy prioritizes reflection over planning.

Fails when: Calendar duplicate prevention and multi-session scheduling are the active pain.

Primer anti-pattern check: Pass if evidence stays humble. Risk if it becomes analytics/time totals.

## Alternative D: Focus Session As The Canonical Session

Treat Focus Sessions as the canonical time-bound attempt. Scheduled calendar blocks are merely prompts or invitations to start Focus. The app does not introduce a separate session substrate; it routes all meaningful time-bound engagement through Focus.

Audience/persona fit: Medium. It keeps one visible session concept but over-privileges Focus for work that may be planned but not focus-timer-shaped.

Design-challenge answer: Good for execution; weak for planned attempts that do not become Focus.

System-fit note: Reuses existing Focus lifecycle heavily but would bend scheduled-to-do behavior around Focus.

Best when: Kwilt wants Focus to be the main execution mode for all planned work.

Fails when: The user schedules a call, errand, household block, or external work that should not start a Focus timer.

Primer anti-pattern check: Mixed. Passes by staying in existing Focus, but risks forcing a commitment mode.

## Alternative E: Cross-App Session Platform

Define a generic session platform intended for Kwilt mobile, Kwilt Desktop, Budget, and future apps. Sessions are typed attempts linked to app-specific objects. Mobile Activities, Budget reviews, Desktop work packets, and future family coordination all share one substrate.

Audience/persona fit: Weak for the immediate mobile user, strong for company/app-suite architecture.

Design-challenge answer: Over-scoped for this feature. It may be a future architecture direction, not a first build.

System-fit note: Requires cross-repo contracts, entitlement/product decisions, and shared backend migration strategy.

Best when: The suite strategy is mature enough to justify platform work.

Fails when: It delays the mobile learning release and forces premature abstraction.

Primer anti-pattern check: Risk. It may become enterprise-workspace architecture rather than Kwilt's calm life app.
