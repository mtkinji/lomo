# Learning Release: Money Transaction Notes

## Concept To Build
Add an optional household-visible note to Money transaction detail.

## Capability Delta
Today, the user cannot:
- Preserve why a generic transaction happened.

After this release, the user can:
- Add, edit, remove, and later read a short note on the transaction.

Still intentionally not supported:
- Attachments, tags, private notes, or note-driven financial changes.

## User Experience
On transaction detail, a secondary Note field appears below payment-source truth. Tapping it opens a drawer with a labeled multiline input, explicit household-visibility copy, and one Save action. Saving updates the row in place; an empty save removes the note.

## Existing Product Relationship
This enhances transaction detail. Provider Description, account presentation, category, plan treatment, coverage, matching rules, and split remain unchanged.

## Buildable Slice
Must be real:
- Persisted column with the existing household row boundary.
- Snapshot projection, confirmed repository write, data-context mutation, and drawer UI.
- Empty, saved, saving, error, and removal behavior.

Can be thin or temporary:
- Andrew-only local/simulator evaluation before TestFlight.

Intentionally excluded:
- Analytics containing note text; note text must never enter telemetry.

## Release Channel
Local build first, then the ordinary TestFlight release path after acceptance.

## Brand-Goodwill Guardrails
- Say the note is visible to the Money household.
- Preserve the provider Description unchanged.
- Do not imply the note affects the plan.

## Reversibility
The UI can be removed without changing provider data; the nullable column can remain harmlessly or be retired in a later migration.

## Permanent Product Threshold
The interaction persists correctly and feels useful in ordinary household transaction review without adding noticeable clutter.
