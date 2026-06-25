# Evaluate Learning: Activity Areas

## Learning Questions

- Do users understand **Area** as a life-domain label without much explanation?
- Do the intelligent defaults feel right, or do users immediately need different names?
- Does Area assignment feel useful or like homework?
- Does Area-based scheduling reduce wrong-window proposals?
- Does "Usually fits" feel human enough for scheduling setup?
- Are users comfortable with AI/Quick Add suggesting an Area when it is obvious?
- Does Area create confusion with Goal, tag, context, or schedule?

## Supporting Evidence

- Users assign or accept Areas on a meaningful share of scheduled Activities.
- Users edit Area availability and can explain what changed.
- Scheduling proposals use Area windows and are applied more often than manually corrected.
- Users leave many Activities unassigned without perceiving them as incomplete.
- Qualitative feedback describes Areas as helping Kwilt understand "which part of life" a to-do belongs to.

## Disconfirming Evidence

- Users ask whether Area is just a tag or Goal.
- Users ignore Area until forced by scheduling setup.
- Users rename defaults into action contexts like `Errands` or `Computer`, suggesting the model is unclear.
- Scheduling suggestions still need the same manual corrections.
- Users feel burdened by configuring multiple Area windows.

## Brand-Goodwill Evidence

- No complaints that Kwilt is becoming a task manager.
- No reports of capture feeling slower.
- Scheduling explanations feel transparent and non-judgmental.
- Users can undo or override scheduling without feeling trapped.

## Instrumentation

Track, if analytics are available:

- `area_created`
- `area_renamed`
- `area_archived`
- `activity_area_set`
- `activity_area_suggestion_accepted`
- `activity_area_suggestion_rejected`
- `area_availability_updated`
- `schedule_proposal_generated` with `area_source: explicit | inferred | none`
- `schedule_proposal_applied`
- `schedule_slot_manually_changed`

Avoid tracking:

- sensitive Area names in analytics payloads;
- raw Activity titles;
- exact home/work location semantics.

## Decision Rule

Proceed to permanent implementation if local/TestFlight usage shows that Area improves scheduling comprehension and corrections without making capture feel heavier.

Revise if Area is understood but defaults or copy are wrong.

Retire or collapse if Area behaves like a redundant tag and scheduling can be served by Goals, tags, and inferred context alone.

## Expected Next Action

Write a build-ready feature brief, then implement the smallest scheduling-first slice: Settings Areas, Activity `areaId`, and Area-aware scheduling fallback.
