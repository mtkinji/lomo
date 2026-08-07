# Quality audit: recipes 366–370

Date: 2026-08-06
Proof state: desk-reviewed; no kitchen-test claim.

## Result

DI191–DI195 pass source comparison, roster continuity, original-body checks,
exact ingredient allocation, cultural-identity review, safety review,
title-legibility review, and the strengthened familiarity/effort gate. The
staging corpus now contains 370 recipes; the live catalog remains untouched.

The batch contains one household anchor, three cuisine anchors, and one
discovery recipe. Across the staging corpus, the mix is now 142 household
anchors, 196 cuisine anchors, and 32 discovery recipes.

## Check-in correction

The draft roster would have placed five consecutive specialist names together
and included both maqluba and mansaf, creating too much sourcing and technique
burden in one batch. It was corrected before authoring:

- plain English now leads every title while the traditional name remains;
- mansaf was not retained merely to represent Jordan;
- exceptionally well-rated Lebanese grilled chicken skewers replaced it as the
  familiar household counterweight;
- maqluba remains the sole genuine project meal in this batch;
- the implementation plan now limits each five-recipe batch to one specialist
  project and rejects cuisine coverage as a sufficient reason by itself.

## Familiar naming and meal stories

- `Lebanese baked kibbeh (kibbeh bil sanieh)` explains the family-style baked
  meat-and-bulgur form before asking the reader to recognize its Arabic name.
- `Lebanese lentils and rice (mujadara)` makes the inexpensive pantry meal
  immediately legible.
- `Palestinian sumac chicken flatbread (musakhan)` leads with the appetite and
  format rather than a vocabulary test.
- `Palestinian upside-down chicken and rice (maqluba)` makes both the meal and
  its defining technique clear.
- `Lebanese grilled chicken skewers (shish tawook)` reads as an ordinary family
  grill dinner while preserving the dish's established name.
- The Recipe detail page now labels Kwilt-authored editorial notes `About this
meal`; personal and family recipes retain `Notes`. The story remains after
  the method and does not compete with planning, cooking, or ingredient use.

## Familiarity and effort check

- Mujadara uses pantry staples, one skillet and one saucepan, and approximately
  65 minutes of active-plus-cook time.
- Shish tawook uses supermarket ingredients, a simple one-hour marinade, and a
  15-minute grill; its leading source is rated 5/5 across 2,324 votes.
- Musakhan is a recognizable roast-chicken-and-flatbread dinner. Sumac and
  sturdy flatbread are the only less-standard purchases, and no special
  equipment is required.
- Baked kibbeh is a weekend-style family casserole but deliberately avoids the
  shaping and deep-frying burden of individual kibbeh croquettes.
- Maqluba is the sole discovery project: it requires pre-cooking chicken,
  roasting vegetables, exact broth measurement, layered assembly, a full rest,
  and a careful hot-pot inversion.

## Safety and execution checks

- Ground beef in the kibbeh filling reaches 160°F before cooling; the complete
  tray reaches 165°F. Raw shell meat stays cold and separate from the cooled
  filling.
- Lentils are par-cooked and measured cooking liquid prevents a wet, broken
  rice texture; onions are browned but explicitly not blackened.
- Musakhan chicken thighs reach at least 175°F for safe, tender dark meat.
- Maqluba chicken reaches 165°F before layering, hot broth is measured exactly,
  and the inversion uses mitts, a rimmed platter, and a cleared workspace.
- Shish tawook raw marinade is discarded and chicken breast reaches 165°F
  before resting.
- Every listed ingredient is allocated to preparation, cooking, finishing, or
  service.

## Highest-rated and authority pattern synthesis

- Baked kibbeh follows a 4.98/5 pattern across 347 votes plus two Lebanese
  specialist sources: fine dry bulgur, cold lean meat, cooled filling, wet-hand
  layering, scoring, and restrained baking explain success.
- Mujadara has the batch's strongest validation depth: 4.98/5 across 1,970
  votes plus a 4.9/5 corroborating pattern. Deeply browned onions, intact
  lentils, cumin, and rested measured-liquid rice recur.
- Musakhan combines a 5/5 reader pattern with Palestinian chef and culinary
  archive authority. Sumac, silky onions, olive oil, roast chicken, sturdy
  flatbread, pine nuts, and family-style service are non-negotiable.
- Maqluba's 4.96/5 pattern across 347 ratings supports compact layering, hot
  measured broth, low cooking, resting, and decisive inversion; Palestinian
  foodways evidence confirms legitimate eggplant and cauliflower variation.
- Shish tawook's 5/5 pattern across 2,324 votes strongly justifies the roster
  correction. Lebanese authorities corroborate yogurt, lemon, garlic, tomato,
  warm spice, breast meat, skewering, and fast grilling.

## Verification

- Focused batch, combined-catalog, and Recipe detail tests: 3 suites and 12
  tests passed.
- Full recipe-data gate: 78 suites and 169 tests passed.
- Scoped formatting check: passed.
- Native Recipe detail rendering remains unverified in this batch; the source
  and component tests do not substitute for Simulator inspection.
