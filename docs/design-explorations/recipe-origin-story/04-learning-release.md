# Learning Release: Recipe origin story

## Concept To Build
Reviewed catalog recipes show a real, non-interactive native map and concise sourced origin story inside Recipe Home.

## Capability Delta
Today, the user cannot distinguish a recipe’s place and history from generic cuisine labels. After this release, reviewed recipes can show bounded place context and sources. Draft AI research remains invisible.

## User Experience
After ingredients, method, and notes, Recipe Home presents “Where this meal comes from,” the reviewed place label, a native map with geographic markers, history paragraphs, and quiet source labels.

## Buildable Slice
Real: native map, reviewed data only, accessibility label, source text, no generated cartography. Excluded: map gestures, user location, directions, and a separate history screen.

## Release Channel
Local build first. Simulator visual proof remains a separate gate owned by the primary checkout unless runtime ownership moves.

## Reversibility
The section is absent when no reviewed enrichment exists; removing it does not mutate recipe data.
