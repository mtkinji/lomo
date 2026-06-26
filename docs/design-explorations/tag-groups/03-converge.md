# Converge: tag-groups

## Scoring

| Alternative | Persona fit | System fit | Complexity | Trust | Verdict |
| --- | --- | --- | --- | --- | --- |
| Tag Groups As Saved Single-Tag Views | High | High | Low-medium | High | Choose |
| Primary Tag Plus Secondary Tags | Medium | Medium | Medium-high | Medium | Defer |
| Tag Inventory And Reuse-First Editing | High | High | Medium | High | Include as support |
| Full Multi-Tag Grouping | Low | Medium | High | Low | Reject |
| Natural-Language Tag Search | Medium | Medium | Medium | Medium | Later adjunct |

## Chosen Alternative

Build **Tag Groups as single-tag retrieval lenses**, supported by reuse-first tag editing and AI tagging rules.

The product should not add list grouping by tags in V1. Filtering answers "show me Groceries"; grouping answers "section this already-visible list." A multi-tag Activity can belong to multiple tag-filtered lenses over time, but it should not appear in several sections at once, and the app should not invent a hidden winner without a clearer model. Instead, a tag group is a focused Activity list backed by one tag filter. This directly serves the Groceries story: when Maya is at the store, she opens Groceries and sees the relevant to-dos together.

## Capability Delta

Today, the user cannot do well:

- Reliably open a practical tag group without understanding custom view/filter setup.
- Trust AI to keep using a specific group label instead of broad synonyms.
- Reuse existing tags from the detail field without typing comma-separated text.
- Understand whether tags are inventory-backed or just disposable metadata.

After this release, the user can:

- Open a tag like Groceries as a focused group from the Activities list.
- Add a new to-do while inside that group and have it inherit the group tag.
- Reuse existing tags from suggestions in the tag field.
- See AI suggestions prefer existing tag history and a single grouping tag when the prompt implies retrieval.

Still intentionally unsupported:

- Multi-tag list sectioning.
- Tag hierarchy, colors, merge/archive, or bulk retagging.
- Automatic location-based group opening.
- AI retagging existing to-dos without confirmation.

## Reductive Design Decisions

- Reuse `Activity.tags` and `activityTagHistory`; do not add a tag-table backend in V1.
- Present a "tag group" as a filtered Activity surface, not a new domain object.
- Keep advanced filter/custom-view machinery available, but avoid making Maya learn it for Groceries.
- Make one tag the retrieval unit; secondary tags can exist but do not drive list grouping.
- Allow multi-membership through filtering: a to-do can be found through Groceries, Errands, or Saturday if it has those tags.
- Improve the existing tag field rather than adding a separate tag manager screen.
- Fix obvious fallback vocabulary drift, especially `grocery/groceries -> errands`.

## Activation Path

The user is most ready for this feature when:

- They have at least two to-dos with the same tag.
- They add or edit tags on a to-do.
- They are in the Activities list and need to narrow the pile.
- AI is about to create or enrich a to-do with tags.

Teach it contextually:

- Show recent/common tag groups in the Activities view controls once tag history exists.
- In the tag field, suggest existing tags before freeform entry.
- In AI output, keep tags sparse and familiar; do not explain the tagging system unless the user asks.

## Stated Bet

We're betting that users like Maya do not primarily want tag analytics or multi-tag grouping rules; they want familiar, stable, openable groups for real-life contexts. If it turns out users expect richer taxonomy management, we would revisit primary/secondary tags or a tag inventory screen after validating the simpler retrieval layer.

## Success Signal

A user with a practical tag like Groceries can open that group, add a new item into it, and later say the items were where she expected them to be, without learning custom filters or correcting AI-created tag drift.
