# Learning Release: Chat Recipe Management

## Concept To Build
Chat prepares reviewable Recipe changes and the Recipes capability applies approved changes without leaving the conversation.

## Capability Delta
Today, the user cannot create, correct, or remove a Recipe from Chat. After this release, the user can approve those three private Recipe operations. Public publishing, collaboration, import extraction, and Meal Plan mutation stay intentionally unsupported.

## User Experience
The user asks naturally. Chat reads authorized Recipe evidence where needed and shows a proposal naming the Recipe and consequence. Approve applies it; reject/defer leaves Recipes unchanged. The applied receipt opens Recipe Home when the Recipe still exists.

## Existing Product Relationship
Enhances Unified Chat and reuses Recipe validation, repository, store refresh, proposal cards, receipts, and return navigation.

## Buildable Slice
Must be real: tool selection, strict payload parsing, proposal persistence, approval/rejection/defer, optimistic version enforcement, Recipe repository write, store refresh, receipt, and return target. Can be thin: revised proposals are requested conversationally instead of edited field-by-field. Excluded: media/import and public/share operations.

## Release Channel
Local build. This is Andrew-visible first because runtime model behavior and proposal readability need dogfood proof before TestFlight claims.

## Brand-Goodwill Guardrails
- Never claim a Recipe changed until an applied receipt exists.
- Never mutate a Recipe not present in authorized evidence.
- Preserve the full current version on update.
- Explicitly label deletion and never auto-approve it.

## Reversibility
The capability is isolated to Recipe tool staging and decision execution. It can be disabled by removing Recipe from the runtime action lane without changing Recipe schema.

## Permanent Product Threshold
Repeated local and signed-device use shows complete proposals, correct persistence, understandable delete review, and no stale-version data loss.
