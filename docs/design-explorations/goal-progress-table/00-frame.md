# Frame: Goal Progress Table

## What the user said

Charlie declined to put a shared goal to visit the high points of all 29 Utah counties in Kwilt. He could not initially explain why, then showed the representation he wanted: a three-column table with County, High point, and Elevation, plus one check circle per row. He wanted that shape enough to fake it manually with spaces in Apple Notes.

## Restated in user voice

When a meaningful goal has a known set of named outcomes and reference details, I want the goal to hold that whole shape in a form I can scan and check off with the person doing it with me, so that Kwilt feels like the natural home for the commitment instead of forcing us to flatten it into prose or task admin.

## Target audience

`audience-private-accountability-seekers` — people who want one trusted person inside one meaningful commitment without turning their lives into content or project management.

## Representative persona

David is adapted here to a jointly owned adventure with a family member. Charlie is the observed evidence subject; David remains the taxonomy persona.

- Current situation: He is considering a concrete shared goal made of 29 named outcomes with useful reference facts.
- What he's trying to become/do: Carry the whole adventure in one trustworthy place and see what the two participants have done.
- Emotional state or tension: Interested in the goal, but unwilling to accept a representation that loses its shape.
- What would make this feel wrong to him: A dashboard, 29 day-level To-dos, public competition, or a generic notes field that requires manual alignment.

## Hero anchor

`jtbd-invite-the-right-people-in` — the goal becomes more real when both people can inhabit the same bounded, intelligible object.

## Job flow step

`job-flow-david-invite-the-right-people-in`, step 5: let the other person respond or follow along. Current offering: shared Goal canvas and signals-only check-ins. Delivery score: 2/5. Gap: the recipient can follow signals, but the shared outcome itself cannot express a structured multi-part shape like this one.

## Active anchors

- `jtbd-invite-the-right-people-in` — the structured Goal is the room both people are being invited into.
- `jtbd-move-the-few-things-that-matter` — the 29 outcomes need to remain visible and concrete without becoming a productivity system.
- `jtbd-trust-this-app-with-my-life` — Kwilt must preserve the user's intended representation and completion state durably.

## Friction we're addressing

Charlie wants all 29 summits to be real completable To-dos, and he wants completed summits to remain visible in the same table. The current Goal Plan renders only To-do titles and moves completed items into a collapsed section; it cannot show Goal-specific data columns such as County and Elevation.

## System alignment

Constraint posture: `Extend the system`

Current system facts:

- Existing surface: the single-scroll Goal detail canvas.
- Existing user flow: title and description establish the outcome; Goal signals summarize status; Plan Activities hold day-level action; sharing adds partners and signals-only check-ins.
- Existing domain/data model: Goal and Activity data are persisted as JSON. Activities already own title, status, completion time, and `goalId`; a Goal can own the view schema while each Activity owns its custom cell values.
- Existing technical affordances: Goal and Activity JSON can accept backward-compatible optional fields without a schema migration; Goal detail already has an actions menu, Plan section, persistence, and Activity completion controls.
- Existing UX/copy conventions: calm canvas sections, direct editing, no KPI dashboard, no forced setup, and explicit sharing boundaries.

Constraints to preserve:

- Activities remain the only To-do and completion unit; the table is a view over them.
- Existing Goals remain unchanged unless a person explicitly adds a table.
- No percentages, streaks, reminders, or public comparison.
- Tapping a row completion must use the existing reversible Activity completion contract, and completed summits must remain in the table.
- Shared-goal privacy remains signals-only until a separate collaboration contract says otherwise.

Constraints we may challenge:

- A Goal's Plan currently has only a fixed list presentation and no Goal-owned custom data columns.

Design implication:

Add one optional table view to the Goal's To-dos. The Goal defines the custom columns; each Activity supplies its title, custom cell values, and existing completion state. The first learning slice keeps three visible columns because that is the proven mobile shape, while preserving a schema that can generalize per Goal.

## Aspirational design challenge

How might we help David carry a shared, many-part commitment in the exact shape that makes it understandable, while preserving Kwilt's calm Goal canvas and Activities-as-the-plan model?

## Out of scope

Arbitrary spreadsheets, formulas, sorting/filtering, multiple tables per Goal, shared concurrent editing, row assignments, per-cell attachments, or automatic creation of Activities.

## Open question

Does the first bundled use with Charlie feel like the goal finally has a home, or does he still prefer the Notes representation?
