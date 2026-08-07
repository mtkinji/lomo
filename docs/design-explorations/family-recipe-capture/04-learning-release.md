# Learning Release: Family recipe capture

## Concept To Build

An intent-first Add Recipe flow that gives family recipes the fastest appropriate capture tools and always reveals the saved recipe.

## Capability Delta

Today, the user cannot begin from “this is a family recipe” without first choosing among overlapping import mechanics.

After this release, the user can photograph, paste, dictate, or manually enter family knowledge from one clear path, while a web recipe begins directly from its link.

Still intentionally unsupported: invented missing family details, linked variants, and public publication.

## User Experience

Meals → Add a recipe → Family recipe / Recipe from the web / Start blank → review → Save recipe → Recipe Home.

## Existing Product Relationship

This replaces only the capture-choice presentation and reuses import extraction, evidence, editing, persistence, Recipe Home, planning, and cooking.

## Buildable Slice

Must be real:

- intent-led drawer copy and navigation;
- focused family and web entry states;
- existing photo/text/link extraction and review;
- saved-recipe destination;
- keyboard, loading, error, and accessibility behavior.

Intentionally excluded: new backend tables, automatic family sharing, and catalog expansion.

## Release Channel

Local development build against the configured private Recipe backend, with Andrew’s standard crepe added through the actual UI.

## Brand-Goodwill Guardrails

- Say what remains private and what requires review.
- Never imply a draft is already saved.
- Never manufacture the sourdough recipe.

## Reversibility

The change is presentation and route intent over existing operations; reverting it does not orphan Recipe data.

## Permanent Product Threshold

The flow is keepable when both family and web entry are understood without explanation and persisted Recipe Home matches the reviewed draft.
