# Converge: Goal Progress Table

## Qualitative scoring

| Alternative | Persona and job fit | System alignment | Data and migration risk | Clutter risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Rich description table | High visual fit, weak completion semantics | Medium | Medium | Low | Do not choose |
| One Activity per row | Low semantic fit | Superficially high | Medium | High | Reject |
| Goal-owned To-do table | High | High with one bounded extension | Low | Low when optional | Choose |
| County-high-point template | Very high for one case | Low for first release | Medium | Medium | Defer |

## Chosen alternative

One optional custom-column table view over a Goal's To-dos. The first non-empty pasted line defines up to three Goal-owned columns; subsequent lines import Activities. “High point” is inferred as the Activity title column, while County and Elevation become custom Activity values. Existing To-dos with matching titles are updated instead of duplicated.

## Capability delta

Today, a user cannot:

- Represent a finite, many-part Goal as a legible table with reference details.
- Check named outcomes without converting them into Activities or manually maintaining symbols in prose.
- Paste an existing manually aligned list into the Goal's actual To-dos.

After this concept ships, a user can:

- Add one table to a Goal from the Goal actions menu.
- Paste one-to-three-column text, preview it directly on the Goal canvas, and edit the source later.
- Check or uncheck rows through Activity completion, with completed summits retained in the same table.

Still intentionally unsupported:

- Formulas, sorting, filtering, multiple tables, more than three columns, row assignments, automatic Activity creation, and real-time co-editing.
- A claim that partner devices see or can edit the table; the existing shared-goal content contract remains a separate proof boundary.

## Reductive design decisions

- Enhance the existing Goal canvas; add no new screen, tab, template gallery, setting, or dashboard.
- Store one table, not arbitrary blocks.
- Use a plain-text paste/edit surface rather than a cell-by-cell spreadsheet editor.
- Do not add a progress percentage or summary card; the checked rows are sufficient.
- Do not invent a second row-completion model; checking a row completes the Activity.
- Refuse column sizing, alignment controls, colors, formulas, attachments, and table naming in the first release.

## Activation path

The user is ready when a Goal has a finite collection whose shape does not fit the description. The action lives in the existing Goal actions menu as **Add table**; after creation it becomes **Edit table**. No coachmark or promotion appears. The editor teaches the format with one concrete three-column example and says that the first line becomes headers.

Natural adoption means Charlie chooses to move the county-high-point list into the Goal and uses the row checks on at least one real outing without asking for the Notes version back.

## Accepted trade-offs

- Plain-text table editing is less visually direct than editing individual cells, but it makes importing 29 rows fast and keeps the first release small.
- Column definitions are Goal state and custom cells are Activity state in the existing JSON domain objects; shared cross-account editing is not claimed.

## Rejected trade-offs

- We will not preserve arbitrary Notes formatting at the cost of deterministic parsing.
- We will not store duplicate rows merely to recreate Activity completion behavior.
- We will not generalize into a spreadsheet engine.

## System implications

- Add a backward-compatible optional `todoTable` schema to `Goal` and `todoTableValues` to `Activity`.
- Add pure parse/import/serialize logic with tests, including title-based reconciliation.
- Add one focused To-do table component inside the Goal Plan and connect it to `updateGoal`, `updateActivity`, and `addActivity`.
- No Supabase migration is required because Goal payloads are JSON.

## Bet

We're betting that the missing capability is a bounded, checkable representation inside the Goal—not a demand for general spreadsheet power. If Charlie still prefers Notes after using the bundled slice, we would revisit cell editing and rich-text-table fidelity before expanding scope.

## Success signal

Charlie puts the Utah county high-points goal in Kwilt, pastes the existing list with little cleanup, sees each summit as a real To-do with custom columns, and continues to see completed summits in place.
