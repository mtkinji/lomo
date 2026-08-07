# Learning Release: Editorial Meal Collections

## Concept To Build

Meals rotates two quiet editorial invitations through the browse shelves. Each
opens a curated page where a household can choose only the meals it wants or
review a complete prepared plan before creating or updating its own editable
Meal Plan draft.

## Capability Delta

Today, the user cannot:

- enter a bounded editorial point of view from the Meals inventory;
- understand why unfamiliar meals are appealing and achievable as a set;
- choose several meals in one temporary session and review them together;
- begin from a complete editorial plan without asking AI to construct one.

After this release, the user can:

- open a deterministic weekly Collection from among the existing meal shelves;
- select some meals or accept the Collection's prepared starting plan;
- resolve an existing-draft conflict explicitly;
- review the result in Meal Planning before anything is saved.

Still intentionally not supported:

- automatic plan finalization or grocery compilation;
- personalized editorial ranking or a hidden taste profile;
- saved Collections, public user Collections, or a general CMS;
- numeric price promises without live evidence;
- notifications announcing a new edition.

## User Experience

The first invitation appears after roughly three discovery sections and the
second after roughly six. The card names one useful promise rather than a
campaign. The Collection page has a hero premise, two or three authored
sections, and meal entries that answer `Why try it?` and `Why is it doable?`.

Tapping `Choose` adds the meal to a temporary selection tray on the page.
`Review selected meals` opens the existing Meal Plan editor with the selected
Recipe versions. `Review the plan` opens the same editor with the Collection's
complete prepared template. If an editable draft already exists, the user
chooses whether to add to it or start the next plan. Saving remains explicit.

## Existing Product Relationship

This enhances the Meals browse and the existing Meal Plan editor. It does not
add a top-level destination, replace personal Recipes, change Meal Plan
authority, or alter Groceries. Adopted meals become ordinary household-owned
Recipe snapshots inside a plan draft.

## Buildable Slice

Must be real:

- typed Collection, template, edition, and placement contracts with validators;
- at least two publishable Collections backed by bundled Kwilt Recipes;
- deterministic weekly selection and stable shelf placement;
- a navigable Collection page with reversible choose-some state;
- prepared-plan and choose-some handoff into Meal Planning;
- copy-on-adoption provenance and candidate deduplication;
- explicit active-draft conflict handling;
- metadata-only learning events and automated logic/component tests.

Can be thin or temporary:

- editorial records authored directly in TypeScript;
- bundled Recipe artwork used for Collection cards and heroes;
- two alternating editions instead of a remote publishing service;
- Andrew-only qualitative dogfood notes instead of an in-product survey.

Intentionally excluded:

- remote CMS, targeting, push, dwell-time personalization, live price claims,
  user-authored Collections, and automatic post-cook taste inference.

## Release Channel

`Local build`, followed by TestFlight only after Simulator and signed-device
review. This lets the visual rhythm, back navigation, temporary selection, and
active-draft recovery be evaluated with real Meals data before wider exposure.

## Brand-Goodwill Guardrails

- Cards look like editorial invitations, not ads.
- Each page explains why meals are doable without a fabricated difficulty
  score.
- The app never claims a plan exists until the user saves it.
- Budget language remains qualitative unless price evidence is present.
- Cuisine framing stays factual and modest in this first release.

## Reversibility

All publishing data is bundled and referenced through one edition resolver.
Removing placements hides the feature without migrating or deleting household
data. Adopted plans retain Recipe snapshots and origin metadata but no live
dependency on the Collection or template.

## Permanent Product Threshold

Keep and expand the system when dogfood shows that people open Collections,
select or adopt meals, materially review the draft, and reach a finalized plan
without confusing editorial suggestions for household decisions. If pages are
admired but do not produce plan reviews, improve makeability evidence and the
selection transition before increasing promotion frequency.
