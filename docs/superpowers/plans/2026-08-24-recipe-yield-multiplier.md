# Recipe Yield and Multiplier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Do not use subagents or create a worktree unless Andrew explicitly requests parallel implementation and approves the worktree details required by `AGENTS.md`.

**Goal:** Make authored recipe yield authoritative and replace target-serving scaling with explicit `1×`, `2×`, and `3×` recipe-size multipliers across the Kwilt app, catalog publication path, Meal Plan/Groceries/Cook Mode, and public recipe pages.

**Architecture:** Keep `yieldQuantity` and `yieldUnit` on the immutable RecipeVersion as the physical output of one authored batch. Introduce a multiplier domain value that always defaults to `1`, plus reviewed per-ingredient scaling rules that make non-original multipliers fail closed at the recipe level. Carry the multiplier independently from diner/portion planning through snapshots, groceries, and Cook Sessions; keep the existing database `serving_scale` field only as a compatibility storage alias until old clients are retired.

**Tech Stack:** React Native + Expo, TypeScript, Jest, `@kwilt/food-core`, Supabase/Postgres/Deno Edge Functions, Next.js 14, React, Node test runner, static public-recipe projection.

---

## Locked product and compatibility decisions

- A RecipeVersion's `yieldQuantity` and `yieldUnit` describe what `1×` makes: for example, `1 loaf`, `24 halves`, `8 sandwiches`, or `4 servings`.
- “Serving size” is not introduced. Nutrition serving size remains a separate future concern.
- The UI never treats household diner count as recipe yield. Diner assignment and planned portions remain Meal Plan concerns.
- Every recipe opens at `1×`, including recipes whose authored yield unit is `servings`.
- The first supported multiplier set is exactly `1×`, `2×`, and `3×`. Smaller and fractional batches are excluded from this slice because they create avoidable discrete-count and impractical-measurement failures.
- A recipe exposes `2×` and `3×` only when every ingredient line has a reviewed scaling rule and every repeated instruction quantity needed for cooking has reviewed scaling evidence.
- Scaling is recipe-level and fail-closed. Kwilt never shows a partially scaled ingredient list.
- `multiply` scales the reviewed primary quantity, range, and parenthetical equivalent. `fixed` preserves authored text for vessel-, garnish-, taste-, or as-needed quantities. `review_required` disables non-original multipliers for the whole recipe.
- Times, temperatures, doneness cues, difficulty, cost tier, and JSON-LD remain authored. A scaled view warns that cookware, batch count, and timing may need adjustment.
- Existing finalized Meal Plans, compiled Grocery lists, and Cook records remain historical. Legacy snapshots without an explicit multiplier derive a ratio only when their yield unit is exactly `servings`; all other legacy snapshots resolve to `1×` and require review before a new Grocery compilation.
- Hosted catalog data is authoritative when complete; bundled data remains the last-known-good fallback. Both projections must expose the same scaling contract before the feature is considered released.
- The public site remains a read-only projection and never gains access to private household recipes.

## Checkout and commit discipline

The current `/Users/andrewwatanabe/Kwilt` checkout is `main` at `3231c3d3` with unrelated Money work. The current `/Users/andrewwatanabe/kwilt-site` checkout is `main` at `0b315253` with unrelated Reddit documentation. Before executing each task, re-run `git status --short --branch` in the relevant repository, reread every affected file from disk, and stage only the files named by that task. Never use `git add -A` for this plan unless Andrew separately authorizes a whole-checkout commit.

Execute the Kwilt repository tasks first. The site projection must be regenerated from a committed Kwilt source SHA, so site work follows the canonical-data commit rather than reading an uncommitted catalog state.

### Task 1: Record the corrected product and UI contract

**Files:**
- Modify: `docs/feature-briefs/global-recipe-catalog.md`
- Create: `docs/design-explorations/recipe-yield-multiplier/00-ui-contract.md`
- Modify: `/Users/andrewwatanabe/kwilt-site/docs/design-explorations/public-recipe-serving-scaling/06-ui-contract.md`

- [ ] **Step 1: Add the yield-and-multiplier refinement to the accepted feature brief**

Append this section before `## Success signal` in `docs/feature-briefs/global-recipe-catalog.md`:

```markdown
### Authored yield and recipe size

Every immutable RecipeVersion owns one authored yield: a positive quantity plus its physical output unit. Recipe Home opens at `1×` and says what that batch makes. Household diner count, Meal Plan portions, and nutrition serving size are separate concepts and never overwrite authored yield.

Recipe scaling uses reviewed whole-batch multipliers (`1×`, `2×`, `3×`). A Recipe may expose multipliers above `1×` only when every ingredient and repeated instruction quantity has an explicit reviewed scaling rule. Unknown or unsafe rules fail closed to the authored `1×` recipe; Kwilt never partially scales a recipe.

Meal Plan snapshots store diner context and recipe multiplier separately. Grocery and Cook Mode quantities derive from the stored multiplier, never from `planned portions ÷ authored yield`.
```

- [ ] **Step 2: Create the cross-surface UI contract**

Create `docs/design-explorations/recipe-yield-multiplier/00-ui-contract.md` with:

```markdown
# UI Contract: Recipe Yield and Multiplier

Job: When Maya chooses a recipe, she needs to know what one authored batch makes and deliberately choose whether to make more, without Kwilt guessing from household size.

Three-second read: `Makes <authored yield>` and current recipe size.

Primary action: choose `1×`, `2×`, or `3×` when reviewed scaling is available.

Mobile presentation: `Recipe size` row with the multiplier control and supporting text `Makes <scaled yield>`.

Public-site presentation: one compact native select reading `1× · Makes <scaled yield>`.

Unavailable state: show `Makes <authored yield>` without an enabled multiplier control. Do not expose a half-working scaler.

Changed state: show `Ingredient amounts reflect <N>×. Cookware and timing may need adjustment.`

Must not imply: number of diners, nutrition serving size, automatically scaled cooking time, automatically sufficient cookware, or a changed canonical RecipeVersion.

Accessibility: announce both multiplier and resulting yield; preserve keyboard/native-select behavior on web; make mobile decrement/increment states explicit.

Print: include `<N>× recipe · Makes <scaled yield>` and the scaled ingredient/instruction quantities. Keep canonical JSON-LD at the authored `1×` values.
```

- [ ] **Step 3: Mark the old public-site contract as superseded**

Add this directly under its title:

```markdown
> Superseded by the cross-product Recipe Yield and Multiplier contract. Public Recipe pages now choose a whole-recipe multiplier, not an arbitrary target yield.
```

- [ ] **Step 4: Run product-document validation**

Run from `/Users/andrewwatanabe/Kwilt`:

```bash
npm run product:lint
```

Expected: exit 0 with no invalid `serves:` or feature-brief front-matter references.

- [ ] **Step 5: Commit only the Kwilt product-contract files**

```bash
git add docs/feature-briefs/global-recipe-catalog.md docs/design-explorations/recipe-yield-multiplier/00-ui-contract.md
git commit -m "docs: define recipe yield multiplier contract"
```

Do not commit the site contract yet; it belongs in the later site commit.

### Task 2: Add multiplier primitives and practical quantity scaling

**Files:**
- Modify: `src/capabilities/recipes/domain/recipeScaling.ts`
- Modify: `src/capabilities/recipes/domain/recipeScaling.test.ts`
- Modify: `packages/food-core/src/index.ts`
- Modify: `packages/food-core/src/compiler.test.ts`

- [ ] **Step 1: Write regression-first multiplier tests**

Replace target-serving examples in `recipeScaling.test.ts` with tests equivalent to:

```ts
import {
  formatKitchenQuantity,
  formatScaledRecipeYield,
  multiplyRecipeQuantity,
  parseKitchenQuantity,
  RECIPE_SCALE_MULTIPLIERS,
} from './recipeScaling';

it('supports only reviewed whole-batch multipliers', () => {
  expect(RECIPE_SCALE_MULTIPLIERS).toEqual([1, 2, 3]);
});

it('multiplies a quantity and range without using diner count', () => {
  expect(multiplyRecipeQuantity({ quantity: 1.5, quantityMax: 2.25, multiplier: 2 }))
    .toEqual({ quantity: 3, quantityMax: 4.5 });
});

it('formats the physical result of a multiplier', () => {
  expect(formatScaledRecipeYield({ yieldQuantity: 1, yieldUnit: '9-by-5-inch loaf', multiplier: 2 }))
    .toBe('2 9-by-5-inch loaves');
  expect(formatScaledRecipeYield({ yieldQuantity: 24, yieldUnit: 'halves', multiplier: 3 }))
    .toBe('72 halves');
});

it('rejects arbitrary, fractional, and non-positive multipliers', () => {
  expect(() => multiplyRecipeQuantity({ quantity: 1, quantityMax: null, multiplier: 1.5 as never }))
    .toThrow('Recipe multiplier');
  expect(() => multiplyRecipeQuantity({ quantity: 1, quantityMax: null, multiplier: 0 as never }))
    .toThrow('Recipe multiplier');
});
```

- [ ] **Step 2: Run the focused test and confirm the old API cannot satisfy it**

```bash
npm test -- --runInBand src/capabilities/recipes/domain/recipeScaling.test.ts
```

Expected: FAIL because the multiplier exports do not exist.

- [ ] **Step 3: Implement the multiplier primitives**

Add this public contract to `recipeScaling.ts`, retaining the existing parsing and kitchen-fraction formatter:

```ts
export const RECIPE_SCALE_MULTIPLIERS = [1, 2, 3] as const;
export type RecipeScaleMultiplier = typeof RECIPE_SCALE_MULTIPLIERS[number];

export function isRecipeScaleMultiplier(value: unknown): value is RecipeScaleMultiplier {
  return RECIPE_SCALE_MULTIPLIERS.some((candidate) => candidate === value);
}

export function multiplyRecipeQuantity(input: {
  quantity: number | null;
  quantityMax: number | null;
  multiplier: RecipeScaleMultiplier;
}): { quantity: number | null; quantityMax: number | null } {
  if (!isRecipeScaleMultiplier(input.multiplier)) {
    throw new Error('Recipe multiplier must be 1, 2, or 3.');
  }
  if ((input.quantity !== null && input.quantity < 0) ||
      (input.quantityMax !== null && input.quantityMax < 0)) {
    throw new Error('Quantity cannot be negative.');
  }
  return {
    quantity: input.quantity === null ? null : bounded(input.quantity * input.multiplier),
    quantityMax: input.quantityMax === null ? null : bounded(input.quantityMax * input.multiplier),
  };
}

export function formatScaledRecipeYield(input: {
  yieldQuantity: number | null;
  yieldUnit: string | null;
  multiplier: RecipeScaleMultiplier;
}): string | null {
  if (!input.yieldQuantity || !input.yieldUnit?.trim()) return null;
  const quantity = bounded(input.yieldQuantity * input.multiplier);
  const unit = quantity === 1 && input.yieldUnit.endsWith('s')
    ? input.yieldUnit.slice(0, -1)
    : input.yieldUnit;
  return `${formatKitchenQuantity(quantity)} ${unit}`;
}
```

- [ ] **Step 4: Change the shared food compiler to accept a multiplier**

In `packages/food-core/src/index.ts`, replace `fromYield`/`toYield` on `GroceryCompilerLine` with `recipeScaleMultiplier`, and calculate:

```ts
const factor = line.recipeScaleMultiplier ?? 1;
```

Update `packages/food-core/src/compiler.test.ts` with:

```ts
it('scales structured quantities from an explicit recipe multiplier', () => {
  const result = buildGroceryCompilation([{
    ...line('2 onions', 'r1', 'i1'),
    recipeScaleMultiplier: 3,
  }]);
  expect(result.items[0]).toEqual(expect.objectContaining({ quantityMin: 6 }));
});
```

- [ ] **Step 5: Run focused multiplier and compiler tests**

```bash
npm test -- --runInBand src/capabilities/recipes/domain/recipeScaling.test.ts packages/food-core/src/compiler.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the pure scaling contract**

```bash
git add src/capabilities/recipes/domain/recipeScaling.ts src/capabilities/recipes/domain/recipeScaling.test.ts packages/food-core/src/index.ts packages/food-core/src/compiler.test.ts
git commit -m "feat: add recipe batch multipliers"
```

### Task 3: Add reviewed ingredient scaling rules and fail-closed assessment

**Files:**
- Modify: `src/capabilities/recipes/domain/recipeContracts.ts`
- Modify: `src/capabilities/recipes/domain/recipeContracts.test.ts`
- Modify: `src/capabilities/recipes/domain/recipeContractFixtures.ts`
- Modify: `src/capabilities/recipes/domain/recipeValidation.ts`
- Modify: `src/capabilities/recipes/domain/recipeValidation.test.ts`
- Modify: `src/capabilities/recipes/data/recipeEditorialEnrichment.ts`
- Create: `src/capabilities/recipes/data/recipeEditorialEnrichment.test.ts`
- Modify: `src/capabilities/recipes/data/compileEditorialRecipe.ts`
- Create: `src/capabilities/recipes/domain/recipeScaleAssessment.ts`
- Create: `src/capabilities/recipes/domain/recipeScaleAssessment.test.ts`

- [ ] **Step 1: Write contract tests for explicit rules and backward-safe review state**

Add tests that require these shapes:

```ts
type RecipeScalingState = 'verified' | 'unavailable' | 'review_required';

type RecipeIngredientScaleRule =
  | { kind: 'multiply' }
  | { kind: 'fixed'; reason: 'as_needed' | 'garnish' | 'to_taste' | 'vessel' | 'reviewed_other' }
  | { kind: 'review_required' };
```

The tests must prove:

```ts
expect(parseRecipeIngredientScaleRule({ kind: 'multiply' })).toEqual({ kind: 'multiply' });
expect(parseRecipeIngredientScaleRule({ kind: 'fixed', reason: 'vessel' }))
  .toEqual({ kind: 'fixed', reason: 'vessel' });
expect(parseRecipeIngredientScaleRule(undefined)).toEqual({ kind: 'review_required' });
expect(() => parseRecipeIngredientScaleRule({ kind: 'fixed', reason: 'guess' }))
  .toThrow();
```

- [ ] **Step 2: Run the new contract tests and verify failure**

```bash
npm test -- --runInBand src/capabilities/recipes/domain/recipeContracts.test.ts src/capabilities/recipes/domain/recipeValidation.test.ts src/capabilities/recipes/data/recipeEditorialEnrichment.test.ts
```

Expected: FAIL because scale rules are not modeled.

- [ ] **Step 3: Extend ingredient contracts without changing authored yield**

Add `scalingState: RecipeScalingState` to `RecipeVersion` and the editorial enrichment record. Add `scaleRule: RecipeIngredientScaleRule` to `RecipeIngredientLine` and `RecipeStructuredIngredient`. Export strict parsers from `recipeContracts.ts`; when old private/imported/cache data omits these fields, normalize the version to `review_required` and the line to `{ kind: 'review_required' }` rather than rejecting the whole recipe.

In `compileEditorialRecipe.ts`, copy the reviewed enrichment rule:

```ts
scalingState: enrichment?.scalingState ?? 'review_required',
scaleRule: structured?.scaleRule ?? { kind: 'review_required' },
```

Do not add `serves`, `servingSize`, or a household default to RecipeVersion.

- [ ] **Step 4: Write recipe-level assessment tests**

Create `recipeScaleAssessment.test.ts` with:

```ts
it('allows multipliers only when every ingredient rule is reviewed', () => {
  expect(assessRecipeScaleability([
    line({ kind: 'multiply' }),
    line({ kind: 'fixed', reason: 'as_needed' }),
  ], 'verified')).toEqual({ available: true, blockers: [] });
});

it('fails the entire recipe closed instead of partially scaling', () => {
  expect(assessRecipeScaleability([
    line({ kind: 'multiply' }),
    line({ kind: 'review_required' }),
  ], 'verified')).toEqual({
    available: false,
    blockers: ['ingredient-2'],
  });
});

it('keeps an explicitly unavailable recipe at one batch', () => {
  expect(assessRecipeScaleability([line({ kind: 'multiply' })], 'unavailable'))
    .toEqual({ available: false, blockers: ['recipe_scaling_unavailable'] });
});
```

- [ ] **Step 5: Implement the assessment as a pure function**

```ts
export function assessRecipeScaleability(
  lines: readonly RecipeIngredientLine[],
  state: RecipeScalingState,
): { available: boolean; blockers: string[] } {
  if (state !== 'verified') {
    return { available: false, blockers: [`recipe_scaling_${state}`] };
  }
  const blockers = lines
    .filter((line) => line.scaleRule.kind === 'review_required')
    .map((line) => line.id);
  return { available: blockers.length === 0, blockers };
}
```

- [ ] **Step 6: Run contract and assessment tests**

```bash
npm test -- --runInBand src/capabilities/recipes/domain/recipeContracts.test.ts src/capabilities/recipes/domain/recipeValidation.test.ts src/capabilities/recipes/data/recipeEditorialEnrichment.test.ts src/capabilities/recipes/domain/recipeScaleAssessment.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit the reviewed-rule contract**

```bash
git add src/capabilities/recipes/domain/recipeContracts.ts src/capabilities/recipes/domain/recipeContracts.test.ts src/capabilities/recipes/domain/recipeContractFixtures.ts src/capabilities/recipes/domain/recipeValidation.ts src/capabilities/recipes/domain/recipeValidation.test.ts src/capabilities/recipes/data/recipeEditorialEnrichment.ts src/capabilities/recipes/data/recipeEditorialEnrichment.test.ts src/capabilities/recipes/data/compileEditorialRecipe.ts src/capabilities/recipes/domain/recipeScaleAssessment.ts src/capabilities/recipes/domain/recipeScaleAssessment.test.ts
git commit -m "feat: require reviewed recipe scaling rules"
```

### Task 4: Produce and clear the catalog scaling audit

**Files:**
- Create: `scripts/recipe-enrichment/scaling-audit.mjs`
- Create: `scripts/recipe-enrichment/scaling-audit.test.mjs`
- Modify: `scripts/recipe-enrichment/batch-compiler.mjs`
- Modify: `scripts/recipe-enrichment/batch-compiler.test.mjs`
- Modify: `scripts/recipe-enrichment/reviewed-batches/authoring/recipe-enrichment-01.mjs`
- Modify: `src/capabilities/recipes/data/recipeEditorialEnrichment.seed.json`
- Modify: `scripts/recipe-enrichment/reviewed-batches/*.json` only through the existing batch compiler

- [ ] **Step 1: Write audit tests for the three catalog hazards already reproduced**

Create fixtures proving that the audit reports:

```js
assert.deepEqual(auditRecipe(recipe({
  yieldUnit: '9-by-5-inch loaf',
  lines: [structured('3 1/2 cups (420 grams) flour', 0.78)],
})).reasons, ['low_confidence_quantity', 'parenthetical_equivalent_unreviewed', 'scaling_rule_missing']);

assert.deepEqual(auditRecipe(recipe({
  lines: [structured('6 cups neutral oil, for frying', 0.98)],
})).reasons, ['vessel_quantity_unreviewed', 'scaling_rule_missing']);
```

- [ ] **Step 2: Run the audit test and verify failure**

```bash
node --test scripts/recipe-enrichment/scaling-audit.test.mjs
```

Expected: FAIL because the audit does not exist.

- [ ] **Step 3: Implement a deterministic audit, not an auto-approval heuristic**

The audit must emit one row per blocker with `rosterId`, `position`, `originalText`, `reason`, and current rule. It may suggest `multiply` or a fixed reason, but it must never write `reviewed` status. Treat these as blockers:

```js
const blockerReasons = {
  missingRule: 'scaling_rule_missing',
  lowConfidence: 'low_confidence_quantity',
  parenthetical: 'parenthetical_equivalent_unreviewed',
  vessel: 'vessel_quantity_unreviewed',
  instruction: 'instruction_quantity_unreviewed',
};
```

Recognize vessel/taste/as-needed language only to route review; do not use it to silently approve a rule.

- [ ] **Step 4: Extend the batch compiler to accept explicit reviewed rules**

Require authoring input shaped as:

```js
scalingReview: {
  0: { kind: 'multiply' },
  1: { kind: 'fixed', reason: 'vessel' },
}
```

The compiler must reject missing positions, extra positions, and `multiply` on a line whose structured quantity is below `0.8` confidence until that structured line is corrected.

- [ ] **Step 5: Review BA001 and the ten public-site recipes first**

Use explicit rules for `BA001`, `BR016`, `BR031`, `BR073`, `BR078`, `DI061`, `DI133`, `LU037`, `LU038`, `LU050`, and `SO011`. For BA001, correct the flour confidence only after verifying both `3 1/2 cups` and `420 grams`, mark ordinary dough quantities `multiply`, and mark bowl/pan oil `fixed: as_needed`.

- [ ] **Step 6: Generate the full 600-recipe blocker report**

```bash
node scripts/recipe-enrichment/scaling-audit.mjs --format summary
node scripts/recipe-enrichment/scaling-audit.mjs --format json > /tmp/kwilt-recipe-scaling-audit.json
```

Expected initial summary: 600 recipes represented; known blockers include 73 recipes with low-confidence quantified lines and 106 recipes with parenthetical metric equivalents. The counts overlap.

- [ ] **Step 7: Clear blockers through reviewed batches or leave the recipe explicitly unavailable**

For every reported recipe, write either complete line rules or an explicit recipe-level `scalingState: 'unavailable'` with a reviewed reason. Recompile through the existing reviewed-batch path; never hand-edit only the generated seed. The completion condition is:

```bash
node scripts/recipe-enrichment/scaling-audit.mjs --format summary
```

Expected: `600 recipes classified; 0 unclassified recipes; 0 partial-scaling recipes`.

Recipes classified `unavailable` remain correct and usable at `1×`; they do not block release.

- [ ] **Step 8: Run catalog and pipeline tests**

```bash
npm test -- --runInBand src/capabilities/recipes/data/editorialRecipeCatalog.test.ts src/capabilities/recipes/data/recipeEditorialEnrichment.seed.test.ts
node --test scripts/recipe-enrichment/batch-compiler.test.mjs scripts/recipe-enrichment/scaling-audit.test.mjs scripts/recipe-enrichment/pipeline.test.mjs
```

Expected: PASS with all 600 records classified.

- [ ] **Step 9: Commit the audit and reviewed catalog data**

```bash
git add scripts/recipe-enrichment src/capabilities/recipes/data/recipeEditorialEnrichment.seed.json src/capabilities/recipes/data/recipeEditorialEnrichment.ts src/capabilities/recipes/data/recipeEditorialEnrichment.seed.test.ts
git commit -m "data: classify catalog recipe scaling"
```

### Task 5: Render ingredient and instruction quantities from the multiplier

**Files:**
- Modify: `src/capabilities/recipes/components/RecipeIngredientList.tsx`
- Modify: `src/capabilities/recipes/components/RecipeIngredientList.test.tsx`
- Modify: `src/capabilities/recipes/domain/recipeCookCueBuilder.ts`
- Modify: `src/capabilities/recipes/domain/recipeCookCueBuilder.test.ts`

- [ ] **Step 1: Add the bread regression before changing rendering**

Add a test using BA001-equivalent lines:

```tsx
it('scales every reviewed bread quantity from one batch and keeps bowl oil fixed', () => {
  const lines = [
    reviewed('3 1/2 cups (420 grams) all-purpose flour', 3.5, 'cup', { kind: 'multiply' }),
    reviewed('2 1/4 teaspoons instant yeast', 2.25, 'teaspoon', { kind: 'multiply' }),
    reviewed('1 cup whole milk', 1, 'cup', { kind: 'multiply' }),
    reviewed('Neutral oil, for the bowl and pan', null, null, { kind: 'fixed', reason: 'as_needed' }),
  ];
  const screen = render(<RecipeIngredientList lines={lines} multiplier={2} checked={new Set()} onToggle={jest.fn()} />);
  expect(screen.getByText('7 cups (840 grams) all-purpose flour')).toBeTruthy();
  expect(screen.getByText('4 1/2 teaspoons instant yeast')).toBeTruthy();
  expect(screen.getByText('2 cups whole milk')).toBeTruthy();
  expect(screen.getByText('Neutral oil, for the bowl and pan')).toBeTruthy();
});
```

Add a second test proving that a recipe containing `review_required` renders every original line and reports scaling unavailable rather than mixing original and multiplied lines.

- [ ] **Step 2: Run the ingredient regression and verify failure**

```bash
npm test -- --runInBand src/capabilities/recipes/components/RecipeIngredientList.test.tsx
```

Expected: FAIL because the component still accepts `fromYield`/`toYield` and does not scale parenthetical equivalents.

- [ ] **Step 3: Replace target-yield rendering with reviewed multiplier rendering**

Change the public helper signature to:

```ts
export function scaledIngredientDisplay(
  line: RecipeIngredientLine,
  multiplier: RecipeScaleMultiplier,
): string
```

Rules:

```ts
if (multiplier === 1 || line.scaleRule.kind === 'fixed') return line.originalText;
if (line.scaleRule.kind !== 'multiply') return line.originalText;
```

Scale the structured primary quantity and every recognized parenthetical mass equivalent. Preserve authored concept, case, preparation, optional marker, and package-size semantics.

- [ ] **Step 4: Move Cook Cue amounts to the same helper**

Change `buildRecipeCookCues(recipe, { servings })` to `buildRecipeCookCues(recipe, { multiplier })`. Ingredient references must use the same scaled amount formatter as Recipe Home; they must not independently calculate `servings / yieldQuantity`.

- [ ] **Step 5: Run ingredient and Cook Cue tests**

```bash
npm test -- --runInBand src/capabilities/recipes/components/RecipeIngredientList.test.tsx src/capabilities/recipes/domain/recipeCookCueBuilder.test.ts
```

Expected: PASS, including the BA001 dual-measure regression.

- [ ] **Step 6: Commit shared app rendering**

```bash
git add src/capabilities/recipes/components/RecipeIngredientList.tsx src/capabilities/recipes/components/RecipeIngredientList.test.tsx src/capabilities/recipes/domain/recipeCookCueBuilder.ts src/capabilities/recipes/domain/recipeCookCueBuilder.test.ts
git commit -m "fix: scale recipe quantities by reviewed multiplier"
```

### Task 6: Replace the mobile Servings control with Recipe size

**Files:**
- Modify: `src/capabilities/recipes/components/RecipeSummaryBar.tsx`
- Create: `src/capabilities/recipes/components/RecipeSummaryBar.test.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeHomeScreen.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx`

- [ ] **Step 1: Add component regressions for loaf, halves, and unavailable scaling**

Test these visible states:

```tsx
expect(renderSummary({ yieldQuantity: 1, yieldUnit: '9-by-5-inch loaf', multiplier: 1 })
  .getByText('Makes 1 9-by-5-inch loaf')).toBeTruthy();
expect(renderSummary({ yieldQuantity: 24, yieldUnit: 'halves', multiplier: 2 })
  .getByText('Makes 48 halves')).toBeTruthy();
expect(renderSummary({ scalingAvailable: false }).queryByLabelText('Increase recipe size')).toBeNull();
```

- [ ] **Step 2: Run the new component test and verify failure**

```bash
npm test -- --runInBand src/capabilities/recipes/components/RecipeSummaryBar.test.tsx src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx
```

Expected: FAIL because the current component hardcodes `Servings` and ignores `yieldUnit`.

- [ ] **Step 3: Implement the mobile control**

Replace these props:

```ts
servings: number;
onServingsChange(value: number): void;
```

with:

```ts
multiplier: RecipeScaleMultiplier;
scalingAvailable: boolean;
yieldUnit: string | null;
onMultiplierChange(value: RecipeScaleMultiplier): void;
```

The summary row reads `Recipe size`; the value reads `1×`, `2×`, or `3×`; supporting copy reads `Makes <scaled yield>`. Decrement/increment traverse `RECIPE_SCALE_MULTIPLIERS` and expose `Decrease recipe size` / `Increase recipe size` accessibility labels.

- [ ] **Step 4: Default Recipe Home to the authored batch**

Replace:

```ts
const [servings, setServings] = useState(defaultServings);
```

with:

```ts
const [multiplier, setMultiplier] = useState<RecipeScaleMultiplier>(1);
const scaling = assessRecipeScaleability(
  projection.currentVersion.ingredients,
  projection.currentVersion.scalingState,
);
```

Do not read household default servings to initialize Recipe Home. Pass `multiplier` to ingredients, readiness, plan, and Cook actions.

- [ ] **Step 5: Preserve the current multiplier when opening downstream actions**

Add `recipeScaleMultiplier` to the Recipe Home navigation params for Readiness/Cook Mode and pass it to the Add-to-Plan sheet. Opening another recipe with `navigation.push` resets that recipe to `1×`.

- [ ] **Step 6: Run mobile UI tests**

```bash
npm test -- --runInBand src/capabilities/recipes/components/RecipeSummaryBar.test.tsx src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx
```

Expected: PASS with no `Servings` label on Recipe Home and BA001 initially showing `1× · Makes 1 9-by-5-inch loaf`.

- [ ] **Step 7: Commit the mobile recipe-size control**

```bash
git add src/capabilities/recipes/components/RecipeSummaryBar.tsx src/capabilities/recipes/components/RecipeSummaryBar.test.tsx src/capabilities/recipes/screens/RecipeHomeScreen.tsx src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx
git commit -m "feat: show authored yield and recipe size"
```

### Task 7: Preserve yield quantity and unit in manual editing and imports

**Files:**
- Modify: `src/capabilities/recipes/domain/recipeUpdateDraft.ts`
- Modify: `src/capabilities/recipes/domain/recipeUpdateSuggestion.ts`
- Modify: `src/capabilities/recipes/domain/recipeUpdateSuggestion.test.ts`
- Modify: `src/capabilities/recipes/screens/RecipeEditScreen.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeEditScreen.test.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeImportReviewScreen.tsx`

- [ ] **Step 1: Add regressions showing the current editor destroys a non-serving unit**

Add tests proving that opening and resaving `{ yieldQuantity: 1, yieldUnit: 'loaf' }` remains exactly one loaf, and importing `24 halves` preserves both fields.

```ts
expect(reviewedDataFromEditorDraft({
  ...draft,
  yieldQuantity: '1',
  yieldUnit: 'loaf',
}).yieldUnit).toBe('loaf');
```

- [ ] **Step 2: Run editor tests and verify failure**

```bash
npm test -- --runInBand src/capabilities/recipes/screens/RecipeEditScreen.test.tsx src/capabilities/recipes/domain/recipeUpdateSuggestion.test.ts
```

Expected: FAIL because the editor stores one `servings` string and always writes `yieldUnit: 'servings'`.

- [ ] **Step 3: Replace the draft serving field with yield fields**

Use:

```ts
export type RecipeUpdateDraft = {
  title: string;
  description: string;
  yieldQuantity: string;
  yieldUnit: string;
  ingredients: Array<{ id: string; originalText: string }>;
  instructions: Array<{ id: string; text: string }>;
  sourceTitle: string;
  sourceAuthor: string;
  notes: string;
};
```

Render a `Makes` field group with numeric quantity and plain-language unit. Validation requires both or neither; a positive quantity cannot be saved with a blank unit.

- [ ] **Step 4: Replace AI `set_servings` with `set_yield` while accepting cached legacy suggestions**

The new operation is:

```ts
| { kind: 'set_yield'; quantity: number; unit: string }
```

Parse legacy `{ kind: 'set_servings', value }` only at the repository boundary and normalize it to `{ kind: 'set_yield', quantity: value, unit: 'servings' }`. New prompts and schemas emit only `set_yield`.

- [ ] **Step 5: Preserve imported yield units**

In `draftToEditor`, map both values:

```ts
yieldQuantity: typeof data.yieldQuantity === 'number' ? String(data.yieldQuantity) : '',
yieldUnit: typeof data.yieldUnit === 'string' ? data.yieldUnit : '',
```

- [ ] **Step 6: Run editor/import logic tests**

```bash
npm test -- --runInBand src/capabilities/recipes/screens/RecipeEditScreen.test.tsx src/capabilities/recipes/domain/recipeUpdateSuggestion.test.ts
```

Expected: PASS; no editor save rewrites `loaf`, `halves`, or `squares` to `servings`.

- [ ] **Step 7: Commit yield-preserving editing**

```bash
git add src/capabilities/recipes/domain/recipeUpdateDraft.ts src/capabilities/recipes/domain/recipeUpdateSuggestion.ts src/capabilities/recipes/domain/recipeUpdateSuggestion.test.ts src/capabilities/recipes/screens/RecipeEditScreen.tsx src/capabilities/recipes/screens/RecipeEditScreen.test.tsx src/capabilities/recipes/screens/RecipeImportReviewScreen.tsx
git commit -m "fix: preserve authored recipe yield"
```

### Task 8: Separate Meal Plan diner context from recipe multiplier

**Files:**
- Modify: `src/capabilities/recipes/domain/mealPlanRecipeCandidate.ts`
- Modify: `src/capabilities/recipes/domain/mealPlanRecipeCandidate.test.ts`
- Modify: `src/capabilities/recipes/domain/mealPlanSelection.ts`
- Modify: `src/capabilities/recipes/domain/mealPlanSelection.test.ts`
- Modify: `src/capabilities/recipes/components/AddToMealPlanSheet.tsx`
- Modify: `src/capabilities/recipes/components/AddToMealPlanSheet.test.tsx`
- Modify: `src/capabilities/meal-planning/screens/MealPlanFinalizeScreen.tsx`
- Modify: `src/capabilities/meal-planning/screens/MealPlanFinalizeScreen.test.ts`
- Create: `src/capabilities/recipes/domain/recipeSnapshotScale.ts`
- Create: `src/capabilities/recipes/domain/recipeSnapshotScale.test.ts`

- [ ] **Step 1: Add snapshot regressions for current and legacy recipes**

```ts
expect(resolveRecipeSnapshotMultiplier({ recipeScaleMultiplier: 2 })).toEqual({ multiplier: 2, reviewRequired: false });
expect(resolveRecipeSnapshotMultiplier({ yieldQuantity: 4, yieldUnit: 'servings', selectedServings: 8 }))
  .toEqual({ multiplier: 2, reviewRequired: false });
expect(resolveRecipeSnapshotMultiplier({ yieldQuantity: 1, yieldUnit: 'loaf', selectedServings: 6 }))
  .toEqual({ multiplier: 1, reviewRequired: true });
```

- [ ] **Step 2: Run snapshot and candidate tests and verify failure**

```bash
npm test -- --runInBand src/capabilities/recipes/domain/recipeSnapshotScale.test.ts src/capabilities/recipes/domain/mealPlanRecipeCandidate.test.ts src/capabilities/recipes/components/AddToMealPlanSheet.test.tsx
```

Expected: FAIL because snapshots only contain `selectedServings`.

- [ ] **Step 3: Add the compatibility resolver**

```ts
export function resolveRecipeSnapshotMultiplier(snapshot: Record<string, unknown>): {
  multiplier: RecipeScaleMultiplier;
  reviewRequired: boolean;
} {
  if (isRecipeScaleMultiplier(snapshot.recipeScaleMultiplier)) {
    return { multiplier: snapshot.recipeScaleMultiplier, reviewRequired: false };
  }
  const yieldQuantity = Number(snapshot.yieldQuantity);
  const selected = Number(snapshot.selectedServings);
  const ratio = selected / yieldQuantity;
  if (snapshot.yieldUnit === 'servings' && isRecipeScaleMultiplier(ratio)) {
    return { multiplier: ratio, reviewRequired: false };
  }
  return { multiplier: 1, reviewRequired: snapshot.selectedServings !== undefined };
}
```

- [ ] **Step 4: Store multiplier and diner planning separately**

Change candidate options to:

```ts
{
  candidateId: string;
  recipeScaleMultiplier: RecipeScaleMultiplier;
  plannedPortions: number;
  dinerPersonIds?: string[];
  // existing exclusion fields
}
```

Store `recipeScaleMultiplier` and `plannedPortions` in `recipeSnapshot`. Continue writing legacy `selectedServings: plannedPortions` for old-client compatibility, but never use it to scale new snapshots.

- [ ] **Step 5: Update the Add-to-Plan UI**

Show two independent facts:

```text
Cooking for <N>
Recipe size <M>× · Makes <scaled yield>
```

Changing diners does not change multiplier. The sheet starts with the multiplier selected on Recipe Home. A legacy non-serving snapshot requiring review cannot proceed to a new Grocery compilation until the user confirms `1×`, `2×`, or `3×`.

- [ ] **Step 6: Keep Meal Plan dish portions semantically separate**

Meal Plan occasion `servings` fields continue representing planned portions in this slice. Rename local variables to `plannedPortions` where touched, but do not rewrite historical database columns or unrelated Meal Plan screens. Scaling code must read only `recipeScaleMultiplier`.

- [ ] **Step 7: Run Meal Plan tests**

```bash
npm test -- --runInBand src/capabilities/recipes/domain/recipeSnapshotScale.test.ts src/capabilities/recipes/domain/mealPlanRecipeCandidate.test.ts src/capabilities/recipes/domain/mealPlanSelection.test.ts src/capabilities/recipes/components/AddToMealPlanSheet.test.tsx src/capabilities/meal-planning/screens/MealPlanFinalizeScreen.test.ts
```

Expected: PASS with diner changes leaving recipe multiplier unchanged.

- [ ] **Step 8: Commit Meal Plan separation**

```bash
git add src/capabilities/recipes/domain/recipeSnapshotScale.ts src/capabilities/recipes/domain/recipeSnapshotScale.test.ts src/capabilities/recipes/domain/mealPlanRecipeCandidate.ts src/capabilities/recipes/domain/mealPlanRecipeCandidate.test.ts src/capabilities/recipes/domain/mealPlanSelection.ts src/capabilities/recipes/domain/mealPlanSelection.test.ts src/capabilities/recipes/components/AddToMealPlanSheet.tsx src/capabilities/recipes/components/AddToMealPlanSheet.test.tsx src/capabilities/meal-planning/screens/MealPlanFinalizeScreen.tsx src/capabilities/meal-planning/screens/MealPlanFinalizeScreen.test.ts
git commit -m "fix: separate recipe size from diner planning"
```

### Task 9: Make Groceries and Cook Mode consume the stored multiplier

**Files:**
- Modify: `supabase/functions/_shared/groceryCompiler.ts`
- Modify: `supabase/functions/_shared/__tests__/groceryCompiler_deno_test.ts`
- Modify: `src/capabilities/recipes/domain/recipeCookContracts.ts`
- Modify: `src/capabilities/recipes/domain/recipeCookContracts.test.ts`
- Modify: `src/capabilities/recipes/domain/recipeCookStateMachine.ts`
- Modify: `src/capabilities/recipes/domain/recipeCookStateMachine.test.ts`
- Modify: `src/capabilities/recipes/runtime/useRecipeCookSession.ts`
- Modify: `src/capabilities/recipes/data/recipeCookCache.ts`
- Modify: `src/capabilities/recipes/data/recipeCookCache.test.ts`
- Modify: `src/capabilities/recipes/data/recipeCookRepository.ts`
- Modify: `src/capabilities/recipes/data/recipeCookRepository.test.ts`
- Modify: `src/capabilities/recipes/screens/RecipeReadinessScreen.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeCookModeScreen.tsx`
- Modify: `packages/kwilt-agent-runtime/src/foodOperationContracts.ts`

- [ ] **Step 1: Add grocery regressions for the original bread failure**

```ts
Deno.test('compiles a loaf snapshot from recipeScaleMultiplier instead of planned portions', () => {
  const result = compileGroceryAuthority(fixture({
    yieldQuantity: 1,
    yieldUnit: 'loaf',
    selectedServings: 6,
    recipeScaleMultiplier: 1,
  }));
  assertEquals(result.items.find((item) => item.concept === 'milk')?.quantityMin, 1);
});
```

Add a second case with `recipeScaleMultiplier: 2` expecting two cups milk.

- [ ] **Step 2: Run the Deno regression and verify failure**

```bash
deno test supabase/functions/_shared/__tests__/groceryCompiler_deno_test.ts
```

Expected: FAIL because the compiler still feeds `selectedServings` and `yieldQuantity` into `fromYield`/`toYield`.

- [ ] **Step 3: Compile groceries with the compatibility resolver**

Read `recipeScaleMultiplier` from current snapshots. For legacy snapshots, reproduce the resolver behavior from Task 8 inside the Deno/shared boundary. Push lines into `@kwilt/food-core` as:

```ts
{
  originalText: ingredient.original_text,
  recipeVersionId,
  ingredientLineId: ingredient.id,
  planEntryId: entry.id,
  recipeScaleMultiplier: scale.multiplier,
  optional: ingredient.optional,
}
```

Throw `legacy_recipe_scale_review_required` before compiling a legacy non-serving snapshot instead of generating wrong groceries.

- [ ] **Step 4: Rename the Cook domain while preserving storage compatibility**

Use `recipeScaleMultiplier` in TypeScript contracts, cache, state machine, and agent operation contracts. Cache parsing accepts legacy `servingScale`; repository serialization maps the new property back to `servingScale` only for the existing Supabase RPC payload:

```ts
const legacyRpcSession = {
  ...session,
  servingScale: session.recipeScaleMultiplier,
};
delete (legacyRpcSession as Partial<RecipeCookSession>).recipeScaleMultiplier;
```

Document the database `serving_scale` column as a compatibility alias. Do not rename it while older installed clients still send that key.

- [ ] **Step 5: Change Readiness and Cook Mode inputs**

Replace route/prop `servings` with `recipeScaleMultiplier`. Readiness says `Recipe size 2×` and `Makes <scaled yield>`; it may separately show assigned diners when entered from Meal Plan, but never calls that value recipe servings.

- [ ] **Step 6: Run grocery and Cook tests**

```bash
deno test supabase/functions/_shared/__tests__/groceryCompiler_deno_test.ts
npm test -- --runInBand src/capabilities/recipes/domain/recipeCookContracts.test.ts src/capabilities/recipes/domain/recipeCookStateMachine.test.ts src/capabilities/recipes/data/recipeCookCache.test.ts src/capabilities/recipes/data/recipeCookRepository.test.ts src/capabilities/recipes/screens/RecipeReadinessScreen.test.tsx src/capabilities/recipes/screens/RecipeCookModeScreen.test.tsx
```

Expected: PASS, including legacy cache/RPC compatibility and the loaf grocery regression.

- [ ] **Step 7: Commit downstream multiplier propagation**

```bash
git add supabase/functions/_shared/groceryCompiler.ts supabase/functions/_shared/__tests__/groceryCompiler_deno_test.ts src/capabilities/recipes/domain/recipeCookContracts.ts src/capabilities/recipes/domain/recipeCookContracts.test.ts src/capabilities/recipes/domain/recipeCookStateMachine.ts src/capabilities/recipes/domain/recipeCookStateMachine.test.ts src/capabilities/recipes/runtime/useRecipeCookSession.ts src/capabilities/recipes/data/recipeCookCache.ts src/capabilities/recipes/data/recipeCookCache.test.ts src/capabilities/recipes/data/recipeCookRepository.ts src/capabilities/recipes/data/recipeCookRepository.test.ts src/capabilities/recipes/screens/RecipeReadinessScreen.tsx src/capabilities/recipes/screens/RecipeCookModeScreen.tsx packages/kwilt-agent-runtime/src/foodOperationContracts.ts
git commit -m "fix: propagate recipe multiplier downstream"
```

### Task 10: Publish scaling rules through the hosted catalog

**Files:**
- Create: `supabase/migrations/20260825010000_recipe_ingredient_scaling_rules.sql`
- Modify: `supabase/functions/recipe-image-admin/index.ts`
- Modify: `scripts/hosted-recipe-catalog-contract.test.mjs`
- Modify: `src/capabilities/recipes/data/catalogMediaRepository.test.ts`

- [ ] **Step 1: Add hosted-projection contract tests**

Require every projected ingredient to contain one exact JSON object:

```js
scaleRule: { kind: 'multiply' }
```

or:

```js
scaleRule: { kind: 'fixed', reason: 'vessel' }
```

or:

```js
scaleRule: { kind: 'review_required' }
```

- [ ] **Step 2: Run the contract tests and verify failure**

```bash
node --test scripts/hosted-recipe-catalog-contract.test.mjs
npm test -- --runInBand src/capabilities/recipes/data/catalogMediaRepository.test.ts
```

Expected: FAIL because hosted ingredients omit scaling rules.

- [ ] **Step 3: Add the immutable ingredient rule column**

The migration adds version-level review state and ingredient-level rules:

```sql
alter table public.kwilt_recipe_versions
  add column scaling_state text not null default 'review_required'
  check (scaling_state in ('verified', 'unavailable', 'review_required'));

alter table public.kwilt_recipe_ingredients
  add column scale_rule jsonb not null default '{"kind":"review_required"}'::jsonb,
  add constraint kwilt_recipe_ingredients_scale_rule_valid check (
    scale_rule = '{"kind":"multiply"}'::jsonb
    or scale_rule = '{"kind":"review_required"}'::jsonb
    or (
      scale_rule->>'kind' = 'fixed'
      and scale_rule->>'reason' in ('as_needed','garnish','to_taste','vessel','reviewed_other')
      and jsonb_object_length(scale_rule) = 2
    )
  );
```

Update the admin-only catalog importer to write `scaling_state` and every reviewed line rule. Update `list_kwilt_recipe_catalog_v2` to project version `scalingState` and ingredient `scaleRule`.

- [ ] **Step 4: Test the migration contract and repository parser**

```bash
node --test scripts/hosted-recipe-catalog-contract.test.mjs
npm test -- --runInBand src/capabilities/recipes/data/catalogMediaRepository.test.ts
```

Expected: PASS; missing or malformed hosted rules fail projection validation rather than silently enabling scaling.

- [ ] **Step 5: Run the local Supabase SQL test when available**

```bash
supabase test db supabase/tests/global_recipe_catalog_foundation.sql
```

Expected: PASS. If local Supabase is unavailable, record this as an unproved backend gate; do not replace it with an app test.

- [ ] **Step 6: Commit the hosted contract**

```bash
git add supabase/migrations supabase/functions/recipe-image-admin/index.ts scripts/hosted-recipe-catalog-contract.test.mjs src/capabilities/recipes/data/catalogMediaRepository.test.ts
git commit -m "feat: publish reviewed recipe scaling rules"
```

### Task 11: Replace public-site target yield with recipe multipliers

**Files:**
- Modify: `/Users/andrewwatanabe/kwilt-site/lib/recipeScaling.ts`
- Modify: `/Users/andrewwatanabe/kwilt-site/lib/recipeScaling.test.ts`
- Modify: `/Users/andrewwatanabe/kwilt-site/components/recipes/RecipeServing.tsx`
- Rename to: `/Users/andrewwatanabe/kwilt-site/components/recipes/RecipeScale.tsx`
- Modify: `/Users/andrewwatanabe/kwilt-site/app/(site)/recipes/[slug]/page.tsx`
- Modify: `/Users/andrewwatanabe/kwilt-site/app/(site)/recipes/recipes.module.css`
- Modify: `/Users/andrewwatanabe/kwilt-site/lib/publicRecipes.ts`
- Modify: `/Users/andrewwatanabe/kwilt-site/lib/publicRecipes.test.ts`
- Modify: `/Users/andrewwatanabe/kwilt-site/scripts/sync-public-recipes.mjs`
- Modify: `scripts/recipe-enrichment/site-export.mjs`
- Modify: `scripts/recipe-enrichment/site-export.test.mjs`

- [ ] **Step 1: Commit the canonical Kwilt source before regenerating the site projection**

```bash
git status --short --branch
git log -1 --oneline
```

Expected: all intended Kwilt tasks are committed; unrelated Money changes may remain but are not included in the source commit used for public recipe generation. If the canonical recipe data is still uncommitted, stop and commit only the recipe files before continuing.

- [ ] **Step 2: Add public-site multiplier regressions**

Replace arbitrary target-yield tests with:

```ts
assert.deepEqual(getRecipeScaleOptions(), [1, 2, 3]);
assert.equal(formatRecipeScaleOption(1, 24, 'halves'), '1× · Makes 24 halves');
assert.equal(formatRecipeScaleOption(2, 24, 'halves'), '2× · Makes 48 halves');
assert.equal(scaleIngredient(reviewedFlour, 2), '7 cups (840 grams) all-purpose flour');
assert.equal(scaleIngredient(fixedOil, 3), 'Neutral oil, for the bowl and pan');
```

Add a component/browser assertion that the old `1 halve` through `24 halves` option list is absent.

- [ ] **Step 3: Run site tests and verify failure**

```bash
cd /Users/andrewwatanabe/kwilt-site
npm test
```

Expected: FAIL because the site still exposes target yields from 1 through 24.

- [ ] **Step 4: Consolidate the site export on the reviewed projection**

Update `scripts/recipe-enrichment/site-export.mjs` to include recipe `scalingState` and `scaleRule` on every `structuredIngredient`. A public recipe remains readable at `1×` when scaling is unavailable or still requires review, but the export must not mark its multiplier control available. Replace the site's duplicate TypeScript compiler logic in `scripts/sync-public-recipes.mjs` with an invocation of the canonical export:

```js
execFileSync('node', [
  path.join(kwiltRoot, 'scripts/recipe-enrichment/site-export.mjs'),
  path.join(siteRoot, 'lib/publicRecipes.generated.json'),
], { cwd: kwiltRoot, stdio: 'inherit' });
```

Keep public recipe preservation behavior and source-commit recording.

- [ ] **Step 5: Implement multiplier-only site helpers**

Expose:

```ts
export const RECIPE_SCALE_OPTIONS = [1, 2, 3] as const;
export type RecipeScaleMultiplier = typeof RECIPE_SCALE_OPTIONS[number];

export function formatRecipeScaleOption(
  multiplier: RecipeScaleMultiplier,
  yieldQuantity: number,
  yieldUnit: string,
): string {
  return `${multiplier}× · Makes ${formatScaledYield(yieldQuantity * multiplier, yieldUnit)}`;
}
```

Scale structured ingredients according to reviewed rules, including parenthetical equivalents. Delete `PUBLIC_YIELD_MIN`, `PUBLIC_YIELD_MAX`, `getServingOptions`, and `getServingDirection`.

- [ ] **Step 6: Rename the client context and analytics event**

Rename provider/control/context symbols from `Serving` to `Scale`. State stores `multiplier`, defaulting to `1`. Use `Scale` or `CopyPlus` from Lucide instead of `UsersRound`. The select is:

```tsx
<select
  aria-label="Recipe size"
  data-recipe-multiplier={multiplier}
  value={multiplier}
  onChange={(event) => setMultiplier(Number(event.target.value) as RecipeScaleMultiplier)}
>
  {RECIPE_SCALE_OPTIONS.map((option) => (
    <option key={option} value={option}>
      {formatRecipeScaleOption(option, yieldQuantity, yieldUnit)}
    </option>
  ))}
</select>
```

Render the select only when `recipe.scalingState === 'verified'`; otherwise render static `Makes <authored yield>` copy. Track `recipe_scale_changed` with `multiplier: 2 | 3`, roster, category, surface, and placement. Do not repurpose `recipe_servings_changed`.

- [ ] **Step 7: Render scaled ingredients, instructions, and print yield**

The visible note after changing scale reads:

```text
Ingredient amounts reflect 2×. Cookware and timing may need adjustment.
```

Print CSS hides the interactive select but shows a print-only line such as `2× recipe · Makes 48 halves`. Canonical JSON-LD remains authored `1×` and is tested unchanged.

- [ ] **Step 8: Regenerate the public projection**

```bash
cd /Users/andrewwatanabe/kwilt-site
node scripts/sync-public-recipes.mjs
```

Expected: `lib/publicRecipes.generated.json` records the committed Kwilt source SHA and includes structured scaling rules for every published public recipe.

- [ ] **Step 9: Run site tests, lint, and build**

```bash
npm test
npm run lint
npm run build
```

Expected: all pass; every public recipe route statically builds.

- [ ] **Step 10: Commit only public recipe scaling files in kwilt-site**

```bash
git add components/recipes/RecipeScale.tsx components/recipes/RecipeServing.tsx 'app/(site)/recipes/[slug]/page.tsx' 'app/(site)/recipes/recipes.module.css' lib/recipeScaling.ts lib/recipeScaling.test.ts lib/publicRecipes.ts lib/publicRecipes.test.ts lib/publicRecipes.generated.json scripts/sync-public-recipes.mjs docs/design-explorations/public-recipe-serving-scaling/06-ui-contract.md
git commit -m "feat: scale public recipes by multiplier"
```

If `RecipeServing.tsx` was removed by the rename, stage that deletion explicitly with `git add -u components/recipes/RecipeServing.tsx`.

### Task 12: Verify the complete story and stage release separately

**Files:**
- Modify only if failures expose defects in files already named above
- Do not change unrelated Money or Reddit files

- [ ] **Step 1: Run focused Kwilt regression suites**

```bash
cd /Users/andrewwatanabe/Kwilt
npm test -- --runInBand \
  src/capabilities/recipes/domain/recipeScaling.test.ts \
  src/capabilities/recipes/domain/recipeScaleAssessment.test.ts \
  src/capabilities/recipes/components/RecipeIngredientList.test.tsx \
  src/capabilities/recipes/components/RecipeSummaryBar.test.tsx \
  src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx \
  src/capabilities/recipes/domain/mealPlanRecipeCandidate.test.ts \
  src/capabilities/recipes/domain/recipeSnapshotScale.test.ts \
  src/capabilities/recipes/domain/recipeCookCueBuilder.test.ts \
  packages/food-core/src/compiler.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run the one Tier 2 completion gate**

```bash
npm run verify:changed -- --run
```

Expected: PASS. Run it again only if it failed, the diff changed afterward, or the integration base changed; record the reason.

- [ ] **Step 3: Verify the catalog audit and hosted/bundled parity**

```bash
node scripts/recipe-enrichment/scaling-audit.mjs --format summary
node --test scripts/hosted-recipe-catalog-contract.test.mjs scripts/recipe-enrichment/site-export.test.mjs
```

Expected: 600 recipes classified, no partial-scaling recipes, and matching hosted/bundled ingredient scaling rules by roster ID and position.

- [ ] **Step 4: Verify the public site locally at desktop and phone widths**

```bash
cd /Users/andrewwatanabe/kwilt-site
npm test
npm run lint
npm run build
npm run dev
```

In the browser, verify at least:

- `Classic deviled eggs`: `1× · Makes 24 halves`, `2× · Makes 48 halves`, no 1–24 target-yield menu.
- `Sicilian sheet-pan pizza`: authored squares multiply exactly.
- One public recipe with a fixed vessel quantity: fixed text remains authored while every multiply rule changes.
- 390px width: control fits, keyboard focus is visible, and no horizontal overflow appears.
- Print preview at `2×`: print-only multiplier/yield is visible and controls/affiliate UI remain hidden.
- Page source/JSON-LD: authored `1×` yield and ingredients remain unchanged.

Stop the local development server after verification.

- [ ] **Step 5: Verify the installed mobile app with provenance**

Build/install or use Metro only from `/Users/andrewwatanabe/Kwilt`. Record checkout, branch, commit, dirty state, native build number, Simulator/device, and Metro path/port. Verify:

- BA001 opens at `1× · Makes 1 9-by-5-inch loaf` with original ingredients.
- BA001 at `2×` shows 7 cups/840 grams flour, 4½ teaspoons yeast, 2 cups milk, and unchanged as-needed oil.
- A 4-serving recipe opens at `1×`, not the household default.
- Changing household default servings does not alter Recipe Home multiplier.
- Add to Meal Plan keeps diner count and multiplier independently editable.
- Grocery compilation for a six-person, `1×` loaf uses one cup milk.
- Cook Mode shows the same multiplier and ingredient amounts as Recipe Home.

Simulator proof does not prove backend migration, TestFlight, or production website deployment.

- [ ] **Step 6: Deploy backend and publication changes in order**

1. Apply the new scaling-rule migration and verify migration history.
2. Re-import the 600 catalog records through the admin-only idempotent importer.
3. Read back exactly 600 active publications and compare scaling-rule parity to the committed seed.
4. Release the compatible mobile client; keep old `serving_scale` persistence support active.
5. Deploy kwilt-site and verify the live deviled-eggs route signed out.

Do not call the feature publicly released until backend readback, installed-app proof, and signed-out website proof have each passed.

- [ ] **Step 7: Reconcile documentation and durable work**

Update `docs/feature-briefs/global-recipe-catalog.md` acceptance evidence and the relevant job-flow delivery score only after the behavior ships. The Kwilt connector was unavailable while this plan was written; capture this durable Goal when tools are available:

```text
Goal: Make recipe quantities trustworthy across Kwilt

Activities:
- Ship authored yield and recipe-size multipliers across app and website.
- Classify all 600 catalog recipes as scaling-ready or explicitly unavailable.
- Prove Meal Plan, Groceries, and Cook Mode use multiplier independently of diners.
- Verify hosted/bundled catalog parity and public-site production behavior.
```

## Completion criteria

- Recipe detail never initializes from household diner count.
- Every RecipeVersion preserves authored yield quantity and unit.
- Visible scaling uses only `1×`, `2×`, or `3×` and defaults to `1×`.
- No recipe can render a partially scaled ingredient list.
- Dual measurements scale together; reviewed fixed quantities remain unchanged.
- Meal Plan stores diners/planned portions independently from recipe multiplier.
- Groceries and Cook Mode consume the explicit multiplier.
- Legacy non-serving snapshots fail closed instead of interpreting six diners as six loaves.
- All 600 catalog recipes are classified as scaling-ready or explicitly unavailable.
- Hosted and bundled projections agree.
- Public recipe controls use multiplier/resulting yield and preserve authored JSON-LD.
- Focused tests, `verify:changed`, site tests/lint/build, manual Simulator, backend readback, and signed-out production verification are reported as separate gates.
