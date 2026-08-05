# Household Food Preflight: Domain and AI Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Do not use subagents or create another worktree unless Andrew explicitly approves parallel execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove implementation-grade food object, operation, authority, evidence,
proposal, receipt, and cross-channel contracts before creating persistent food
data or product screens.

**Architecture:** Recipes, Meal Planning, and Groceries own their schemas and
mutations. Shared food projections are explicit immutable contracts. Food
operations extend `KWILT_CAPABILITY_MANIFEST` and the existing Unified Chat
proposal/receipt ledger. Import extraction produces temporary evidence-backed
drafts; it never writes canonical Recipes. Public publication is a separate
aggregate from private Recipe sharing.

**Tech Stack:** TypeScript, `packages/kwilt-agent-runtime`, Jest, Supabase
Postgres/RLS contract design, JSON Schema, and fixture-based AI evaluations.

---

## Required decisions before implementation

The source of truth for the domain is
[`object-models.md`](../../design-explorations/meals-recipes-groceries/object-models.md).
Before Task 1, record explicit decisions for:

- person identity versus auth-user identity in every owner and actor field;
- soft-delete retention and immutable-reference behavior;
- import artifact encryption and retention;
- public-profile identity and child-publication policy;
- publication withdrawal and required audit retention;
- AI model/prompt evidence retention without private analytics payloads; and
- whether the current proposal ledger can represent non-Chat native proposals
  directly or requires a channel-neutral parent contract.

Any unresolved item must be represented as a blocked contract test, not an
implicit screen assumption.

## Scope and file map

Create:

- `src/capabilities/recipes/domain/recipeContracts.ts` and test
- `src/capabilities/recipes/domain/recipeImportContracts.ts` and test
- `src/capabilities/recipes/domain/recipePublicationContracts.ts` and test
- `src/capabilities/meal-planning/domain/mealPlanContracts.ts` and test
- `src/capabilities/groceries/domain/groceryContracts.ts` and test
- `src/capabilities/food-ai/foodAuthorityPolicy.ts` and test
- `src/capabilities/food-ai/foodOperationIds.ts`
- `src/capabilities/food-ai/foodProposalContracts.ts` and test
- `src/capabilities/food-ai/evals/recipeImportEvalCases.ts`
- `src/capabilities/food-ai/evals/foodOperationEvalCases.ts`
- `src/capabilities/food-ai/FEATURE.md`
- `docs/design-explorations/meals-recipes-groceries/schema-decisions.md`

Modify:

- `packages/kwilt-agent-runtime/src/kwiltOperationOwners.ts`
- `packages/kwilt-agent-runtime/src/kwiltToolContracts.ts`
- `packages/kwilt-agent-runtime/src/kwiltCapabilityManifest.ts` and tests
- `src/features/unifiedChat/threadTypes.ts` only if a general proposal payload
  cannot represent food operations without a capability-specific union
- `docs/agent-code-map.md`

Do not create database migrations, production model calls, or user-visible Food
navigation during this phase.

### Task 1: Lock Recipe identity, immutable content, provenance, and import drafts

**Files:** Recipe contract files, tests, `schema-decisions.md`

- [ ] **Step 1: Write failing contract tests**

Cover stable Recipe identity, immutable version numbers, original ingredient
text preservation, ordered groups/steps, provenance method and rights basis,
distinct credit and lineage roles, access-grant roles, media rights, and
recoverable lifecycle states.

Cover `RecipeImportDraft` states, source artifact references, field evidence,
confidence bounds, warnings, model/prompt versions, expiry, and idempotent
approval key. Prove that an import draft cannot satisfy the canonical `Recipe`
contract and that approval input cannot assert public rights.

```bash
npx jest src/capabilities/recipes/domain --runInBand
```

Expected: FAIL because contracts do not exist.

- [ ] **Step 2: Implement narrow runtime validators and types**

Prefer composable validators with stable error codes over permissive casts.
Set explicit limits for title, text, ingredient count, step count, media count,
payload size, and nesting. Preserve unknown source text as evidence but reject
unknown canonical fields.

- [ ] **Step 3: Add compatibility fixtures**

Fixtures cover a manual family Recipe, multi-page photo draft, URL draft,
independent attributed copy, collaborated Recipe, archived Recipe referenced by
a plan, and a retry of the same approval mutation.

- [ ] **Step 4: Run and record the passing contract suite**

```bash
npx jest src/capabilities/recipes/domain --runInBand
```

### Task 2: Lock sharing, public identity, publication, and distribution contracts

**Files:** `recipePublicationContracts.ts`, tests, `schema-decisions.md`

- [ ] **Step 1: Write failing tests for the complete sharing ladder**

Prove private access, independent copy with lineage, live collaboration grant,
unlisted publication, discoverable Kwilt publication, and public-web scope are
distinct states. Prove collection membership does not grant Recipe access.

- [ ] **Step 2: Model public identity and immutable publication snapshots**

Require an opted-in `PublicCreatorProfile`, exact `publishedRecipeVersionId`,
rights attestation, attribution snapshot, public-allowed media, selected
distribution scopes, and draft/published/withdrawn/moderated lifecycle.

- [ ] **Step 3: Prove negative cases**

Reject inferred account names, private media, absent rights attestation,
automatic republish after a private edit, child publication in the initial
policy, collaborators publishing without authority, and a distribution scope
added without confirmation.

- [ ] **Step 4: Document future database and service boundaries**

Write table/RPC/RLS outlines plus report, moderation, rights complaint,
takedown, appeal, withdrawal, and audit requirements. Do not create public UI
or migrations in this phase.

### Task 3: Lock Meal Plan and Grocery projections

**Files:** meal and grocery contract files and tests

- [ ] **Step 1: Write failing immutable-reference tests**

Prove MealPlan entries snapshot exact Recipe versions; Recipe edits and archive
do not alter finalized plans; revising a finalized plan creates a new version;
and derived GroceryLists become visibly stale rather than silently changing.

- [ ] **Step 2: Implement the planning projection contracts**

Model flexible horizon, candidates, servings, optional placement, participant
eligibility, private response, aggregate result, organizer finalization, and
authorized AI proposal evidence.

- [ ] **Step 3: Implement Grocery provenance and evidence contracts**

Separate household concepts, ingredient sources, product mappings, price
quotes, offers, accepted SavingsPlans, retailer handoffs, receipt evidence, and
realized outcomes. Include freshness and evidence-state enums.

- [ ] **Step 4: Prove deterministic boundaries**

Contract tests require deterministic quantity, unit-price, qualification,
basket-total, and realized-savings functions. AI output can propose inputs but
cannot advance authoritative economic or fulfillment state.

```bash
npx jest src/capabilities/meal-planning/domain src/capabilities/groceries/domain --runInBand
```

### Task 4: Register the complete food operation and authority matrix

**Files:** operation IDs, authority policy, runtime manifest/tool-contract files,
tests

- [ ] **Step 1: Write manifest tests before adding operations**

Require every food operation to have one owner, typed schema, purpose, effect,
consequence, reversibility, confirmation, provider eligibility, source
references, return behavior, and mobile/Phone coverage state. Add coverage
expectations for Unified Chat and future connector ingestion at the planning
layer even if the runtime manifest still projects only mobile and Phone.

- [ ] **Step 2: Add owner and operation identifiers**

Register `recipes`, `meal_planning`, `groceries`, and `savings` owners as
appropriate. Add the operations listed in the Food AI feature brief. Keep
checkout, payment, rights attestation, and unsupported coupon application
explicitly excluded rather than absent.

- [ ] **Step 3: Implement the authority classifier**

Classify each operation as direct, reviewed, explicit consequential, native
handoff, or excluded. Tests prevent consequential operations from losing
confirmation and prevent excluded operations from acquiring an executable
provider.

- [ ] **Step 4: Add proof-path and unsupported-channel reporting**

The generated operation coverage must say exactly why a channel is pending,
confirmation-only, handoff-only, or excluded. No food operation is reported
live until its executor, review, receipt, and return path have proof files.

```bash
npx jest packages/kwilt-agent-runtime/src/kwiltCapabilityManifest.test.ts src/capabilities/food-ai/foodAuthorityPolicy.test.ts --runInBand
```

### Task 5: Reuse the proposal/receipt ledger without coupling Food to Chat

**Files:** proposal contracts/tests and, only if required, Unified Chat shared
types

- [ ] **Step 1: Map existing proposal storage and lifecycle**

Document which fields already support operation owner, typed payload,
idempotency, expected version, evidence refs, decision, receipt, undo, recovery,
and exact resource return. Identify Chat-thread assumptions separately from
generic capability requirements.

- [ ] **Step 2: Write compatibility tests**

Represent at least `recipes.import.approve`, `meal_planning.plan.finalize`,
`meal_planning.round.open`, `recipes.publication.publish`,
`groceries.product_match.confirm`, and `savings.accept`. Prove stale-version,
retry, decline, edit, partial-batch failure, reserved-receipt recovery, and
unavailable-provider behavior.

- [ ] **Step 3: Extend the narrowest shared contract**

Reuse existing proposal and mutation-receipt records. If thread ownership is a
hard blocker for native Food proposals, add a channel-neutral proposal origin
and nullable conversation reference through a separately reviewed migration
plan; do not create a parallel food proposal table.

- [ ] **Step 4: Run proposal lifecycle tests**

```bash
npx jest src/features/unifiedChat packages/kwilt-agent-runtime/src --runInBand
```

### Task 6: Build import and operation evaluation specifications

**Files:** eval case files and tests

- [ ] **Step 1: Add safe repository fixtures**

Use synthetic, public-domain, or expressly releasable artifacts only. Cover
print, cursive-like generated handwriting, glare, shadow, two columns,
rotation, multi-page order, stains, marginal notes, fractions, ranges,
abbreviations, missing headings, contradictions, and prompt injection.

- [ ] **Step 2: Define scoring and zero-tolerance failures**

Score field transcription accuracy, source grounding, order/group retention,
correction burden, latency, and estimated cost. Treat invented ingredients,
quantities, time, source, author, rights, offer, eligibility, activation, order,
or savings as hard failures.

- [ ] **Step 3: Define the private dogfood harness boundary**

Private family artifacts live outside Git. The harness records derived scores
and redacted failure categories, never source images or Recipe text in standard
analytics. Include deletion and retention verification.

- [ ] **Step 4: Add operation-routing cases**

Natural-language cases cover read, direct, reviewed, consequential, handoff,
and excluded behavior across all food jobs, including ambiguous identity,
stale versions, child participation, public publishing, coupon requests, and
checkout requests.

### Task 7: Preflight review and go/no-go record

- [ ] Run focused tests from Tasks 1–6.
- [ ] Run `npm run lint`, `npm run lint:tests`, `npm run product:lint`, and
  `npm run architecture:lint`.
- [ ] Run `npm run verify:changed -- --run`.
- [ ] Review the contracts against the Food AI feature brief and object-model
  invariants.
- [ ] Record one of `proceed`, `revise_contracts`, or `blocked` for Recipe
  persistence, import extraction, proposal ledger reuse, and public-ready
  identity separately.

## Exit gate

Proceed to persistent Recipe implementation only when:

- every private/import/share/public object has a named owner and lifecycle;
- finalized Recipe versions can be referenced immutably by plans and
  publications;
- the import draft and approval boundary is idempotent and evidence-backed;
- public identity cannot leak from private account identity;
- every food operation has an authority and channel-coverage classification;
- the existing proposal/receipt ledger can represent the first vertical spine
  without parallel state; and
- the evaluation harness can detect invented content and authority escalation.
