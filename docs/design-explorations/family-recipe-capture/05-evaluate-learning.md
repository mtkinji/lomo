# Evaluate Learning: Family recipe capture

## Learning questions

- Does “Family recipe” eliminate uncertainty about photo versus paste versus dictation?
- Does the user understand that extraction produces a review draft, not a saved recipe?
- Does the saved Recipe Home make the completion state unmistakable?
- Can sourdough and standard crepes be found as separate recipes?

## Supporting evidence

- The standard crepe link imports through the web path without switching modes.
- The family path exposes photo and text input without backtracking.
- Save opens the persisted Recipe Home.
- Relaunch and search still find the saved recipe.

## Disconfirming evidence

Hesitation between the three first choices, entering a URL into the family text field, uncertainty about privacy, or returning to inventory without knowing whether save worked.

## Instrumentation

Use existing import started/draft/approved events and direct runtime observation. Do not collect recipe text, family names, photos, or ingredients in analytics.

## Decision rule

Keep the intent-first model if both entry paths complete without instruction. Revise labels or ordering before adding education or new Recipe concepts.
