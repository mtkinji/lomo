# Evaluate Learning: tag-vocabulary-system

## Learning questions

- Do users understand that tags are reusable groups rather than one-off descriptors?
- Does search-first tag entry reduce duplicate tags such as Grocery/Groceries/groceries-list?
- Does the full tag browser help once the top five are not enough?
- Does Maya use tags to retrieve to-dos at real-life action moments, such as at the store?
- Does the system still feel capture-first, or does the picker make capture feel heavier?

## Supporting evidence

- Existing tags are selected from suggestions more often than new tags are created when matches exist.
- Users open tag groups from the tag browser after searching.
- New Activities created inside a tag group keep the selected tag and remain findable.
- Qualitative feedback sounds like "I found my grocery list" rather than "I configured my tags."

## Disconfirming evidence

- Users keep typing new near-duplicate tags despite suggestions.
- The tag picker slows capture enough that users avoid tags.
- Users ask for bulk cleanup before they can trust tag groups.
- The tag browser becomes a dumping ground and users cannot find the right label.

## Brand-goodwill evidence

- Users do not report surprise retagging or data loss.
- Suggestions feel like memory/reuse, not correction.
- The UI still feels like ordinary to-do organization, not a database administration surface.

## Instrumentation

Useful events:

- `activity_tag_suggestion_selected`
- `activity_tag_created_from_input`
- `activity_tag_picker_search_used`
- `activity_tag_group_opened`
- `activity_tag_browser_search_used`

Useful properties:

- source surface, result position, exact-match boolean, selected-existing boolean, tag count bucket, active-count bucket.

Avoid tracking:

- Raw tag labels by default. Tag names can reveal sensitive family or personal details. Prefer hashed labels or aggregate counts unless Andrew explicitly chooses otherwise.

## Decision rule

After a TestFlight slice has seen real use across at least several tag-heavy sessions, proceed to permanent implementation if existing-tag selection becomes the natural path and tag groups are used for retrieval. If duplicate tags remain common, add canonical tag inventory with alias/merge support. If capture feels heavier, keep the tag browser but simplify tag entry back toward a smaller suggestion row.
