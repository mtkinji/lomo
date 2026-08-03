# Learning Release: Goal Progress Table

## Concept To Build

An optional Goal-owned table view lets a person paste To-dos with up to three custom columns and retain completed To-dos in the same scan-friendly Plan.

## Capability Delta

Today, the user cannot:

- Put Charlie's County / High point / Elevation representation into a Goal as a working object.
- Check one county while retaining the table's alignment and reference context.

After this release, the user can:

- Choose **Add table** from Goal actions.
- Paste the existing aligned note, save it as structured rows, and check rows on the Goal canvas.
- Reopen **Edit table** to correct the source or remove the table.

Still intentionally not supported:

- Partner-device shared editing or visibility guarantees.
- General spreadsheet behavior, more than three visible columns, or arbitrary formulas.

## User Experience

On a Goal canvas, the actions menu offers **Set up To-do table**. A bottom drawer explains that the first line becomes Goal-specific headers and each later row becomes a To-do. Saving replaces the standard Plan list with the table. Each row uses the Activity check control, and completed rows remain visible in place.

## Existing Product Relationship

This enhances the Goal's Plan view. It does not replace the description, metrics, Activities, or shared-goal signals. The table is a presentation and metadata schema over the same To-dos.

## Buildable Slice

Must be real:

- Backward-compatible Goal column-schema and Activity custom-cell JSON persistence.
- Deterministic one-to-three-column parsing, title-column inference, and reconciliation with existing To-dos.
- Goal actions entry, editor drawer, saved table rendering, Activity completion, editing/import, and view removal without deleting To-dos.
- Focused unit/component coverage plus diff-aware verification.

Can be thin or temporary:

- The editor is a single plain-text surface rather than a grid editor.
- Completion has no analytics event in the first local learning slice.

Intentionally excluded:

- Templates, maps, external links, column configuration UI, multiple tables, collaboration changes, notifications, AI generation, and percentages.

## Release Channel

`Local build` — Andrew and Charlie can evaluate the actual bundled Goal canvas with their real list before the product makes a broader promise about tables or shared editing.

## Brand-Goodwill Guardrails

- The feature is user-invoked and absent from Goals that do not need it.
- Copy says exactly how pasted text is interpreted.
- Saving is blocked when there is no header and at least one row.
- Removing the table requires confirmation.
- The UI never describes rows as To-dos or implies partner visibility.

## Reversibility

The optional JSON field can be ignored by older clients. Removing the component and menu action leaves existing Goals functional; stored table data can remain inert without a database migration.

## Permanent Product Threshold

Charlie adopts it for the county goal, row checking survives real use, the Goal/Plan distinction remains understandable, and at least one additional real Goal shape benefits from the same bounded table without requesting spreadsheet features.
