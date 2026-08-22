# Learning Release: Budget Settings

## Concept To Build
One canonical Budget settings page combines plan controls, additive category recovery, privacy, and household access.

## Capability Delta
Today, Budget-level controls are split and the ellipsis opens a narrower Money plan surface. After this release, both Settings and the ellipsis open the same page. Destructive reset and bulk category editing remain unsupported.

## User Experience
The user opens Settings > Budget or Budget > ellipsis > Settings. The page shows plan controls first, category recovery second, and privacy/access links after that. Restoring defaults requires confirmation and reports how many missing categories were added.

## Existing Product Relationship
Enhances the existing global Settings stack, reuses the current Money plan persistence, and leaves category detail/settings intact.

## Buildable Slice

Must be real:
- canonical navigation and deep link;
- existing plan reads/writes;
- owner-scoped additive category restoration;
- loading, success, no-op, and error feedback.

Intentionally excluded:
- destructive reset;
- bulk category inventory;
- deployment from this local change.

## Release Channel
Local build for Andrew-only evaluation before TestFlight.

## Brand-Goodwill Guardrails
The action says restore, not reset, and explicitly preserves existing categories and amounts.

## Reversibility
The route and additive RPC can be removed without migrating existing settings data. Restored categories are ordinary owned categories.

## Permanent Product Threshold
Both entry paths feel predictable in Simulator and additive recovery proves safe with realistic category sets.
