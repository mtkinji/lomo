# Learning Release: Activity Session Substrate

## Concept To Build

Build a quiet internal Activity-session substrate by shipping scheduled sessions first: one Activity can own multiple planned calendar attempts while existing screens keep working through a next-session projection.

## Capability Delta

Today, the user cannot:
- Schedule one Activity into multiple managed planned attempts.
- Trust that retrying a calendar action will not create duplicate events.
- Preserve a clean path from planned time to future Focus/Chapter evidence.

After this release, the user can:
- Schedule an Activity into more than one planned calendar session.
- Move or unschedule one session without changing the others.
- See existing scheduled surfaces continue to behave normally.
- Benefit from duplicate prevention without learning a new object.

Still intentionally not supported:
- Focus sessions attaching to scheduled sessions.
- Chapter generation using session evidence.
- Cross-app shared sessions.
- Time totals, dashboards, or session history management.
- AI-generated session plans.

## User Experience

The user encounters the release only through existing scheduling surfaces.

Activity Detail:
- Schedule works as before for the first session.
- Once scheduled, the Activity can show/add another planned session.
- Exact duplicates are prevented with calm copy.

Plan:
- Each scheduled session appears as a block.
- Multiple blocks can link to the same Activity.
- Move/unschedule operates on the selected block.

No new top-level navigation, tab, dashboard, or settings surface is introduced.

## Existing Product Relationship

Enhances:
- Activity Detail scheduling.
- Plan calendar rendering and managed-event actions.
- Calendar duplicate prevention and recovery.

Leaves unchanged:
- Focus lifecycle and protections.
- Chapters generation.
- Due dates and reminders.
- Recurrence rules.
- Quick Add capture.

## Buildable Slice

Must be real:
- Internal `ActivitySession` or equivalent domain contract.
- Scheduled-session helpers with tests.
- Compatibility projection to `scheduledAt` and calendar binding fields.
- Activity Detail create/add/move duplicate-prevention behavior.
- Plan rendering/actions for multiple sessions.
- Provider recovery still prevents duplicate calendar writes.

Can be thin or temporary:
- Session storage can start inline on `Activity` if migration risk is lower.
- Historical/cancelled session display can be hidden.
- Focus/Chapter linkage fields can be reserved but unused.
- Analytics can be minimal.

Intentionally excluded:
- Focus UI changes.
- Chapter prompt changes.
- Cross-app schemas.
- Desktop integration.
- AI schedule splitting.

## Release Channel

`TestFlight build` - provider-calendar behavior, retries, and real Plan dogfooding are the learning surface. Local verification is necessary but not sufficient.

## Brand-Goodwill Guardrails

- Do not expose substrate language.
- Do not create a session dashboard.
- Do not imply time tracking.
- Do not create calendar events without a durable binding.
- Do not make missed planned sessions shameful.
- Keep all new visible copy short and practical.

## Reversibility

- Add sessions as optional data; keep existing `scheduledAt` compatibility projection.
- Avoid destructive migration from old schedule fields until dogfood confidence is high.
- Feature can be hidden by suppressing "Add another session" while keeping the first-session behavior.
- Existing Activities without sessions keep working.

## Permanent Product Threshold

Promote the substrate from learning release to accepted architecture when:
- Multiple scheduled sessions work reliably in TestFlight.
- Existing surfaces remain consistent.
- The user does not perceive "sessions" as extra maintenance.
- The domain helpers make Focus/Chapter future integration easier rather than harder.
