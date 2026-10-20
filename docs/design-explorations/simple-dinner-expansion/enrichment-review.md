# Simple dinner enrichment review

The expansion compiler deliberately does not invent review approval. Editorial source modules must first be integrated into the canonical catalog; all 200 IDs DI331–DI530 are required by preparation.

## Local preparation and compilation

```sh
node scripts/recipe-enrichment/simple-dinners/prepare.mjs scripts/recipe-enrichment/simple-dinners/prepared.json
node --test scripts/recipe-enrichment/simple-dinners/*.test.mjs
node scripts/recipe-enrichment/simple-dinners/assemble.mjs scripts/recipe-enrichment/simple-dinners/prepared.json scripts/recipe-enrichment/simple-dinners/reviews.json scripts/recipe-enrichment/simple-dinners/parser-resolutions.json scripts/recipe-enrichment/simple-dinners/authoring.json
node scripts/recipe-enrichment/simple-dinners/compile.mjs scripts/recipe-enrichment/simple-dinners/prepared.json scripts/recipe-enrichment/simple-dinners/authoring.json scripts/recipe-enrichment/simple-dinners/compiled.json
```

Preparation writes canonical recipes, parsed ingredient drafts, instruction audits, and twenty ten-recipe manifests. It grants no approvals. `authoring.json` is an object keyed by roster ID using the existing batch-compiler authoring contract, plus these review fields:

- `sourceRecipeHash`: hash captured in the source review receipt when that recipe was reviewed; assembly rejects absent or stale receipt hashes and never mints approval from the current source. Editing recipe text invalidates review.
- `cookingReview`: explicit approved decision and substantive desk-review rationale. This is not kitchen-test evidence.
- `ingredientReview`: every position must have `accept: true` or a patch, plus a line-specific rationale. Low-confidence parsed lines require corrected patches and reviewed confidence, not blanket acceptance.
- `scalingReview`: explicit rule for every ingredient, with `scalingRationale` explaining quantity treatment and equipment/timing implications.
- `equipmentNeeds` and `equipmentAnnotations`: every tool maps to an exact phrase in a specific instruction.
- `history`: at least two distinct real source URLs supporting the bounded original-composition claim. Do not invent regional heritage.
- `instructionAuditRationale`: required if audit warnings remain. Blocking findings cannot be waived.
- `reviewedAt`, commerce decision, cost tier, difficulty, and origin follow existing contracts.

Do not supply a published hero until there is an actual uploaded file, reviewed dimensions, and `mediaReview` containing `reviewedAt` and `uploadReceipt`. Missing media stays `missing`; overall enrichment stays `in_progress`, and site publication stays `pending`. These states do not prevent completed desk review from being preserved.

## Integration and publication

Root agent owns merging `compiled.json` into the existing seed. Use `mergeReviewedRecords` from the existing enrichment pipeline so mismatched canonical hashes or duplicate entries fail. Do not replace older recipe entries as part of this append.

`buildSources` in `scripts/recipe-images/pipeline.mjs` preserves reviewed ingredient scaling and canonical content hashes. Existing generation and QA actions invoke APIs and must not be used for this request. Images must come from the built-in image-generation tool, be inspected, then use the existing Codex-image ingestion path. Importing/publishing and authenticated hosted readback remain separate root-owned gates.

## Current proof

Fourteen focused assembler/compiler regressions passed after observed failures: missing/stale reviews, missing line decisions/scaling rationale, ungrounded equipment, unresolved low-confidence parsing, fake published-media state, ambiguous instruction completion, and ingredient identity/quantity bypasses. No backend mutation or image API call was performed by this tooling lane. Source recipe completion, substantive 200-recipe receipts, uploaded media, and hosted readback are separate prerequisites; do not infer them from this test result.

Preparation also accepts one or more quoted `path#EXPORT_NAME` arguments after output path, to prepare an author module before all 200 recipes are integrated. Partial files are progress artifacts, not full-expansion proof. Parser resolutions are hash-bound and must be inspected again when source changes.

## Independent desk-review findings

The enrichment lane read ingredient lists and ordered methods for all 200 initial drafts, independent of the author receipts. The following issues were sent back to authors rather than hidden by automated approval:

- Sequential simmer, bake, batch-fry, and rest stages exceeded several advertised times. Authors extended honest budgets; one egg-curry method switched to explicitly purchased cooked rice to eliminate sequential saucepan reuse.
- Missing curry water, a dressing split after it had already been mixed, and fixed shaping counts at larger yields required source corrections.
- Runtime ingredient scaling does not rewrite cooking instructions. Authors replaced fixed divided quantities with proportions or separately measured purpose-specific ingredient lines, preserved per-piece sizes, and removed misleading fixed total counts.
- Ingredient parsing loses container nouns and does not recognize pints. Explicit structured corrections retain can/package/bag/jar sizes and counts; tomato pints become two cups. The actual app renderer was checked to produce `2 cans (15 ounces) black beans, drained` for the corrected two-batch example.
- Noodle-boiling water is a vessel quantity, not food yield. It receives a fixed vessel rule. False low-confidence findings on cutlet thickness and ready-to-use pastry require explicit parser review.
- Receipt extraction initially misclassified rice vinegar as a starch and corn tortillas as frozen vegetables. Authors corrected those rationale categories. Equipment extraction initially matched `pot` inside `potatoes`; the compiler now rejects partial-word matches, with an observed red/green regression.

These are desk reviews, not kitchen trials. They improve internal coherence and disclose estimates; they do not establish taste or measured preparation-time results.

A 200-record compilation passed the actual app schema parser, but independent code review found that the assembler could copy an old unhashed review onto changed source, batch manifests could omit recipes, and equipment lists could omit essential vessels. That output is blocked from integration until the source-bound receipt and equipment recheck completes.

The first two defects now have observed red/green regressions: assembly requires the receipt's own matching source hash; compilation requires exact unique catalog coverage and source hashes in the batches. The independent reviewer reran all 14 focused tests and found no remaining logic blocker. Each author is rereading current recipe sources, checking every essential vessel/appliance, and binding the receipt hash only after that review. Any resulting source edits require new preparation and parser-resolution review before recompilation.


## Final source-bound compilation

The four authors reread all 200 current recipes and saved `sourceRecipeHash` plus individual `sourceRecheckRationale` in their receipts. Every named essential vessel/appliance was cross-checked after this pass; DI332 includes its sheet pan, oven, and saucepan. Exact action phrases also ground implicit mixing vessels and hot-water sources. DI352's comparison to an oven-baked crust is intentionally not an oven requirement. DI371's optional toaster/microwave is explicitly optional.

The final compilation contains 200 records and passed the application's actual enrichment parser. All 2,211 ingredient lines are reviewed with quantities, units and concepts; scaling audit reports zero unclassified or partial recipes; instruction audit reports zero blockers and 194 heuristic warnings across 131 recipes, with desk-review rationales preserved. Fourteen focused regressions pass. The independent code reviewer confirmed the hash-binding and batch-coverage fixes.

The earlier integration block is resolved for this rebuilt source-bound artifact. Images are still missing in this tooling output; parent-owned image ingestion may attach genuine reviewed uploads. No backend mutation, hosted readback, kitchen testing or image generation occurred in this lane. The parent still owns integration verification and publication.

## Hosted equipment preparation

Prepared ten insert-only SQL transactions at `/tmp/kwilt-dinner-equipment-1.sql` through `-10.sql`, covering 20 recipes each in roster order. The 200 source-matched seed records contain 449 equipment requirements: 448 required and one preferred (DI371's explicitly optional toaster oven or microwave). Batch row counts are 45, 46, 51, 58, 50, 49, 39, 38, 36, and 37.

Each generated need is tied to an exact, unique, whole-word annotation in its canonical instruction. SQL locks the publication/version, requires withdrawn publication, version 2, matching publication/version canonical hashes, and zero existing equipment. It compares the stored instruction with the complete canonical instruction before using that stored text as evidence; confidence 1 denotes exact source grounding, not kitchen-test confidence. Search text uses the reviewed label without optional qualification; no substitute is invented. SQL inserts requirements only and checks the count before commit. It does not update published content or activate recipes. Preparation ran against the current seed and canonical source; execution and hosted verification remain parent-owned.
