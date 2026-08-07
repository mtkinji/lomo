# Diverge: Global Recipe Catalog

## Axis of variation

Where the canonical OOTB recipe lives, how public participation attaches to it, and how imagery moves from 24 generic tiles toward 500 recipe-specific photographs.

## Alternative A: Publish the Core

Import every OOTB meal as a system-owned `Recipe` with immutable `RecipeVersion` children, then create one published `RecipePublication` per canonical version. Mobile reads a stable public projection; private user Recipes remain behind their existing RLS. Hearts reference the publication, ratings and comments attach to the publication/version, and **Make my version** copies the exact published version into a new private Recipe with lineage.

Images use a review queue keyed to publication version. Priority combines discovery placement, editorial-collection membership, missing/mismatched artwork severity, category/cuisine coverage, and aggregated opens/plans/cooks. Approved assets publish into a public CDN bucket and a publication-media join; atlas art remains fallback until coverage is complete.

- Audience/persona fit: strong; Maya sees one coherent cookbook and can quietly make it hers.
- Design-challenge answer: strong; canonical integrity and private adaptation use already-defined version/publication boundaries.
- System fit: extends the existing private Recipe and publication contracts rather than creating a second recipe grammar.
- Best when: the private Recipe schema can safely hold system-owned records while all public reads go through a dedicated projection.
- Fails when: client code is allowed to query system-owned private rows directly, or system ownership becomes a magic RLS exception scattered across tables.
- Four-object/capture-first stance: Food remains a capability-owned domain outside Arc/Goal/Activity/Chapter; discovery and adaptation do not block capture or require planning setup.
- Anti-pattern check: pass; no feed, leaderboard, default-public household data, or engagement-ranked home.

## Alternative B: Separate Kwilt Cookbook

Create a dedicated public catalog aggregate—`CatalogRecipe`, `CatalogRecipeVersion`, catalog ingredients/instructions/media—and leave private `Recipe` untouched. Hearts, ratings, comments, and private forks point from the public catalog id into their owning aggregates. A fork transforms catalog content into a private Recipe and records cross-aggregate lineage.

Images ship in complete editorial waves: first all meals in current discovery shelves and Collections, then complete cuisines/categories, then the long tail. Each wave must meet a cookbook contact-sheet review before publication.

- Audience/persona fit: strong; public and private authority are unmistakable.
- Design-challenge answer: strong on safety and editorial operations; slightly weaker on reuse because two content schemas must stay behaviorally equivalent.
- System fit: larger extension with duplicate validation, scaling, export, search, planning, and grocery adapters.
- Best when: public catalog content is expected to diverge substantially from private Recipe capabilities or serve multiple products with a distinct editorial model.
- Fails when: duplicated recipe semantics drift, causing catalog meals and private versions to scale, plan, or compile groceries differently.
- Four-object/capture-first stance: same as Alternative A; making a private version remains immediate and optional.
- Anti-pattern check: pass, but the extra catalog model risks administrative complexity invisible to users yet expensive to maintain.

## Alternative C: Edition-first Catalog Service

Store the 500 recipes in database authoring tables, then publish immutable catalog editions as server-generated read documents optimized for mobile. Clients download one edition, cache it, and overlay person-specific heart/rating/fork state. Comments load separately on Recipe Home. New recipes, corrections, and imagery appear only in the next promoted edition.

Images are generated on demand from observed exposure and missing-artwork queues, then bundled into the next edition. This gives excellent rollback and offline consistency but delays individual corrections and image publication.

- Audience/persona fit: good; the cookbook is fast and stable, but freshness is less immediate.
- Design-challenge answer: strong on graceful offline behavior and release control, weaker on “update without an app release” immediacy.
- System fit: introduces a publishing/compiler service and edition cache beside existing repositories.
- Best when: catalog scale grows far beyond 500 and cross-product clients need reproducible snapshots.
- Fails when: edition compilation becomes another deployment ceremony or person-state overlays drift from the canonical ids.
- Four-object/capture-first stance: pass; editions are delivery infrastructure, not a user-managed plan object.
- Anti-pattern check: pass; deterministic editions avoid ambient mutation, though stale public evidence must be labeled and bounded.

## Image-priority strategies inside the alternatives

### Visibility-first

Generate the meals users see first: Recommended, active Collections, top shelf positions, then high-open/high-plan meals. Fastest perceptual improvement, but risks over-serving already-visible cuisines.

### Coverage-first

Select a balanced matrix across category, cuisine, dietary pattern, total time, and visual form. Produces a credible cookbook contact sheet, but some prominent wrong images remain longer.

### Complete-story waves

Finish coherent sets—one editorial Collection or shelf at a time—so no user enters a polished story and falls back to generic tiles halfway through. Strongest editorial quality, slower breadth.

The strongest queue combines all three rather than choosing one globally: a hard floor for coverage, a wave-completion bonus, and a visibility/demand score within those constraints.
