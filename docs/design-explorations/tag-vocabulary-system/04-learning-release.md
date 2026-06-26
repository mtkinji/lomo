# Learning Release: tag-vocabulary-system

## Concept To Build

Make tags a reusable vocabulary across Activities: searchable when adding, searchable when filtering, and browsable when opening tag groups.

## Capability Delta

Today, the user cannot:

- Easily select an existing tag while creating one.
- Search a growing tag vocabulary from the tag-group surface.
- Rely on AI and fallback suggestions to prefer the user's own tag language.

After this release, the user can:

- Search existing tags from Activity detail and any tag input.
- Create a new tag only after seeing likely existing matches.
- Open a full tag browser from Activities and search all known tags.
- Use top tags for fast access and "View all" for scale.

Still intentionally not supported:

- Tag merge.
- Tag rename.
- Tag archive/delete.
- Tag hierarchy.
- Saved-view promotion.

## User Experience

In Activity detail, the Tags field behaves like a compact chip input with an embedded search picker. As Maya types, matching existing tags appear first with lightweight use signals. If nothing fits, she can still use the typed text as a new tag.

In Activities, the tag menu keeps the top five tag groups for speed. "View all" opens a searchable tag browser with the full vocabulary, active counts, and rows that open a tag group.

In filters, the tag condition remains a searchable multi-select picker. It should use the same tag-ranking logic as Activity detail so the system feels consistent.

## Existing Product Relationship

This enhances:

- Activity detail tag editing.
- Tag Groups drawer.
- Filter drawer tag selection.
- AI/fallback tag suggestion behavior.

This leaves unchanged:

- Activity tags as raw strings.
- Capture-first flow.
- Custom views as the advanced filter container.

## Buildable Slice

Must be real:

- Shared tag option builder that ranks existing tags by match, active count, total use, and recency.
- Activity detail searchable tag picker.
- Tag Groups drawer search over all known tags.
- Filter drawer uses shared tag option ranking.
- AI/fallback prompt and deterministic suggestion logic prefer existing tag matches when available.
- Tests for tag option ranking and reuse behavior.

Can be thin or temporary:

- Counts can be simple active/current-use counts.
- New tag creation can be a simple "Use ..." row.
- No dedicated settings route.

Intentionally excluded:

- Rename/merge/archive.
- Tag descriptions/colors.
- Tag permissions or family sharing semantics.

## Release Channel

`TestFlight build` - Maya's job depends on real capture and retrieval moments, so the slice needs to be used in the native app during ordinary family planning. Local-only evaluation can catch layout and logic issues first, but the learning needs real use.

## Brand-Goodwill Guardrails

- Never block saving an Activity because a tag is missing or unmatched.
- Make "Use new tag" available but visually secondary.
- Do not frame duplicate tags as user mistakes.
- Do not silently mutate existing tags.

## Reversibility

The release can be removed by falling back to current chip/free-text tag entry and existing tag groups. Because V1 does not migrate Activity tags to ids or rewrite tags, rollback should not create data loss.

## Permanent Product Threshold

Promote this into the accepted tag system if users naturally reuse existing tags more often, tag groups become meaningful retrieval surfaces, and tag drift decreases without users feeling asked to maintain a taxonomy.
