# Converge: tag-vocabulary-system

## Scoring

| Alternative | Maya fit | System fit | Learning value | Risk | Read |
| --- | --- | --- | --- | --- | --- |
| A. Reuse-First Tag Input | High | High | High | Low | Best first move |
| B. Tag Browser As Lightweight Inventory | High | High | High | Low | Pair with A |
| C. Gentle Cleanup Suggestions | Medium | Medium | Medium | Medium | Later |
| D. First-Class Tag Inventory | Medium | Medium/Low | Medium | High | Substrate later |
| E. Tags Become Saved Views | Medium/High | Medium | Medium | Medium | Later, after usage signal |

## Chosen direction

Build **Tag Vocabulary As Retrieval Infrastructure**:

1. Every tag creation/editing moment should search existing tags first.
2. The tag browser should scale past the top five with search, counts, and openable tag groups.
3. The underlying model should treat tag history as a vocabulary candidate, with a future path to first-class inventory.
4. Cleanup and saved-view graduation should wait until usage proves they are needed.

## Capability delta

Today, the user cannot:

- Reliably find an existing tag while creating or editing an Activity tag.
- Trust AI/manual tagging to reuse Groceries instead of creating nearby variants.
- Browse a large tag vocabulary in a practical way beyond a small top-tag list.
- Clean up drift when tags become messy.

After the chosen release, the user can:

- Type part of a tag and pick the existing one before creating a new one.
- Open an "All tags" browser and search the full tag vocabulary.
- Use a tag group as a retrieval surface without configuring a custom view.
- Benefit from AI and deterministic suggestions that prefer existing tags.

Still intentionally unsupported:

- Bulk merge/rename/delete.
- Nested tags.
- Tag colors and descriptions.
- Automatic retagging of existing Activities.
- Required tags at capture.

## Reductive design decisions

- Enhance Activity detail, Quick Add/tag editing, Filter drawer, and Tag Groups drawer before adding a new top-level Tags section.
- Keep "create new tag" as a fallback row, not the default posture.
- Do not expose tag analytics, tag health scores, or a cleanup queue.
- Do not introduce hierarchy. For Maya, "Groceries" should be a familiar handle, not a folder architecture.
- Do not conflate tags and saved views yet.

## Activation path

The feature should activate at two moments:

- **Creation/editing:** when Maya starts typing a tag, existing tags appear first.
- **Retrieval:** when Maya opens Tags from Activities and either sees the top five or taps View all to search the full vocabulary.

Education should be minimal. The interaction itself should teach reuse: search results, counts, and "Use new tag" fallback are enough.

## Accepted trade-offs

- We accept that raw string tags remain the Activity data shape for the first learning release.
- We accept that cleanup is deferred, even though duplicate tags may already exist.
- We accept that only tag search/reuse and browsing improve immediately; full lifecycle management waits.

## Rejected trade-offs

- Do not solve this by making users configure filters manually.
- Do not make AI the sole owner of tag cleanup.
- Do not add a heavy tag management screen before improving tag entry.

## Stated bet

We're betting that Maya's first-order tag pain is not "I need to administer a taxonomy"; it is "I need Kwilt to help me reuse and retrieve the familiar labels I already meant." If that is wrong, and users still accumulate messy duplicates after reuse-first inputs ship, we revisit with rename/merge/alias inventory work.

## Success signal

A user with more than 20 tags can add a grocery-related to-do, select the existing Groceries tag from search, and later open the Groceries group from the tag browser without manually typing a filter.
