# Diverge: Goal Progress Table

Axis of variation: prose-native versus activity-native versus Goal-native structure.

## A. Rich description table

Add table insertion to the existing rich Goal description editor. The result most closely resembles Apple Notes and requires no new visible section.

- Audience/persona fit: High visual familiarity for Charlie.
- Design-challenge answer: Preserves the requested layout, but completion controls inside rich HTML are fragile.
- System fit: Touches Goal description and the WebView editor; no new Goal field.
- Best when: The table is primarily reference text.
- Fails when: Rows must be durably checkable, editable on a phone, or interpreted separately from prose.
- Four-object/capture-first check: Fits Goal, does not block capture.
- Anti-pattern check: Pass, but risks surprising paste/edit behavior and data loss.

## B. Enriched To-do list

Keep the normal vertical To-do list, add County and Elevation as a secondary metadata line, and leave completed To-dos in the existing collapsed section.

- Audience/persona fit: Medium; completion is correct, but the requested scan shape is lost.
- Design-challenge answer: Adds context without delivering the literal table.
- System fit: Reuses Activity completion and Plan with minimal layout change.
- Best when: There is only one small secondary field.
- Fails when: Three aligned columns and persistent completed rows are the representation.
- Four-object/capture-first check: Passes; rows remain Activities.
- Anti-pattern check: Pass, but insufficient.

## C. Goal-owned To-do table

Give each Goal an optional custom-column table view over its To-dos. The Goal owns the column definitions; Activities own their titles, custom cell values, status, and completion time. A paste-first setup imports rows as Activities and reconciles existing To-dos by title.

- Audience/persona fit: High; it preserves Charlie's chosen representation and avoids task-system setup.
- Design-challenge answer: The Plan itself becomes the legible, finite, checkable table Charlie asked for.
- System fit: Small optional extensions to Goal and Activity JSON plus one Plan view and drawer.
- Best when: The outcome is a finite collection of named things with reference facts.
- Fails when: The user needs formulas, arbitrary cells, multiple tables, sorting, or collaboration mechanics.
- Four-object/capture-first check: Fits Activities as the To-dos and Goal as the owner of their local view schema; does not block capture.
- Anti-pattern check: Pass if capped and presented as content, not a dashboard.

## D. County-high-point Goal template

Ship a purpose-built Utah county high-points experience with all 29 rows preloaded, map links, elevations, and completion controls.

- Audience/persona fit: Extremely high for the observed goal and low elsewhere.
- Design-challenge answer: Removes all setup for this adventure.
- System fit: Adds template/content infrastructure and domain-specific data.
- Best when: Kwilt intentionally curates real-life adventure packs.
- Fails when: The insight is about representation rather than this one list.
- Four-object/capture-first check: Fits Goal but introduces a new content surface.
- Anti-pattern check: Pass in isolation; fails reductive scope for the first learning release.
