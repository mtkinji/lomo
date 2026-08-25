# UI Contract: Recipe Yield and Multiplier

Job: When Maya chooses a recipe, she needs to know what one authored batch makes and deliberately choose whether to make more, without Kwilt guessing from household size.

Authority chain: accepted Global Recipe Catalog brief -> explicit yield-and-multiplier decision -> existing Recipe facts hierarchy and local controls -> platform accessibility conventions.

Three-second read: `Makes <authored yield>` and current recipe size.

Primary action: choose `1×`, `2×`, or `3×` when reviewed scaling is available.

Primary information: authored yield and resulting scaled yield.

Secondary information: cookware and timing may need adjustment after scaling.

Reveal later: show the scaling caution only after changing the original recipe size.

Scan order: recipe facts -> Recipe size -> resulting yield -> Ingredients.

Must not add: diner inference, nutrition serving size, fractional multipliers, automatic time scaling, automatic cookware sufficiency, persistence, or mutation of the canonical RecipeVersion.

Reuse map: mobile Recipe summary row and local Button controls; public-site utility row and native `select`; existing ingredient list, instruction text, analytics, and print boundaries.

Nearest precedent: existing integrated Recipe summary control on mobile and existing compact public Recipe yield selector; preserve their placement while correcting semantics.

External exemplar ledger: N/A.

Behavior sources: authored RecipeVersion yield; reviewed ingredient scaling rules; explicit multiplier choice; independent Meal Plan diner context.

Unresolved decisions: none for the first whole-batch multiplier slice.

Required states: authored `1×`, reviewed `2×` and `3×`, unavailable scaling, fixed/as-needed ingredient, parenthetical equivalent, legacy Meal Plan snapshot, smallest viewport, keyboard focus, and print.

Proof path: BA001 in the installed mobile app; Classic deviled eggs and Sicilian sheet-pan pizza on the public site at desktop, 390px, and print; Grocery and Cook Mode downstream checks.

## Surface presentation

Mobile presentation: `Recipe size` row with the multiplier control and supporting text `Makes <scaled yield>`.

Public-site presentation: one compact native select reading `1× · Makes <scaled yield>`.

Unavailable state: show `Makes <authored yield>` without an enabled multiplier control. Do not expose a half-working scaler.

Changed state: show `Ingredient amounts reflect <N>×. Cookware and timing may need adjustment.`

Accessibility: announce both multiplier and resulting yield; preserve keyboard/native-select behavior on web; make mobile decrement/increment states explicit.

Print: include `<N>× recipe · Makes <scaled yield>` and the scaled ingredient/instruction quantities. Keep canonical JSON-LD at the authored `1×` values.
