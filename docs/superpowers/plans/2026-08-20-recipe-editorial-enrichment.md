# Canonical Recipe Quality and Public-Site Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring all 500 Kwilt-authored Recipes to one canonical quality bar: easier-to-follow instructions, complete preparation equipment, bounded geographic origin, sourced history, publication metadata, and review-gated hero imagery shared by native Kwilt and the public recipe site.

**Architecture:** Improve the immutable Recipe version first, because equipment annotations, editorial review, and image briefs are pinned to its content hash. Store version-scoped editorial facts in a validated enrichment record keyed by roster ID plus source Recipe hash. Generate the public site projection from those canonical sources. Keep reviewed products and retailer listings in a separate shared commerce catalog referenced by stable equipment category IDs; keep presentation and bounded analytics surface-owned. Render geographic data with real native/web map components, never generated cartography.

**Tech Stack:** TypeScript, Expo/React Native, Next.js, Node.js ESM, Jest, Deno, Supabase, `react-native-maps`, source-controlled JSON review artifacts.

---

## Data ownership

| Owner | Fields |
|---|---|
| `RecipeVersion` | Title, description, yield, prep/cook time, ingredients, sectioned instructions, granular cues, notes, specialized equipment. These change how food is cooked and create a new immutable version. |
| Catalog metadata | Category, cuisine, tier, inactive time. These already drive discovery and elapsed time. |
| Version-scoped enrichment | Cost tier, difficulty, complete equipment needs and exact instruction annotations, origin/region/map, history and sources, hero-image state and alt text. |
| Derived public projection | Total time, scalable instruction quantities, JSON-LD, public slug, published image dimensions. |
| Shared commerce catalog | Versioned equipment reviews, products, retailer listings, published picks, evidence freshness, substitutes, and trade-offs. |
| Surface-owned presentation | Disclosure placement, retailer handoff presentation, bounded analytics, and native/web layout. |

The app and site may join commerce through a canonical `reviewCategoryId`, but a Recipe remains complete when no published review or retailer listing exists. Tagged URLs are resolved at handoff time and never become Recipe metadata.

## Instruction quality bar

Each Recipe should normally have 4–12 top-level phases, with short section labels only when they aid scanning. A phase may contain 1–4 ordered cues; this is an audit range, not a reason to create noisy micro-steps.

Each cooking transition should answer the relevant parts of:

1. What action is taken, with which ingredient or mixture?
2. In what vessel and at what heat or appliance setting?
3. For approximately how long?
4. What observable cue—color, texture, temperature, aroma, volume, or resistance—shows readiness?
5. What happens next: rest, drain, hold, serve, chill, or combine?
6. Is there a food-safety boundary or recurring failure mode worth naming?

Avoid “cook until done,” ambiguous pronouns, hidden parallel work, late ingredient preparation, and paragraphs that combine unrelated stages. Preserve useful sensory judgment; granularity should not become robotic.

## Definition of done

- Exactly 500 roster IDs pass the Recipe contract and instruction audit.
- Every Recipe has a final content hash and one reviewed enrichment record matching it.
- Every Recipe has cost/difficulty, equipment preflight, bounded origin/map data, two substantive history paragraphs, directly supporting HTTPS sources, and factual hero alt text.
- Every equipment annotation matches one exact phrase in one final instruction.
- Every Recipe has one review-gated hero image or an explicitly blocked image state. Generated images contain no maps, flags, globes, text, or decorative cultural stereotypes.
- Native and public web consume the same canonical cooking and enrichment data.
- Recipe publication contains no private household data or affiliate destinations; commerce is joined from its separately published catalog.
- Desk review, kitchen validation, tests, Simulator/browser proof, and production proof remain separately labeled.

---

### Task 1: Lock the cross-repo schema and ownership boundary

**Files:**
- Modify: `src/capabilities/recipes/data/editorialRecipeCatalog.ts`
- Modify: `src/capabilities/recipes/data/recipeEditorialEnrichment.ts`
- Modify: `src/capabilities/recipes/data/recipeEditorialEnrichment.test.ts`
- Modify: `/Users/andrewwatanabe/kwilt-site/lib/publicRecipes.ts`
- Replace: `/Users/andrewwatanabe/kwilt-site/lib/publicRecipeEditorial.ts`
- Modify: `/Users/andrewwatanabe/kwilt-site/scripts/sync-public-recipes.mjs`

- [ ] Add failing tests requiring canonical `costTier`, `difficulty`, origin/history/equipment export, and exclusion of affiliate/private fields.
- [ ] Extend `RecipeEditorialEnrichment` with:

```ts
costTier: '$' | '$$' | '$$$';
difficulty: 'Easy' | 'Moderate' | 'Advanced';
```

- [ ] Replace hand-maintained site editorial records with an export compiled from the canonical catalog and reviewed enrichment seed. Fail on missing or stale hashes.
- [ ] Run:

```bash
npm test -- --runInBand src/capabilities/recipes/data/recipeEditorialEnrichment.test.ts
cd /Users/andrewwatanabe/kwilt-site && npm test -- lib/publicRecipes.test.ts lib/publicRecipeEditorial.test.ts
```

Expected: both repositories agree on recipe-owned fields; no affiliate data enters canonical Recipe JSON.

### Task 2: Build a deterministic instruction-quality audit

**Files:**
- Create: `scripts/recipe-enrichment/instruction-audit.mjs`
- Create: `scripts/recipe-enrichment/instruction-audit.test.mjs`
- Modify: `scripts/recipe-enrichment/catalog.mjs`
- Modify: `package.json`

- [ ] Write red tests covering ambiguous completion language, missing doneness cues, multi-stage paragraph density, missing technique-critical time/temperature, late preparation, duplicate steps, and broken equipment phrases.
- [ ] Implement a report with `rosterId`, source hash, phase/cue counts, blocking findings, warnings, and research evidence. It reports; it does not rewrite.
- [ ] Add `recipe-enrichment:instruction-audit` and run:

```bash
node --test scripts/recipe-enrichment/instruction-audit.test.mjs
npm run recipe-enrichment:instruction-audit
```

Expected: exactly 500 Recipes represented and a truthful baseline finding count.

### Task 3: Refine all instructions before final enrichment

**Files:**
- Modify: `src/capabilities/recipes/data/starterRecipeBatch001.ts` through `starterRecipeBatch093.ts`
- Modify: `src/capabilities/recipes/data/compileEditorialRecipe.ts`
- Modify: `src/capabilities/recipes/domain/recipeInstructionPhases.ts`
- Test: `src/capabilities/recipes/data/starterRecipeCatalog.test.ts`
- Test: `src/capabilities/recipes/domain/recipeInstructionPhases.test.ts`

- [ ] Add catalog-wide assertions for ordered phases/cues, no blank or duplicate cues, and zero blocking audit findings.
- [ ] Review 20–30 Recipes at a time by category and technique family. Compare ingredients, timing, notes, research signals, failure risks, and current instructions. Use Codex plus direct web research, not the OpenAI API research worker.
- [ ] Author readable full phase text for print/web and explicit cue arrays for Cook Mode. Use labels such as `Prepare`, `Cook`, `Bake`, `Assemble`, or `Finish` only when useful.
- [ ] After each wave run:

```bash
node --test scripts/recipe-enrichment/instruction-audit.test.mjs
npm test -- --runInBand src/capabilities/recipes/data/starterRecipeCatalog.test.ts src/capabilities/recipes/domain/recipeInstructionPhases.test.ts
```

- [ ] Regenerate final hashes only after all instruction waves pass. Any enrichment whose hash changed becomes `needs_revalidation`; never silently retain “reviewed.”

### Task 4: Research and review recipe-owned metadata

**Files:**
- Modify: `src/capabilities/recipes/data/recipeEditorialEnrichment.seed.json`
- Add: `scripts/recipe-enrichment/reviewed-batches/YYYY-MM-DD-<range>.json`
- Modify: `scripts/recipe-enrichment/pipeline.mjs`
- Test: `scripts/recipe-enrichment/pipeline.test.mjs`
- Test: `src/capabilities/recipes/data/recipeEditorialEnrichment.seed.test.ts`

- [ ] Track `pending`, `researched`, `needs_revalidation`, `reviewed`, and `blocked` independently for instructions, equipment, origin/history, and imagery.
- [ ] Prefer institutions, government/tourism authorities, universities, archives, specialist organizations, and strong food journalism. Use blogs mainly for method evidence. Preserve uncertainty for disputed, regional, and diasporic origins.
- [ ] For each final hash, author cost/difficulty, meaningful preparation equipment, exact annotations, bounded origin/region, coordinates and ISO country IDs, two history paragraphs, supporting sources, and hero alt text.
- [ ] Validate and merge each wave:

```bash
node scripts/recipe-enrichment/pipeline.mjs merge scripts/recipe-enrichment/reviewed-batches/<batch>.json /tmp/recipe-enrichment-merged.json
node scripts/recipe-enrichment/pipeline.mjs validate
node scripts/recipe-enrichment/pipeline.mjs coverage
```

Expected: reviewed count rises only for hash-current records. A research draft is never equivalent to editorial review.

### Task 5: Render actual maps on both surfaces

**Files:**
- Modify: `src/capabilities/recipes/components/RecipeOriginStory.tsx`
- Modify: `src/capabilities/recipes/components/RecipeOriginStory.test.tsx`
- Modify: `/Users/andrewwatanabe/kwilt-site/components/recipes/RecipeOriginMap.tsx`
- Modify: `/Users/andrewwatanabe/kwilt-site/lib/recipeOriginMap.test.ts`

- [ ] Test coordinate ordering, scale, country IDs, regional multi-marker cases, accessibility labels, and non-interactive embedding.
- [ ] Use `react-native-maps` in Kwilt and the existing geographic web component on the site. Never reuse generated recipe art as a map.
- [ ] Run native and site map tests, then visually inspect single-country, regional, and cross-border cases in the owned Simulator and at phone/desktop browser widths.

### Task 6: Generate imagery from final cooking truth

**Files:**
- Modify: `supabase/functions/_shared/recipeImagePipeline.ts`
- Modify: `supabase/functions/_shared/__tests__/recipeImagePipeline_deno_test.ts`
- Modify: `scripts/recipe-images/pipeline.mjs`
- Modify: `src/capabilities/recipes/data/catalogMediaOverlay.ts`

- [ ] Pin jobs to final hashes and build briefs from final ingredients, instructions, origin, serving form, and alt text. Reject stale jobs.
- [ ] Reject maps, globes, flags, labels, watermarks, ingredient mismatches, implausible serving forms, and cultural stereotypes.
- [ ] Run cost-bounded, review-gated image waves. Image generation may use the Edge Function OpenAI secret; the no-API decision applies to research. Never auto-publish.
- [ ] Report `missing`, `queued`, `editorial_review`, `approved`, `published`, `rejected`, and `blocked` separately.

### Task 7: Publish one parity projection

**Files:**
- Modify: `src/capabilities/recipes/data/starterRecipeCatalog.ts`
- Modify: `src/capabilities/recipes/screens/RecipeHomeScreen.tsx`
- Modify: `/Users/andrewwatanabe/kwilt-site/scripts/sync-public-recipes.mjs`
- Modify: `/Users/andrewwatanabe/kwilt-site/lib/publicRecipes.generated.json`
- Modify: `/Users/andrewwatanabe/kwilt-site/app/(site)/recipes/[slug]/page.tsx`

- [ ] Export only reviewed, hash-current data. Derive total time and JSON-LD from the final Recipe version.
- [ ] Derive `instructionQuantityPhrases` from validated ingredient/instruction matches; retain authored exceptions only for ambiguity.
- [ ] For representative Recipes, assert parity of title, yield, times, ingredients, instructions, equipment, origin, history, sources, and image across native and web.

### Task 8: Prove the shared commerce boundary with one trusted pick

**Files:**
- Create: `src/capabilities/recipes/domain/recipeCommerceCatalog.ts`
- Create: `src/capabilities/recipes/domain/recipeCommerceCatalog.test.ts`
- Modify: `src/capabilities/recipes/domain/recipeEditorialPicks.ts`
- Modify: `src/capabilities/recipes/components/RecipeEditorialPickCard.tsx`
- Modify: `src/capabilities/recipes/components/RecipeAffiliateDisclosureGuide.tsx`
- Create: `supabase/migrations/*_recipe_commerce_catalog.sql`
- Create: `supabase/tests/recipe_commerce_catalog.sql`

- [x] Normalize equipment categories, review versions, products, retailer listings, and review picks as separately addressable objects.
- [x] Keep ASINs on retailer listings and resolve direct/tagged URLs only at the approved handoff boundary.
- [x] Reject withdrawn or expired reviews, unsupported capacity, optional equipment, and instruction-grounded requirements that already carry an ordinary substitute.
- [x] Explain how many Kwilt Recipes use the equipment and show the no-purchase substitute plus a material trade-off before Amazon.
- [x] Seed one offline-safe product projection matching the normalized Supabase contract.
- [x] Apply the commerce migration to the linked production project with explicit authorization, then execute the rollback-only SQL/RLS assertions. Production migration `20260820192204_recipe_commerce_catalog` is applied; all assertions passed and test rows were rolled back.
- [x] Verify linked migration history, five RLS-enabled commerce tables, one policy per table, read-only anonymous access to the current published projection, and one seeded category/review/product/listing/pick. Anonymous inserts remain denied.

### Task 9: Completion and integration gates

- [ ] Run focused gates:

```bash
node --test scripts/recipe-enrichment/*.test.mjs scripts/recipe-images/*.test.mjs
npm test -- --runInBand src/capabilities/recipes
npm run recipe-enrichment:validate
npm run recipe-enrichment:coverage
```

- [x] Run Kwilt Tier 2 once: `npm run verify:changed -- --run --base 32e3c838`.
- [ ] In `kwilt-site`, run `npm test`, `npm run lint`, and `npm run build`.
- [ ] Record source/contract proof, Codex editorial review, kitchen-test state, image state, Simulator proof, browser proof, deployment proof, and production observation independently.

---

## Current lane status

- Worktree: `/Users/andrewwatanabe/Kwilt/.worktrees/recipe-data-imagery-parity`
- Branch/base: `codex/recipe-data-imagery-parity` at `32e3c838`
- API research worker: disabled; 34 API drafts remain unreviewed and 456 queued rows are inert.
- Enrichment present: 13/500, subject to revalidation after instruction hashes stabilize.
- Published reviewed hero images represented: 10/500.
- Real native map source and focused tests exist; Simulator visual proof has not run from this worktree.
- Nothing in this lane is committed, pushed, merged, or published from the worktree.
