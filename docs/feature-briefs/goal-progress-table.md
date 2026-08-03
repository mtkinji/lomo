---
id: brief-goal-progress-table
title: Goal progress table
status: accepted
audiences: [audience-private-accountability-seekers]
personas: [David]
hero_jtbd: jtbd-invite-the-right-people-in
job_flow: job-flow-david-invite-the-right-people-in
serves: [jtbd-invite-the-right-people-in, jtbd-move-the-few-things-that-matter, jtbd-trust-this-app-with-my-life]
related_briefs: [social-goals-auth, growth-evangelism-shared-goals]
owner: andrew
last_updated: 2026-08-02
---

# Goal Progress Table

## Context

Charlie declined to put a shared goal to visit all 29 Utah county high points into Kwilt because its To-dos could not take the representation he needed. He manually spaced a three-column checklist in Apple Notes—County, High point, Elevation—with a completion check beside every summit. This is evidence for Goal-specific custom data columns over real To-dos, not a separate Goal body or generic spreadsheet.

## Target audience

Private accountability seekers want one trusted person inside one meaningful commitment. A structured shared outcome helps both people understand the same bounded room without exposing unrelated life data or creating a social feed.

## Representative persona

David is adapted to a finite shared adventure with a family member. Charlie is the observed evidence subject: he is willing to pursue the goal but not willing to put it in a system that flattens its shape.

## Aspirational design challenge

How might we help David carry a shared, many-part commitment in the exact shape that makes it understandable, while preserving Kwilt's calm Goal canvas and Activities-as-the-plan model?

## Hero JTBD

`jtbd-invite-the-right-people-in` — a trusted participant needs a legible shared outcome before the invitation feels like entry into the same commitment.

## Job flow step

`job-flow-david-invite-the-right-people-in`, **Let the other person respond or follow along**, currently 2/5. Shared Goal and signals-only foundations exist, but the recipient-side Goal cannot yet express a structured many-part outcome.

## JTBD framing

When a meaningful goal has a known set of named outcomes and reference details, I want the goal to hold that whole shape in a form I can scan and check off with the person doing it with me, so that Kwilt feels like the natural home for the commitment instead of forcing us to flatten it into prose or task admin. This primarily serves `jtbd-invite-the-right-people-in`, with `jtbd-move-the-few-things-that-matter` and `jtbd-trust-this-app-with-my-life` as supporting demands.

## Design

### Constraint posture

`Extend the system`: add one optional Goal-owned table schema over the existing Activity Plan while preserving Activity ownership of completion.

### Data contract

A Goal may contain one `todoTable` view schema:

- one to three Goal-specific columns, each with a stable ID and non-empty label;
- one column ID designated as the To-do title;
- created and updated timestamps.

Each Activity may contain `todoTableValues` for the non-title custom columns. Activity `title`, `status`, and `completedAt` remain authoritative for the corresponding table row.

The field is optional and backward compatible. Goal persistence already stores JSON payloads, so the learning slice requires no schema migration.

### Goal canvas

When a table exists, render it as the Goal Plan's To-do view:

- a quiet header row;
- one circular check control per row;
- up to three wrapping text cells;
- checked rows remain readable in their original position without moving into the collapsed Completed section;
- an **Edit** action beside the table section.

Checking a row uses the existing Activity completion/undo path and may produce the same approved shared-goal progress behavior as completing that To-do in list view. The table does not create a second completion state.

### Add and edit

The Goal actions menu says **Set up To-do table** when absent and **Edit To-do table** when present. It opens a bottom drawer with one multiline text field:

- the first non-empty line is the column header;
- later non-empty lines import To-dos;
- tabs or runs of two-or-more spaces separate cells;
- one to three columns are accepted;
- “High point,” “Summit,” “Peak,” “To-do,” “Task,” “Item,” “Title,” or “Name” is inferred as the Activity title column; otherwise the first column is used;
- the editor serializes all active and completed Goal Activities back to tab-separated text;
- saving reconciles existing Activities by normalized title, updates their custom values, and creates Activities only for unmatched rows;
- removing the table view keeps all To-dos and returns the Goal to its normal list presentation.

Example:

```text
County  High point  Elevation
Beaver  Delano Peak  12,169 ft
Box Elder  Bull Mountain  9,940 ft
```

### Reductive boundaries

- One To-do table schema per Goal.
- No table title, formulas, sorting, filters, widths, alignment, colors, attachments, assignments, row dates, or multiple blocks.
- No automatic table suggestion, tutorial, coachmark, template gallery, or AI conversion.
- No claim of shared cross-account visibility or co-editing in this slice.

### Activation

Discovery is organic in the existing Goal actions menu at the moment a user notices the description is insufficient. No existing Goal receives new visible UI until the user adds a table.

### Learning release

Ship first as a local bundled slice for Andrew and Charlie. Use the real 29-row note to test parsing, legibility, row completion, and whether Kwilt becomes the authoritative home. See `docs/design-explorations/goal-progress-table/04-learning-release.md` and `05-evaluate-learning.md`.

## Spec refinement

- **Resolved:** every row is an Activity/To-do; table mode is only a view and custom-data schema.
- **Resolved:** the first release uses paste/source editing, not direct cell editing.
- **Resolved:** existing To-dos are reconciled by normalized title so their completion state and identity survive re-import.
- **Resolved:** Goal owns column definitions; Activity owns custom cell values and completion. Both are optional JSON, so no database migration is required.
- **Intentionally deferred:** shared cross-account visibility/editing, templates, analytics, direct cell editing, and more than three visible mobile columns.
- **Assumption to test:** two-or-more spaces in Charlie's Note reliably delimit its three visual columns after copy/paste.

Acceptance evidence:

- Parser tests cover tabs, manually spaced columns, blank lines, column cap, malformed input, and row reconciliation.
- Component tests cover rendering, row toggle, editor save, validation, and removal where practical.
- `npm run verify:changed -- --run` completes, with any unrelated pre-existing failures reported separately.
- Manual local runtime follow-up uses the real 29-row content and records checkout/branch/commit/runtime provenance.

## Success signal

Charlie chooses to place the county-high-points goal in Kwilt, imports the existing list with little cleanup, and uses row completion during real outings while continuing to use Activities only for actionable trip and hike planning.

## Open questions

- Does the real Notes paste use consistent two-space/tab boundaries across all 29 rows?
- After real use, is direct cell editing necessary for corrections?
- What shared-content synchronization contract is required before a partner can treat the same table as co-owned?
