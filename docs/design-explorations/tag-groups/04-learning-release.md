# Learning Release: tag-groups

## Concept To Build

Turn existing Activity tags into simple openable tag groups, beginning with single-tag groups like Groceries.

## Capability Delta

Today, the user cannot:

- Open a practical tag group without using advanced view/filter mechanics.
- Count on AI to preserve a specific user grouping label.
- Reuse tags easily from the Activity detail tag field.

After this release, the user can:

- See and open existing tag groups from the Activities list.
- Add a to-do inside a tag group and have the tag applied automatically.
- Add/reuse tags from a compact suggestion-driven tag field.
- Trust that AI prefers existing tag history and specific group names.

Still intentionally not supported:

- Multi-tag section grouping.
- Tag hierarchy, colors, merge/archive, analytics, or bulk actions.
- Automatic location behavior.

## User Experience

In Activities, the user can open a lightweight Tags entry point when tag history exists. Recent or frequently used tags appear as groups. Tapping Groceries applies a tag filter and shows matching open to-dos. Quick Add in that surface creates new to-dos with `tags: ["Groceries"]`, using the existing filter-default behavior.

On Activity detail, the Tags field should show existing chips and suggested reusable tags from history before asking the user to type comma-separated text. Freeform tags remain possible.

AI-created or AI-enriched to-dos should prefer one reusable group tag when the user is asking for retrieval or list organization. Existing tag history wins over broad synonyms.

## Existing Product Relationship

This enhances Activities, custom view filters, Activity detail tags, and AI tag suggestions. It leaves Goals, Arcs, Chapters, priority, and scheduling unchanged.

## Buildable Slice

Must be real:

- A utility that derives tag-group candidates from `activityTagHistory` and/or current Activities.
- A one-tag Activity filter generator for tag groups.
- An Activities-list entry point to open a tag group.
- Tag group Quick Add inheritance via existing tag-filter defaults.
- Tag-field suggestions from existing tag history.
- AI/fallback rules that preserve exact group labels such as Groceries.
- Tests for tag-group derivation, filter generation, Quick Add defaults, and tag fallback normalization.

Can be thin or temporary:

- Visual placement of tag groups can be a compact drawer/list before a polished tag browser.
- Tag suggestions can rank by recency and usage count only.
- Analytics can be basic open/add events.

Intentionally excluded:

- Dedicated tag inventory persistence beyond existing `activityTagHistory`.
- Tag management actions like rename, merge, archive, color, and delete.
- Multi-tag grouping behavior.
- Migration of existing broad tags.

## Release Channel

`TestFlight build` - This needs to be used in a realistic mobile Activities flow, especially the store/context moment. It is low-risk because it reuses local persisted tags and can be removed without data migration.

## Brand-Goodwill Guardrails

- Do not call this a tagging system or taxonomy.
- Avoid setup copy; use plain group labels like Groceries.
- Keep capture available even with no tags.
- Never silently retag existing to-dos.
- Keep AI suggestions sparse and editable.

## Reversibility

The UI can be hidden without deleting `Activity.tags` or `activityTagHistory`. Tag groups are derived from existing data, so rollback does not require a migration. AI prompt/fallback changes can be reverted independently.

## Permanent Product Threshold

Make this permanent if users naturally open tag groups and add to-dos inside them, AI tag drift decreases, and the Groceries-style use case works without custom view setup.
