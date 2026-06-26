# Evaluate Learning: tag-groups

## Learning Questions

- Do users understand a tag as an openable group without being taught custom views?
- Does single-tag retrieval solve the Groceries use case without multi-tag grouping?
- Does AI tag reuse feel more trustworthy when it preserves existing group labels?
- Does the improved tag field reduce one-off tags and variants?
- Does the feature protect capture-first behavior?

## Supporting Evidence

- User opens an existing tag group more than once.
- User creates a new to-do while a tag group is open and keeps the inherited tag.
- User reuses suggested tags instead of typing near-duplicates.
- AI-created to-dos use existing tag history when relevant.
- Qualitative feedback says items are easier to find in real-life contexts.

## Disconfirming Signals

- Users still ask for "group by all tags" after trying tag groups.
- Users cannot find the tag group entry point.
- AI keeps producing broad tags like errands when the user expects Groceries.
- The tag field feels heavier than before.
- Users remove inherited tags from newly added group items.

## Instrumentation

- `activity_tag_group_opened`
- `activity_tag_group_quick_add_created`
- `activity_tag_suggestion_applied`
- `activity_tag_freeform_created`
- `activity_ai_tags_applied`
- `activity_ai_tags_edited_after_apply`

Avoid tracking sensitive tag contents in analytics payloads by default. Prefer counts, normalized source, and whether the tag came from history, AI, or freeform. If a tag label is needed for Andrew-only debugging, keep it gated and avoid production analytics.

## Decision Rule

Proceed to permanent implementation if the Groceries-style user can open the group, add into it, and find the items later without custom view setup, and if AI reuse visibly reduces tag drift. Revise if users need better discovery or tag editing. Retire the surface if users ignore tag groups and keep relying on search/custom views.

## Expected Next Action

Author the feature brief and implement the learning slice behind the existing Activities surface, starting with deterministic tag-group derivation and AI/fallback tag reuse changes.
