# Frame: todo-linked-goal-redundancy

## What the user said
> There are two places where we show the Goal on a Todo, and that redundancy should be removed. I think my preference is to preserve the top spot, but I also think I want to preserve the two patterns: 1) Picking and 2) navigating.
>
> Clarification: There shouldn't be two separate things. I want one thing that does the jobs of showing which Goal, if any, this is linked to; letting me choose one if none is linked; and letting me change the linked Goal.
>
> Refinement: The new Goal display may need to be slightly larger. The leading icon may want to be a Goal/nav icon instead of a generic link icon. The trailing picker affordance may need visible segmentation so users understand the title side navigates while the right side changes the link.

## Restated in user voice
When I am looking at a To-do, I want to know what Goal it belongs to and still be able to change that Goal, without seeing the same long Goal title twice.

## Target audience
`audience-burned-out-productivity-power-users` - Burned-out productivity power users.

## Representative persona
Marcus: Marcus has enough tools. His job is not to track more work; it is to decide what matters, move it, and trust the system enough not to rebuild it next week.

- Current situation: He is inside a To-do detail, trying to understand and edit the work without extra maintenance noise.
- What he's trying to become/do: Keep the few commitments that matter moving.
- Emotional state or tension: Sensitive to clutter and duplicated planning furniture.
- What would make this feel wrong to him: Repeating metadata in a way that makes the detail page feel like a form instead of a calm action surface.

## Hero anchor
`jtbd-move-the-few-things-that-matter` - Help me make real progress in the few areas I most want to grow.

## Job flow step
Marcus job flow step 5, "Decide what to do next", currently has delivery score 3. The relevant gap is that Plan and recommendations help, but the "what now?" moment is not yet the spine. To-do detail should preserve orientation without adding maintenance noise.

## Active anchors
- `jtbd-move-the-few-things-that-matter` - A linked Goal should orient the action toward a meaningful commitment, not become duplicated metadata.

## Friction we're addressing
The To-do detail page should now use one top-level Goal relation control. The current row is functionally close, but it risks reading too small, too much like a generic hyperlink, and too much like one uniform picker surface even though the title side navigates and the trailing control changes the link.

## System alignment
Constraint posture: `Fit the system`

Current system facts:
- Existing surface: Activity detail refresh layout.
- Existing user flow: Top Goal chip shows the linked Goal; lower relation picker changes the linked Goal.
- Existing domain/data model: Activity has optional `goalId`; unanchored Activities remain valid.
- Existing technical affordances: `RelationPickerField` renders a trigger plus full-screen searchable picker with selected option state.
- Existing UX/copy conventions: Detail fields use compact filled picker rows with short labels; object rows use icons to communicate domain, not just action.

Constraints to preserve:
- Do not block unanchored Activity capture.
- Preserve active-goals-only picker behavior.
- Preserve the top Goal spot as the single Goal relationship affordance.
- Preserve active Goal selection and changing behavior.
- Preserve Goal-detail navigation with back returning to the To-do.

Constraints we may challenge:
- The Goal relation row can be larger than the prior origin chip because it is now the only Goal control.
- The leading icon can communicate "Goal" rather than generic "link."
- The picker affordance can be visually segmented without becoming a second row.

Design implication:
Use the top Goal row as one compound relation control. It should be visually substantial enough to read as a field, use a Goal-domain icon, make the title side feel like object navigation, and make the trailing picker side visibly distinct enough that changing the link does not feel like a surprise.

## Aspirational design challenge
How might we help Marcus understand and change a To-do's Goal relationship while preserving a calm, low-maintenance detail page?

## Out of scope
Changing Activity/Goal data modeling, adding a second edit affordance, or redesigning the whole Activity detail hierarchy.

## Open question
Should the title side show a subtle navigation cue, or is the Goal-domain icon plus row placement enough once the picker side is segmented?
