# Recipe catalog scale audit

Date: 2026-08-20  
Worktree: `/Users/andrewwatanabe/Kwilt/.worktrees/recipe-catalog-scale-audit`  
Branch: `codex/recipe-catalog-scale-audit`  
Base: `fd618bef` (`origin/main`)  
Integration target: `main`

## Decision

The 500-Recipe foundation is real, and the image-generation lane should be
preserved. The system is **not yet ready to declare all 500 Recipes at the
current Kwilt Site quality bar**.

The strongest existing pieces are the canonical 500-record publication set,
immutable version/hash boundary, source-reviewed starter corpus, image job
lifecycle, and review-gated commerce model. The incomplete pieces are the
instruction-quality gate, structured ingredient data, cross-surface editorial
schema, editorial coverage, image review/publication throughput, and shared
commerce coverage.

The right operating model is to use Codex for 20 source-controlled batches of
25 Recipes. Do not restart the existing image pipeline and do not run the
editorial OpenAI API worker. Finish and hash cooking truth first, then approve
enrichment and existing imagery against that final hash.

## Audience and job-flow frame

- Audience: `audience-aspirational-family-organizers`
- Persona: Maya
- Hero JTBD: `jtbd-move-the-few-things-that-matter`
- Job flow: `job-flow-maya-feed-household-with-less-work`
- Most directly affected steps:
  - Step 2, make the recipe trustworthy — current documented score 2.
  - Step 3, recognize whether it fits tonight — current documented score 1.
  - Step 7, prepare a plausible short list — current documented score 2.
  - Step 10, compile one correct list — current documented score 3.
  - Step 15, prepare before cooking — current documented score 1.

This catalog program improves the food cycle only if Recipe truth continues
through Meal Plan, Groceries, and cooking. Recipe count by itself is not the
unit of value.

## Current evidence

### Canonical cooking corpus

| Measure | Current state |
| --- | ---: |
| Canonical Recipes | 500 |
| Published Supabase catalog records | 500 |
| Published immutable versions | 500 |
| Ingredient lines | 6,876 |
| Instruction steps | 2,410 |
| Recorded research comparisons | 1,524 across 574 domains |
| Kitchen-test state | 500 `desk-reviewed`; 0 cooked or repeat-validated |
| Structured ingredient quantities | 0 of 6,876 |
| Structured ingredient units | 0 of 6,876 |
| Structured ingredient concepts | 0 of 6,876 |
| Structured ingredient preparation | 0 of 6,876 |
| Instruction section labels in Supabase | 0 of 2,410 |

The corpus has strong breadth and internal coherence, but the live recipe data
is still mostly authored strings. Meal planning can snapshot those strings and
Groceries can parse them later, but pantry-fit, dietary-fit, scaling,
ingredient matching, and deterministic list compilation cannot yet rely on a
complete canonical ingredient model.

The current source has four to seven top-level instructions per Recipe. The
median step is 32 words; six steps exceed 60 words and four infer more than four
cues. At the audit base, the deterministic instruction-quality audit named in
the existing plan had not been implemented. This lane now adds the first
hash-pinned report. Its baseline finds two blocking ambiguous-completion cases
(`BR037` and `BR041`) and 563 review warnings across 338 Recipes. Warnings are
triage signals, not automatic rewrite instructions.

### Editorial enrichment

| Measure | Current state |
| --- | ---: |
| Reviewed origin/history records | 13 of 500 |
| Records with at least two history sources | 8 of 13 |
| Records with reviewed equipment | 6 of 500 |
| Pending equipment review | 494 of 500 |
| Source-controlled Codex batch | AP001–AP003 |
| API research queue | 456 queued, 34 researched, worker disabled |

The manual Codex path already exists: manifest, hash validation, reviewed batch
artifacts, and merge validation. It is the preferred path. This lane has fixed
the stale coverage assertion and added the instruction audit. Before batch
work, it still needs three repairs:

1. Add `costTier`, `difficulty`, and explicit per-section review states to the
   canonical enrichment schema.
2. Allow a reviewed record to be deliberately replaced when its source hash
   changes; the library function supports replacement, but the CLI does not.
3. Generate the Kwilt Site projection from canonical Recipe plus enrichment
   data instead of hand-maintaining a second editorial record.

### Recipe images

The prior image lane is present in this branch and live. No cherry-pick or file
copy is required.

| Measure | Current state |
| --- | ---: |
| Version-pinned image jobs | 1,500; no stale recipe/version links found |
| Published Recipe heroes | 11 |
| Recipes whose best state is editorial review | 104 |
| Recipes whose candidates are all rejected | 110 |
| Recipes in scheduled future waves | 275 |
| Raw candidates awaiting editorial review | 128 |
| Raw rejected candidates | 535 |
| Raw future-wave jobs | 825 |
| Future release waves | 100 Recipes on Aug 26, 100 on Sep 2, 75 on Sep 9 |

Generation is not the immediate blocker. Human review and canonical
publication are. Existing approved imagery should be revalidated after final
instruction hashes; a valid image may be retained rather than regenerated.
Images must remain independently review-gated.

The bundled fallback is not acceptable as final imagery: only 12 of the 24
allowed atlas slots are used, and one generic slot represents 280 Recipes.

### Kwilt Site parity

The live public site currently serves 10 Recipe routes. Its source projection
also contains exactly 10 Recipes. The local `kwilt-site` checkout has substantial
uncommitted Recipe and unrelated marketing work, so it was audited read-only.

The current Site construct includes:

- public slugs and Recipe JSON-LD;
- prep, cook, inactive, total time, yield, ingredients, instructions, and notes;
- serving scaling plus hand-authored instruction quantity phrases;
- cost and difficulty;
- origin map, history, and sources;
- exact instruction equipment annotations;
- reviewed equipment choices and Amazon handoffs;
- hero image URL, alt text, and dimensions.

This is not yet a shared projection. The Site sync script hard-codes ten media
records, the Site owns a hand-maintained editorial map, and the app enrichment
schema does not yet contain cost, difficulty, or instruction-scaling phrases.
Supabase publications currently have no `public_web` distribution scope; the
Site is supplied by its static generated file instead.

### Amazon and equipment commerce

The production and app commerce catalog has one current category, one product,
one Amazon listing, and one published pick: a food processor pilot. The dirty
Site checkout separately contains nine published equipment review categories,
20 picks, and 16 Amazon product destinations.

That Site work should become a reviewed import into one shared commerce catalog,
not a second authority. Every Recipe should be audited for equipment coverage,
but a product card should appear only for a real, supported equipment gap. A
forced affiliate card on all 500 Recipes would contradict the accepted trust
boundary and make complete Recipes feel like storefronts.

The desired coverage statement is therefore:

> Every Recipe has reviewed equipment needs and can resolve a current product
> review where a purchase would materially help; Recipes with ordinary or
> credible no-purchase substitutes remain commerce-free.

### Production schema blocker

`src/capabilities/recipes/data/recipeRepository.ts` queries
`kwilt_recipe_equipment_requirements` and calls
`save_kwilt_recipe_with_equipment`. The repository contains migration
`20260817034820_persist_recipe_equipment_requirements.sql`, but the linked Kwilt
Supabase project has neither the migration history entry nor the table.

This can break personal Recipe refresh/save and, because personal Recipe and
hosted-media refresh run in one `Promise.all`, can also prevent newly published
heroes from being applied in the app. Deploying and verifying this migration is
the first production repair, separate from the 500-Recipe editorial work.

## Readiness matrix

| Capability | Verdict | Evidence / blocker |
| --- | --- | --- |
| Keep 500 stable Recipe identities | Ready | 500 unique published roster IDs and immutable versions. |
| Use Codex instead of the editorial API | Ready with tooling repair | Manual reviewed batches and hash validation exist; replacement/status workflow is incomplete. |
| Audit instruction quality at scale | Baseline ready | Hash-pinned command exists; 2 blocking findings and 563 warnings need Recipe review. |
| Supply Meal Plan and Groceries | Partial | Exact string snapshots work; canonical structured ingredients are empty. |
| Publish correct Recipe hero images | Pipeline ready, review incomplete | 1,500 current jobs; 11 published; 128 candidates await review. |
| Match current Site editorial constructs | Not ready | 13 app enrichments versus 10 Site records; schemas and authorities differ. |
| Publish all 500 on the Site | Not ready | Live and generated Site projection contain 10. |
| Recommend exact Amazon products | Pilot only | App/database: 1 category/pick. Dirty Site: 9 categories/20 picks. |
| Refresh live hosted images in app | Blocked at production boundary | Expected equipment table/RPC is absent and shares the refresh transaction boundary. |

## Recommended sequence

### Gate 0 — stabilize the lane

1. [x] Fix the stale enrichment coverage assertion.
2. [x] Add the deterministic instruction audit.
3. [ ] Add the structured-ingredient audit.
4. [ ] Add the missing enrichment fields and deliberate hash-replacement workflow.
5. [ ] Apply and verify the missing equipment migration in a separately authorized
   production step.
6. [ ] Create one canonical Site export and parity test before increasing coverage.

### Gates 1–20 — Codex batches of 25

For each roster-ordered batch:

1. Review ingredients, instructions, timing, failure risks, and existing sources.
2. Rewrite only when the cooking truth is materially clearer; then lock the
   final Recipe hash.
3. Parse ingredient quantity, unit, concept, preparation, and optionality with
   a review exception for genuinely ambiguous lines.
4. Review cost, difficulty, equipment, exact instruction annotations, bounded
   origin, two substantive history paragraphs, and at least two directly
   supporting sources.
5. Validate current image candidates against the final Recipe; retain, reject,
   or regenerate through the existing review gate.
6. Map equipment categories to current shared reviews and exact retailer
   listings only where a product recommendation is justified.
7. Export the same reviewed record to app and Site, then run focused parity,
   Meal Plan snapshot, Grocery compilation, and image checks.

Each batch has a review receipt. “Researched,” “desk-reviewed,” “image
approved,” “published,” and “kitchen-tested” remain separate states.

## Verification from this audit

- Recipe Jest slice: 169 suites / 531 tests passed.
- Recipe image/editorial Deno slice: 18 tests passed.
- Kwilt Site Recipe/editorial/equipment slice: 34 tests passed against the
  dirty local Site checkout.
- Enrichment validator: 13 records valid.
- Enrichment coverage regression: failed first because the expected pilot
  counts were not updated after AP001–AP003; now passes with the current 13/6
  coverage baseline.
- Instruction audit logic: 5 tests passed; the full 500-Recipe baseline is 2
  blocking findings and 563 warnings.
- Environment: dependency installation succeeded under Node 25.9.0, but the
  repository declares Node `>=22.13.0 <23`; completion gates should run under
  Node 22.

No Simulator, signed-device, kitchen, TestFlight, or production user-flow proof
was performed in this audit.
