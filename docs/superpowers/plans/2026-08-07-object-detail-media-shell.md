# Object Detail Media Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Recipe, Arc, Goal, and To-do details one shared media-to-sheet structure, while making Recipe Home calmer, multi-photo capable, easier to scan, and able to offer truthful contextual alternatives.

**Architecture:** Add a narrow `ObjectDetailMediaShell` in `src/ui/layout` that renders the hero and rounded sheet and derives motion from a tested geometry contract. Keep scroll ownership in each screen so keyboard, coachmark, header, and lifecycle callbacks remain intact. Recipe-specific facts, media fallback, actions, and recommendations stay inside Recipes; Reviews and photo mutation stay hidden until their independent server authorities are real.

**Tech Stack:** React Native 0.83, Expo 55, React Navigation 7, React Native `Animated`, Jest, React Native Testing Library, Kwilt semantic tokens and canonical controls.

**Execution note:** This plan runs inline in the existing checkout because `/Users/andrewwatanabe/Kwilt/AGENTS.md` forbids creating a worktree without explicit approval. Commit steps are intentionally omitted because the user has not authorized staging or commits and the branch contains unrelated in-progress catalog changes.

---

## File map

- Create `src/ui/layout/ObjectDetailMediaShell.tsx`: shared geometry, motion, hero clipping, sheet overlap/radii, and composition API.
- Create `src/ui/layout/ObjectDetailMediaShell.test.tsx`: geometry, variant, and Reduce Motion regression coverage.
- Modify `src/capabilities/recipes/components/RecipeHero.tsx`: intentional non-literal no-photo artwork without missing-state language.
- Modify `src/capabilities/recipes/components/RecipeArtworkGallery.tsx`: hero-compatible paging and quiet one-photo behavior.
- Replace `src/capabilities/recipes/components/RecipeSummaryBar.tsx` with a flat fact-list contract while retaining the import path during migration.
- Modify `src/capabilities/recipes/components/RecipeMethodPreview.tsx`: **Instructions** language and spacing.
- Create `src/capabilities/recipes/components/RecipeRecommendationsSection.tsx`: bounded explained alternatives.
- Modify `src/capabilities/recipes/domain/recipeRecommendations.ts`: pure contextual selection and exclusion logic.
- Modify `src/capabilities/recipes/domain/recipeRecommendations.test.ts`: regression-first recommendation coverage.
- Modify `src/capabilities/recipes/screens/RecipeHomeScreen.tsx`: shared shell, multi-photo hero, fact list, title-adjacent actions, spacing, and recommendation navigation.
- Modify `src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx`: rendered Recipe state and action coverage.
- Modify `src/features/arcs/ArcDetailScreen.tsx`: consume immersive shared shell without changing Arc behavior.
- Modify `src/features/arcs/GoalDetailScreen.tsx`: consume standard shared shell without changing Goal behavior.
- Modify `src/features/activities/ActivityDetailRefresh.tsx`: consume compact shared shell while preserving keyboard and dock behavior.
- Modify `src/capabilities/recipes/FEATURE.md`: link the accepted brief without altering its existing global-catalog edits.
- Create `docs/feature-briefs/object-detail-media-shell.md`: accepted product and UI contract.

### Task 1: Lock product and UI authority

**Files:**
- Create: `docs/feature-briefs/object-detail-media-shell.md`
- Modify: `src/capabilities/recipes/FEATURE.md`

- [x] **Step 1: Write the accepted brief**

Carry forward the audience, Maya persona, job-flow steps 3 and 18, shared-shell boundary, Recipe information hierarchy, gated Reviews, deterministic alternatives, UI contract, acceptance criteria, and proof boundaries from the exploration.

- [x] **Step 2: Link the brief only to Recipes**

Add `object-detail-media-shell` to `src/capabilities/recipes/FEATURE.md`. Do not add it to Arc or Activities manifests because their existing hero jobs differ and the shared UI migration does not change what those folders serve.

- [x] **Step 3: Validate product links**

Run: `npm run product:lint`

Expected: zero product-lint errors; unrelated pre-existing unlinked-brief warnings may remain.

### Task 2: Build the shared geometry contract

**Files:**
- Create: `src/ui/layout/ObjectDetailMediaShell.test.tsx`
- Create: `src/ui/layout/ObjectDetailMediaShell.tsx`

- [ ] **Step 1: Write failing geometry tests**

Cover:

```ts
expect(resolveObjectDetailMediaGeometry('immersive')).toMatchObject({
  heroHeight: 320,
  overlap: 28,
  parallaxFactor: 0.5,
});
expect(resolveObjectDetailMediaGeometry('standard').heroHeight).toBe(240);
expect(resolveObjectDetailMediaGeometry('compact').heroHeight).toBe(168);
expect(buildObjectDetailMediaMotionRange({
  heroHeight: 320,
  overlap: 28,
  headerBoundary: 96,
  fadeHold: 60,
  fadeLead: 180,
})).toEqual({ start: 60, end: 196 });
```

Render the component with Reduce Motion mocked both on and off. Assert that the
shared test IDs for hero and sheet exist, the variant height is applied, and
the reduced-motion hero omits parallax transformation while retaining the
sheet structure.

- [ ] **Step 2: Run the tests and observe failure**

Run: `npx jest src/ui/layout/ObjectDetailMediaShell.test.tsx --runInBand`

Expected: FAIL because the component and helpers do not exist.

- [ ] **Step 3: Implement the narrow shell**

Export:

```ts
export type ObjectDetailMediaVariant = 'immersive' | 'standard' | 'compact';

export type ObjectDetailMediaGeometry = {
  heroHeight: number;
  overlap: number;
  sheetRadius: number;
  parallaxFactor: number;
  fadeHold: number;
  fadeLead: number;
};

export function resolveObjectDetailMediaGeometry(
  variant: ObjectDetailMediaVariant,
): ObjectDetailMediaGeometry;

export function buildObjectDetailMediaMotionRange(input: {
  heroHeight: number;
  overlap: number;
  headerBoundary: number;
  fadeHold: number;
  fadeLead: number;
}): { start: number; end: number };
```

`ObjectDetailMediaShell` accepts `variant`, `scrollY`, `headerBoundary`,
`hero`, `children`, optional `heroStyle`, `sheetStyle`, `sheetInnerStyle`,
`onSheetLayout`, and `sheetRef`. It renders one clipped hero, one animated hero
layer, and one rounded sheet. It consumes `useAccessibilityPreferences()` and
uses semantic `colors`, `radii`, and `spacing`; it never imports domain code or
renders a header.

- [ ] **Step 4: Run the focused test**

Run: `npx jest src/ui/layout/ObjectDetailMediaShell.test.tsx --runInBand`

Expected: PASS.

### Task 3: Replace Recipe dashboard facts with a flat list

**Files:**
- Modify: `src/capabilities/recipes/components/RecipeSummaryBar.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx`

- [ ] **Step 1: Change the screen test expectations first**

Assert that the rendered Recipe includes **What this recipe takes**, known
facts and values, and no em dash when both prep and cook are unknown. Assert
that **Scale recipe** remains a separate interactive row.

- [ ] **Step 2: Run the Recipe Home test and observe failure**

Run: `npx jest src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx --runInBand`

Expected: FAIL on the new heading and unknown-fact expectations.

- [ ] **Step 3: Implement the flat fact list**

Keep the exported component name temporarily to avoid a broad import churn,
but render:

```tsx
<View accessibilityLabel="What this recipe takes">
  <Heading variant="sm">What this recipe takes</Heading>
  {items.map(({ icon, label, value }) => (
    <View key={label} style={styles.row}>
      <Icon name={icon} size={20} color={colors.textSecondary} />
      <Text style={styles.label}>{label}</Text>
      <Text>{value}</Text>
    </View>
  ))}
</View>
```

Only create Total when at least one duration exists. Only create Prep, Cook,
Waiting, and Makes when their source value exists and is meaningful. Use
`clock`, `hourglass`, `flame`, and `meal` icons. Use alignment and whitespace,
not a Card or one bordered capsule per fact.

- [ ] **Step 4: Run the focused test**

Run: `npx jest src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx --runInBand`

Expected: PASS for the fact-list cases.

### Task 4: Make Recipe media complete in zero, one, and many states

**Files:**
- Modify: `src/capabilities/recipes/components/RecipeHero.tsx`
- Modify: `src/capabilities/recipes/components/RecipeArtworkGallery.tsx`
- Modify: `src/capabilities/recipes/components/RecipeArtworkGallery.test.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeHomeScreen.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx`

- [ ] **Step 1: Add failing media-state tests**

Assert that one active image has no counter; multiple active images expose the
correct count and horizontal scroll; deleted media is ignored; and zero media
renders an artwork surface without **Your recipe**, **Missing**, or an empty
state icon. Assert that an editable Recipe has one title-adjacent **Recipe
actions** button while a catalog Recipe does not.

- [ ] **Step 2: Run the focused tests and observe failure**

Run: `npx jest src/capabilities/recipes/components/RecipeArtworkGallery.test.tsx src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx --runInBand`

Expected: FAIL on the Recipe Home gallery and actions-menu contract.

- [ ] **Step 3: Localize gallery presentation for the hero**

Allow `RecipeArtworkGallery` to accept an optional `fallback` node and keep
opening behavior optional when no dedicated full-gallery route exists. Keep
the existing single-photo and multi-photo semantics. Use media array order as
the read-only presentation order for this slice; do not add a cover-management
action until its durable mutation RPC exists.

- [ ] **Step 4: Replace the deficient fallback**

Render a quiet layered gradient and abstract plate/ingredient shapes using
token roles. Do not label the artwork as the actual dish. Its accessibility
label is **Recipe artwork** and it contains no completion prompt.

- [ ] **Step 5: Move personal actions beside identity**

Remove the body button. Add one 44-point title-adjacent `Pressable` with the
`more` icon, accessibility label **Recipe actions**, and the existing
`RecipeActionsMenu` callback. Preserve the header and the current edit/delete
sheet.

- [ ] **Step 6: Run the focused tests**

Run: `npx jest src/capabilities/recipes/components/RecipeArtworkGallery.test.tsx src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx --runInBand`

Expected: PASS.

### Task 5: Rename and re-space Recipe sections

**Files:**
- Modify: `src/capabilities/recipes/components/RecipeMethodPreview.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeHomeScreen.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx`

- [ ] **Step 1: Add failing copy and order assertions**

Assert **Instructions** exists, **Method** does not, and the empty copy is **No
instructions added yet.** Keep Ingredients before Instructions.

- [ ] **Step 2: Implement copy and rhythm**

Use `spacing['2xl']` between major Recipe sections and no more than
`spacing.md` between rows within Ingredients or Instructions. Do not add cards,
dividers, or helper copy merely to create separation.

- [ ] **Step 3: Run the Recipe Home test**

Run: `npx jest src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx --runInBand`

Expected: PASS.

### Task 6: Add truthful contextual alternatives

**Files:**
- Modify: `src/capabilities/recipes/domain/recipeRecommendations.test.ts`
- Modify: `src/capabilities/recipes/domain/recipeRecommendations.ts`
- Create: `src/capabilities/recipes/components/RecipeRecommendationsSection.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeHomeScreen.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx`

- [ ] **Step 1: Write failing contextual selector tests**

Add `buildContextualRecipeRecommendations({ current, recipes, hiddenRecipeIds,
limit })`. Assert it excludes the current Recipe, hidden and deleted Recipes,
duplicate Recipe IDs, and exact lineage/publication editions when known. Assert
the result never exceeds the limit and each result has exactly one reason from
`quicker`, `same_category`, `same_cuisine`, `similar_ingredients`, or
`editorial`.

- [ ] **Step 2: Run the selector test and observe failure**

Run: `npx jest src/capabilities/recipes/domain/recipeRecommendations.test.ts --runInBand`

Expected: FAIL because the contextual selector does not exist.

- [ ] **Step 3: Implement the smallest defensible selector**

Use existing elapsed minutes and starter metadata. Prefer, in order: a truly
quicker positive-duration option; matching cuisine/category metadata when
present; overlap in normalized non-null ingredient concepts; then a featured
editorial option. Do not infer cuisine from title text and do not use ratings or
engagement.

- [ ] **Step 4: Render the alternatives section**

Render a flat horizontal rail under **More Meals you might like** only when the
selector returns at least one item. Reuse `RecipeArtwork` and typography; use a
single reason line and no rating counters. `onOpenRecipe` calls
`navigation.push('RecipeHome', { recipeId })`, allowing native-stack Back to
restore the mounted prior screen and its scroll position.

- [ ] **Step 5: Add navigation and no-result tests**

Assert the section is absent with no eligible results and that pressing a card
passes the selected Recipe ID to the callback. Keep a manual Simulator check
for actual native-stack scroll restoration because a component unit test cannot
prove mounted native-scroll preservation.

- [ ] **Step 6: Run focused tests**

Run: `npx jest src/capabilities/recipes/domain/recipeRecommendations.test.ts src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx --runInBand`

Expected: PASS.

### Task 7: Adopt the shared shell on Recipe Home

**Files:**
- Modify: `src/capabilities/recipes/screens/RecipeHomeScreen.tsx`
- Modify: `src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx`

- [ ] **Step 1: Add a shell regression assertion**

Assert Recipe Home renders `object-detail-media-hero` and
`object-detail-media-sheet` and that the established header actions retain the
same accessible labels.

- [ ] **Step 2: Replace the static Recipe hero/sheet**

Use one `Animated.Value`, one composed `onScroll`, and the immersive shell.
Pass `RecipeArtworkGallery` as hero content and the Recipe body as sheet
content. Preserve safe-area bottom clearance for `ActionDock`, current
analytics, prior Cook learning, pending-sync copy, planning, cooking, hide,
favorite, share, edit, and delete behavior.

- [ ] **Step 3: Run Recipe and shell tests**

Run: `npx jest src/ui/layout/ObjectDetailMediaShell.test.tsx src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx --runInBand`

Expected: PASS.

### Task 8: Migrate Arc, Goal, and To-do without changing their jobs

**Files:**
- Modify: `src/features/arcs/ArcDetailScreen.tsx`
- Modify: `src/features/arcs/GoalDetailScreen.tsx`
- Modify: `src/features/activities/ActivityDetailRefresh.tsx`
- Modify or create the nearest existing detail-screen tests discovered for each route.

- [ ] **Step 1: Replace duplicated motion math**

Wrap the existing Arc hero and sheet content in the immersive shell, Goal in
standard, and To-do in compact. Delete local hero opacity, parallax, height,
overlap, and radius formulas once the shared component owns them. Preserve each
screen's existing `scrollY`, header opacity/status behavior, scroll callbacks,
keyboard ref, coachmark lock, and hero edit action.

- [ ] **Step 2: Normalize sheet rounding**

Use the shared sheet radius on all three consumers. Remove Goal's square-sheet
exception and give To-do a compact overlap; keep domain-owned inner horizontal
padding and content rhythm unchanged.

- [ ] **Step 3: Run related detail tests**

Run the exact test files returned by:

`rg -l "ArcDetailScreen|GoalDetailScreen|ActivityDetailRefresh" src --glob '*test.ts' --glob '*test.tsx'`

Expected: all discovered tests PASS.

### Task 9: Verify and visually criticize the real path

**Files:**
- Modify only files required by failures found in this gate.

- [ ] **Step 1: Run focused and diff-aware verification**

Run:

```bash
npx jest src/ui/layout/ObjectDetailMediaShell.test.tsx \
  src/capabilities/recipes/components/RecipeArtworkGallery.test.tsx \
  src/capabilities/recipes/domain/recipeRecommendations.test.ts \
  src/capabilities/recipes/screens/RecipeHomeScreen.test.tsx --runInBand
npm run verify:changed -- --run
```

Expected: PASS, or an explicit unrelated/pre-existing failure with evidence.

- [ ] **Step 2: Establish runtime provenance**

Before visual claims, record the checkout, branch, commit, dirty state, installed
binary, Metro PID, Metro working directory, and port. Do not assume the iPhone
Simulator is using this checkout.

- [ ] **Step 3: Exercise the real routes**

On the same iPhone 17 Pro Simulator build, inspect Recipe zero/one/many media,
long title/description, missing facts, prior Cook learning, Ingredients,
Instructions, recommendations, personal actions, and dock behavior; then Arc,
Goal, and To-do hero-to-sheet transitions. Repeat with a large accessibility
text size and Reduce Motion.

- [ ] **Step 4: Run the reductive critic**

From screenshots alone, identify the first three focal points, count dominant
actions, count surface depth, and compare against the Arc precedent and the
provided Airbnb spacing/list references. Mark Job clarity, Reduction,
Hierarchy, System fit, Composition, Interaction, States, Resilience, and Runtime
proof PASS/FAIL/N/A. Fix and rerender every applicable critical failure.

- [ ] **Step 5: Report proof boundaries**

State source/test proof, Simulator proof, and remaining signed-device/account,
media-sync, Review-authorization, production-hidden, and production-default
gates separately. Do not call gated Reviews or durable photo mutation complete
from UI code.
