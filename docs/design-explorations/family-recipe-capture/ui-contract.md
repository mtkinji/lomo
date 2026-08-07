# UI Contract: Family recipe capture

Job: When a recipe lives in family memory or at a web source, the user needs to bring it into Meals in its current form, so they can trust, find, plan, and cook it later.

Primary action: Make a review draft.

Must show: the source situation, what input is needed now, private/review status, and the saved recipe after approval.

Reveal later: extracted fields, evidence, source attribution, ingredients, instructions, and optional story.

Must not add: recipe variants, collections, setup, public sharing, a capture chat, invented fields, or a second review form.

Reuse map:

- Add entry → `RecipeInventoryDock`
- Intent choice → `BottomDrawer`, `BottomDrawerHeader`, existing capture rows
- Input → existing `TextInput`, photo picker, and import repository
- Review → `RecipeEditView`, `ImportEvidenceViewer`
- Completion → `RecipeHome`

Behavior sources:

- private immutable Recipe and provenance → Recipes capability contract;
- never block capture → Kwilt capture-first principle;
- explicit review before save → current import contract;
- one dominant next action → Meals continuity refinement.

Unresolved decisions: the exact family sourdough content and family source name must come from Andrew.

Required states: family, web, blank, keyboard, extracting, extraction error, review warning, saving, save error, success, and persisted return.

Proof path: iOS development client, Meals → Add a recipe, both family and web paths, real standard-crepe link import, Recipe Home, relaunch, and search.
