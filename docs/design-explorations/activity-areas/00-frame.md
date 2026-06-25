# Frame: Activity Areas

## What the user said

> Users can manage the list of areas from Settings. We'll start with intelligent defaults.
>
> Then we'll use Areas in the scheduling setup too.

## Restated in user voice

When I capture a to-do, I want Kwilt to understand which part of life it belongs to, so scheduling and recommendations fit my real day without making me maintain a productivity taxonomy.

## Target audience

`audience-aspirational-family-organizers` - Aspirational family organizers.

## Representative persona

Maya is trying to keep family, personal, household, and work commitments moving without turning Kwilt into a project-management hobby.

- Current situation: Maya has a mixed Activity list: work follow-ups, family logistics, home errands, personal care, and uncategorized captures.
- What she's trying to become/do: a steadier organizer who can put the right work into the right part of life.
- Emotional state or tension: overloaded by mixed-context commitments, but skeptical of setup-heavy systems.
- What would make this feel wrong to her: being forced to classify every to-do, seeing corporate taxonomy language, or having Kwilt silently move work into the wrong time window.

## Hero anchor

`jtbd-move-the-few-things-that-matter` - Help me make real progress in the few areas I most want to grow.

## Job flow step

`job-flow-maya-move-family-life-forward`, steps 3-5:

- See what matters: score 2. Current views show dates/status, but not a family-friendly priority model.
- Know the next doable action: score 2. Recommendations exist, but organization and scheduling constraints are not unified.
- Schedule or hand off: score 2. Scheduling and sharing foundations exist, but the flow is not cohesive.

## Active anchors

- `jtbd-carry-intentions-into-action` - Areas should help Kwilt carry an intention into a fitting time window.
- `jtbd-capture-and-find-meaning` - capture must not depend on choosing an Area.
- `jtbd-trust-this-app-with-my-life` - Areas affect scheduling, so they must be user-managed, inspectable, and reversible.

## Friction we're addressing

Kwilt currently has early scheduling-domain logic that distinguishes `work` from `personal`, and contextual recommendation logic that distinguishes practical action contexts like computer-ready or errands. Neither gives the user a calm, durable way to say which part of life an Activity belongs to. Without that layer, scheduling can only infer broad modes from text and recommendations can confuse "important" with "appropriate right now."

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: Activities already support metadata like Goal, tags, schedule fields, priority state, location, and recommendation reason codes.
- Existing user flow: Quick Add and Activity detail support capture and later refinement.
- Existing scheduling flow: Activity detail and daily plan proposal use availability windows and an inferred scheduling domain.
- Existing Settings flow: Settings already owns durable preferences such as notifications, Screen Time Protection, Plan Calendars, and Plan Availability.
- Existing context model: `todo-action-contexts` treats context as when/where something is doable, not as a life-domain field.
- Existing UX convention: grouping is a scan lens; Smart order and Recommended are computed outputs.

Constraints to preserve:

- Do not block capture on Area selection.
- Do not make Area a visible productivity methodology.
- Do not make Areas compete with Goals, Arcs, tags, contexts, or schedule fields.
- Scheduling remains previewable, reversible, and explainable.
- Recommended remains a computed surface, not a user-maintained category.

Constraints we may challenge:

- Replace rough `schedulingDomain` inference with a durable Area relationship, while retaining a compatibility mapping for existing scheduling logic.
- Let Settings own a small editable Area list with intelligent defaults.
- Let scheduling setup ask when each Area usually fits.

Design implication:

Area should be a user-managed life-domain signal. It should be optional on Activities, visible where it helps scheduling and scanning, and powerful enough for scheduling availability without becoming required setup.

## Aspirational design challenge

How might we help Maya tell Kwilt which part of life a to-do belongs to, so the app can schedule and recommend it in fitting moments, while preserving capture-first behavior and avoiding taxonomy maintenance?

## Out of scope

- Multi-area Activities in V1.
- Team/workspace Areas.
- A new top-level Areas dashboard.
- Area-specific privacy/sharing rules.
- Auto-creating Areas from AI without confirmation.
- Background auto-scheduling without preview.

## Open question

Should V1 allow deleting default Areas, or should defaults be hide/archive-only once Activities reference them?
