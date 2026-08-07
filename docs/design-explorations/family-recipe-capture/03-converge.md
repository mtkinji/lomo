# Converge: Intent-first family recipe capture

## Decision

Choose **B. Intent-first capture**.

It best matches Maya’s situation, removes one translation step, and reuses every durable part of the current Recipe system. A is cheaper but leaves the core ambiguity. C is slower and less inspectable. D creates a model before a household need justifies it.

## Capability delta

Before, the user has to choose among overlapping transport labels and manual saving returns without showing the saved recipe.

After, the user chooses the recipe’s situation:

- **Family recipe** → photograph, paste, dictate, or start blank.
- **Recipe from the web** → paste one link.
- **Start blank** → write directly.

Every successful path opens the resulting Recipe Home. Sourdough and standard crepes remain separately searchable.

## Reductive decisions

- Replace three transport-led rows with three intent-led choices.
- Remove the URL/text mode switch from the first import screen.
- Keep one review editor rather than introducing another form.
- Do not add recipe variants, folders, tags, setup, or a confirmation page.
- Do not copy a public recipe into the bundled editorial catalog for one household need.

## Activation

The feature teaches itself only when the user taps **Add a recipe**. No onboarding, banner, or notification is added.

## Bet

We are betting that users know whether a recipe is family knowledge or a web find before they know which Kwilt import mechanic to choose. If not, revisit the two entry labels—not the Recipe model.

## Success signal

Andrew can add the standard crepe recipe from its source link, reach its Recipe Home, return to Add a recipe, and understand exactly how to bring in the family sourdough recipe without help or invented content.
