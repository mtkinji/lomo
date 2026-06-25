# Converge: Activity Areas

## Scoring

| Alternative | Maya fit | Strategy fit | Trust | Implementation fit | Verdict |
| --- | --- | --- | --- | --- | --- |
| A: Field First | Medium | Medium | Strong | Strong | Useful substrate, not enough value alone. |
| B: Scheduling-First Areas | Strong | Strong | Strong if previewed | Medium | Choose as the V1 direction. |
| C: Recommended-First Areas | Medium-strong | Strong | Medium | Strong | Include as bounded secondary use. |
| D: AI-Suggested Areas Only | Medium | Medium | Medium-low | Medium | Keep suggestions, reject silent inference as the core. |
| E: Area Views | Medium | Medium | Strong | Medium | Defer until scanning demand is proven. |

## Chosen Direction

Choose **Scheduling-First Areas**.

Areas become a user-managed Settings concept with intelligent defaults. Activities can optionally reference one primary Area. Scheduling setup lets the user define when each Area usually fits, and scheduling proposals use Area as a soft constraint. Smart order and Recommended may use Area as bounded context evidence, but Area does not become a required field, primary grouping, or new dashboard.

## Capability Delta

Today, the user cannot:

- tell Kwilt that a to-do belongs to Work, Family, Home, Health, or another life area in a durable way;
- manage the life-domain list that scheduling inference depends on;
- set scheduling availability per life area;
- correct bad scheduling by changing a human-readable Area rather than fighting inferred keywords.

After this release, the user can:

- manage Areas in Settings with sensible defaults;
- assign or accept a suggested Area on an Activity;
- configure when each Area usually fits;
- see scheduling proposals prefer the Activity's Area window;
- understand why a suggested slot fit or did not fit.

## Reductive Design Decisions

- Use **Area** as the user-facing label.
- Keep the internal concept compatible with current `schedulingDomain`, but do not expose "domain" language.
- V1 allows zero or one primary Area per Activity.
- Area is optional; unassigned Activities remain first-class.
- Intelligent defaults ship enabled, editable, and reorderable.
- Area availability is a soft scheduling constraint by default.
- Do not add Area grouping in V1.
- Do not add a top-level Areas screen outside Settings.
- Do not let AI create durable Areas or reassign Activities without confirmation.
- Do not make Areas equivalent to Goals, Arcs, tags, or action contexts.

## Accepted Trade-Offs

- V1 sacrifices multi-area nuance for clarity.
- V1 may not perfectly handle tasks that belong to both Work and Family; those can be handled by manual slot selection or later multi-area support.
- Scheduling logic must carry a compatibility layer from `work`/`personal` windows to user Areas.
- Settings gets one more durable concept, so copy and defaults must stay restrained.

## Rejected Trade-Offs

- Do not ship a hidden-only `scope` field that users cannot inspect.
- Do not make Area only a tag convention.
- Do not use Area as the main list grouping before it proves useful.
- Do not block scheduling if an Activity has no Area.
- Do not hard-block urgent work from non-matching windows.

## System Implications

- `Activity` needs an optional Area reference, likely `areaId?: string | null`.
- User preferences need an `areas` collection with stable ids, labels, ordering, active/archive state, defaults, and scheduling settings.
- Existing `schedulingDomain` behavior should either map to Area availability or become derived/legacy compatibility.
- Plan Availability needs per-Area windows or a mapping from Area to existing work/personal modes.
- Recommendation scoring can use Area fit as context evidence only when the current moment has a credible Area signal.

## Activation Path

The feature should activate in three places:

1. **Settings**: Areas appears as a small management surface, likely near Planning/Scheduling.
2. **Scheduling setup**: "When do these areas usually fit?" lets users tune Area windows.
3. **Activity detail / Quick Add refinement**: Area is visible as optional metadata and can accept suggestions.

Do not interrupt raw capture. Area suggestions can appear after capture or during schedule/edit moments.

## Stated Bet

We're betting that Areas will make scheduling and recommendations feel more accurate because they encode the user's life domains in a calm, inspectable way. If users ignore Areas or treat them like redundant tags, we should collapse Area toward scheduling-only preferences or rely on Goals/tags instead.

## Success Signal

- Users understand Area without explanation and can name why it helps scheduling.
- Scheduling proposals increasingly use Area windows and require fewer manual corrections.
- Users correct wrong suggestions by changing Area rather than abandoning scheduling.
- Unassigned Activities do not feel broken or second-class.
