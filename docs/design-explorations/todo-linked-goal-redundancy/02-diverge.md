# Diverge: todo-linked-goal-redundancy

## Refinement Axis
Compound-row clarity: how should one Goal relationship row communicate three jobs - show, navigate, and change - without becoming clutter?

## Alternative 1: Domain Row With Segmented Picker
Make the Goal row slightly taller and more field-like. Use the Goal icon (`goals`, the target) on the left instead of the generic link icon. The main/title area navigates to Goal detail when linked. The trailing picker button is visually segmented with a subtle divider or separate right well and uses chevrons-up-down. When no Goal is linked, the main/title area also opens the picker.

Audience/persona fit: Strong for Marcus because it removes duplicate scanning work without hiding the relationship.

System fit: Strong. Reuses `RelationPickerField` with a custom trigger and the existing `goalId` path, and only changes local styling/icons.

Best when: The user needs one calm row that still has two distinct actions.

Fails when: The segmentation becomes too buttony and makes the row feel like a settings control rather than an object relationship.

Anti-pattern check: Passes. No dashboard, forced commitment, or auto-anchoring.

## Alternative 2: Link-Led Row With Copy-Link Semantics
Keep the link icon and lean into "relationship" as the concept. Add a clearer navigation cue on the title side, such as a small right arrow, and reserve the trailing chevrons for picker changes. If copy-link ever exists, put it in the overflow menu rather than this row.

Audience/persona fit: Medium. It explains linkage, but the generic link icon competes with the product model: this is a Goal, not a URL or copied link.

System fit: Strong. Very small visual change.

Best when: The team wants to preserve the visual language of "linked object" across parent activity and Goal relations.

Fails when: Users interpret the left icon as "copy/share link" or think the whole row is a hyperlink rather than a Goal relation.

Anti-pattern check: Passes, but less aligned with the four-object model.

## Alternative 3: Labelled Mini Field
Render a compact label inside or above the row, such as "Goal" plus the Goal title, with the trailing picker segmented. This makes the row self-explanatory even if the icon is missed.

Audience/persona fit: Medium. It is explicit, but adds more words to a first-viewport surface that should stay quiet.

System fit: Medium. It starts to make the title area feel like the lower Details form again.

Best when: Usability testing shows users cannot infer that the row is Goal-related from icon/title alone.

Fails when: The row becomes visually heavy and competes with the To-do title.

Anti-pattern check: Passes, but risks productivity-form voice.

## Alternative 4: Separate Inline Action Button
Keep the Goal title as a navigation chip and place a small adjacent "change" icon button outside the row.

Audience/persona fit: Low. It technically clarifies actions, but it recreates two separate things after the user explicitly asked for one thing.

System fit: Medium. Easy to implement, but violates the reductive direction.

Best when: Compound controls prove too hard to make legible.

Fails when: The UI starts feeling like a cluster of tiny controls under the title.

Anti-pattern check: Passes technically, but fails the current product intent.
