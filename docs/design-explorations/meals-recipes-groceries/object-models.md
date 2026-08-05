# Household Food Domain Model

Status: architecture decision draft\
Last updated: August 5, 2026

## Why this document exists

The first food exploration identified the right capability boundaries, but its
initial objects were not sufficiently rigorous for AI import, collaboration,
public attribution, or distribution across Kwilt apps. This document locks the
aggregate boundaries and invariants that must be proven in contract tests before
database migrations or screens are built.

The central rule is that **private knowledge, collaboration, and public
publication are different authority domains**. A `visibility = public` column
on `Recipe` cannot safely represent all three.

## Aggregate map

```text
Private recipe aggregate
  Recipe
    -> current RecipeVersion
    -> RecipeAccessGrant
    -> RecipeCredit
    -> RecipeLineage
    -> RecipeMediaAsset

Import workspace
  RecipeImportDraft
    -> source artifacts
    -> extracted fields and confidence
    -> review decisions
    -> approved Recipe + RecipeVersion

Public distribution aggregate
  PublicCreatorProfile
    -> RecipePublication
         -> one immutable RecipeVersion snapshot
         -> publication credits and media rights
         -> reports, moderation, and withdrawal state

Planning and execution
  MealPlan -> immutable RecipeVersion snapshots
  GroceryList -> ingredient provenance -> product/price/offer evidence
```

## Recipe aggregate

### `Recipe`

`Recipe` is the stable private identity and administrative root. It does not
contain mutable ingredient or instruction arrays.

```ts
type Recipe = {
  id: string;
  ownerPersonId: string;
  currentVersionId: string;
  lifecycle: 'active' | 'archived' | 'deleted';
  createdAt: string;
  updatedAt: string;
};
```

Invariants:

- Every Recipe begins person-owned and private.
- Exactly one person is the administrative owner. Collaboration is expressed
  through grants, not co-ownership ambiguity.
- Deletion is recoverable for a retention window and cannot delete versions
  referenced by finalized plans, independent copies, or publications.
- Household membership never creates implicit read access.

### `RecipeVersion`

Every approved content change creates an immutable version.

```ts
type RecipeVersion = {
  id: string;
  recipeId: string;
  version: number;
  title: string;
  description: string | null;
  yieldQuantity: number | null;
  yieldUnit: string | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  notes: string | null;
  createdByPersonId: string;
  createdAt: string;
  contentHash: string;
};
```

Ingredients and instructions are normalized child rows of a version. The
original ingredient display line remains authoritative even when parsing
succeeds.

```ts
type RecipeIngredientLine = {
  id: string;
  recipeVersionId: string;
  position: number;
  groupLabel: string | null;
  originalText: string;
  quantityMin: number | null;
  quantityMax: number | null;
  unit: string | null;
  ingredientConcept: string | null;
  preparation: string | null;
  optional: boolean;
  parseConfidence: number | null;
};

type RecipeInstructionStep = {
  id: string;
  recipeVersionId: string;
  sectionLabel: string | null;
  position: number;
  text: string;
};
```

### Provenance, credit, and lineage

These records answer different questions and must not be collapsed:

- `RecipeProvenance`: where this content entered Kwilt—manual, URL, photo,
  voice, independent copy, licensed catalog—and its source URL, source title,
  source author, import time, rights basis, and source content hash.
- `RecipeCredit`: who should be acknowledged and in what role—author,
  contributor, family source, adapted from, or imported from. Credit may point
  to a private person, an opted-in public profile, or a literal source label.
- `RecipeLineage`: which immutable Recipe version this independent Recipe was
  copied, forked, or adapted from. A copy has its own owner and edit history.

The user's name is never made public merely because a private credit points to
their person record.

### Access grants

```ts
type RecipeAccessGrant = {
  id: string;
  recipeId: string;
  granteePersonId: string;
  role: 'viewer' | 'contributor' | 'maintainer';
  status: 'pending' | 'active' | 'revoked' | 'expired';
  grantedByPersonId: string;
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};
```

Relationship is eligibility for an invitation, not authorization to the
Recipe. Maintainers may create versions but cannot transfer ownership, alter
public identity, or publish without separate authority.

### Collections and media

`RecipeCollection` is a named organizer with explicit membership and recipe
references. It does not transfer ownership or expand access to its Recipes.

`RecipeMediaAsset` stores the asset owner, storage reference, source and rights
basis, attribution, alt text, and whether public distribution is allowed. A
photo that is valid inside a private import may still be ineligible for public
publication.

## Import workspace

`RecipeImportDraft` is a temporary proposal, not a Recipe. This distinction is
essential because OCR and model extraction are uncertain.

```ts
type RecipeImportDraft = {
  id: string;
  ownerPersonId: string;
  method: 'url' | 'photo' | 'scan' | 'text' | 'voice' | 'email';
  sourceArtifactRefs: string[];
  sourceMetadata: Record<string, unknown>;
  extractedRecipe: unknown;
  fieldEvidence: Array<{
    fieldPath: string;
    sourceRef: string;
    confidence: number;
    warning: string | null;
  }>;
  modelVersion: string | null;
  promptVersion: string | null;
  state: 'extracting' | 'needs_review' | 'approved' | 'discarded' | 'expired';
  createdAt: string;
  expiresAt: string;
};
```

Approval creates the first canonical Recipe version in one idempotent
capability mutation. The approval receipt records user corrections without
retaining private source images longer than the declared retention policy.

Import invariants:

- The model may transcribe and structure evidence; it may not invent missing
  ingredients, quantities, cooking times, authors, or rights.
- Low-confidence and contradictory fields are visible and directly editable.
- The user can compare an extracted field with its source crop or source text.
- The draft retains original order, grouping, marginal notes, and the literal
  ingredient line even when structured parsing is incomplete.
- URL and image content is untrusted input and cannot grant tool authority.

## Sharing and publication ladder

Kwilt deliberately supports increasingly consequential steps:

1. **Private:** visible only to the owner and explicit grantees.
2. **Send a copy:** creates an independently owned Recipe with lineage and
   attribution.
3. **Collaborate:** grants bounded access to one authoritative private Recipe.
4. **Unlisted publication:** a revocable link to a reviewed version snapshot.
5. **Kwilt catalog publication:** discoverable across selected Kwilt apps.
6. **Public web publication:** a separately selected distribution scope, never
   implied by catalog publication.

Sharing never implies publication. Publication never exposes the private
Recipe aggregate or its collaborators.

### `PublicCreatorProfile`

A public profile is an explicit public identity separate from the person's
private account and household identity. It contains a chosen public name,
avatar, short bio, and status. The publisher chooses whether and how it is
attached; Kwilt never derives it from an account name.

Child accounts cannot create a public profile or publish in the first release.
A future policy may allow adult-reviewed publication, but it requires a
separate child-safety decision.

### `RecipePublication`

```ts
type RecipePublication = {
  id: string;
  recipeId: string;
  publishedRecipeVersionId: string;
  publicSlug: string;
  publisherPublicProfileId: string;
  state: 'draft' | 'unlisted' | 'published' | 'withdrawn' | 'moderated';
  distributionScopes: Array<
    'kwilt_mobile' | 'kwilt_desktop' | 'kwilt_web' | 'public_web'
  >;
  rightsAttestation: 'original' | 'authorized' | 'licensed' | 'public_domain';
  license: string | null;
  attributionSnapshot: unknown;
  mediaAssetIds: string[];
  publishedAt: string | null;
  withdrawnAt: string | null;
};
```

Publication invariants:

- A publication points to one exact immutable Recipe version. Private edits do
  not silently alter public content.
- Publishing a new version requires preview and explicit confirmation.
- The user, not AI, attests rights and chooses the public identity,
  attribution, media, and distribution scopes.
- Cross-Kwilt apps consume the publication projection through a stable public
  identifier; they never read private Recipe rows.
- Withdrawal removes discovery and new access while preserving the minimum
  audit and lineage records required for safety and attribution.
- Public publication requires reporting, moderation, rights-complaint,
  takedown, and appeal operations before it can launch.

## Meal Planning

`MealPlan` is a stable planning aggregate with immutable versions. Each entry
references an exact Recipe version or contains a plain meal note. Finalization
creates a projection for Groceries; later Recipe edits do not rewrite it.

AI recommendations are `MealPlanProposal` records tied to the plan version and
authorized evidence used. They do not mutate candidates, open invitations, or
finalize a plan until the appropriate capability operation is approved.

`MealChoiceResponse` remains private to its participant and authorized
organizers. AI receives only the minimum permitted response evidence and must
not expose one participant's private reasoning to another.

## Groceries, products, and economic evidence

`GroceryList` versions retain a source reference for every derived item:
Recipe version and ingredient line, plan entry, manual addition, or household
request. User corrections are durable evidence for future suggestions but do
not silently rewrite the source Recipe.

The following remain separate objects:

- `GroceryItem`: the household concept and required quantity.
- `ProductMapping`: a reviewed mapping from a concept to a retailer product.
- `PriceQuote`: provider, location, product, amount, unit basis, and freshness.
- `Offer`: qualification, activation, expiration, stacking, and evidence state.
- `SavingsPlan`: immutable accepted recommendations and predicted arithmetic.
- `RetailerHandoff`: what Kwilt prepared, provider acknowledgement, and status.
- `ReceiptEvidence`: user-provided or provider-authoritative observed outcome.
- `SavingsOutcome`: itemized realized result derived from receipt evidence.

AI can explain and rank evidence. Deterministic code owns quantity conversion,
unit price, qualification, basket totals, and realized-savings arithmetic. No
model-generated statement can upgrade `observed`, `eligible`, `activated`,
`ordered`, or `saved` evidence states.

## Cross-object invariants to test first

- A finalized plan continues to render after a Recipe is edited, archived, or
  independently copied.
- A public publication does not change when its private Recipe changes.
- Revoking a Recipe grant does not delete a recipient's independent copy.
- Collection membership does not grant Recipe access.
- Household membership does not grant Recipe, plan, response, grocery, or
  retailer-account access.
- Import approval is idempotent and cannot create duplicate Recipes on retry.
- Every AI mutation produces a capability-owned proposal or completion receipt
  with evidence references and the effective version.
- No retailer or savings state advances without provider or receipt evidence
  at the required authority level.
- Account switching clears private cached food projections before the next
  identity renders.

## Decision

These contracts are release-one architecture even though public catalog
publication is not release-one scope. Building immutable versions, provenance,
credits, lineage, grants, public identity separation, and publication snapshots
later would require unsafe migrations and ambiguous ownership. The first
release implements the private/import subset but proves forward-compatible
contract tests before UI construction.
