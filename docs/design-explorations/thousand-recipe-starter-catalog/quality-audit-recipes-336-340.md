# Quality audit: recipes 336–340

Date: 2026-08-06
Proof state: desk-reviewed; no kitchen-test claim.

## Result

DI161–DI165 pass source comparison, roster continuity, unique-body checks, exact ingredient allocation, cultural-identity review, safety review, the full recipe-data gate of 72 suites and 157 tests, and scoped formatting. The staging corpus now contains 340 recipes; the live catalog remains untouched.

## Identity checks

- Coq au vin remains a red-wine chicken braise with bacon, pearl onions, mushrooms, thyme, and reduced sauce rather than generic chicken stew.
- Beef bourguignon uses large chuck cubes, bacon, Burgundian-style dry red wine, carrots, separately browned mushrooms, and separately glazed pearl onions.
- Cassoulet acknowledges Southwestern regional variation while preserving the shared white-bean, pork, garlic-sausage, duck-confit, long-bake, and rebuilt-crust structure.
- Ratatouille is a rustic Provençal stew of separately browned summer vegetables, not a decorative confit byaldi; baked eggs make it a complete dinner.
- Sole meunière is kept intentionally minimal: dry sole, an almost invisible flour dredge, brief sauté, fresh brown butter, lemon, parsley, and capers.

## Safety and execution checks

- Coq au vin thighs braise to at least 175°F for collagen tenderness.
- Beef remains mostly submerged until genuinely fork-tender; mushrooms and pearl onions join only after their separate safe cooking.
- Cassoulet's fresh sausage reaches 160°F and pork shoulder reaches 195°F; fully cooked confit is used and the 12-hour bean soak is explicit.
- Ratatouille eggs bake until whites are set and 160°F.
- Sole reaches 145°F and is moved to warm plates before fresh brown butter is made in a cleaned pan.
- Every listed ingredient is allocated to preparation, cooking, or service.

## Familiarity and effort check

- Coq au vin and beef bourguignon are household anchors because their underlying forms—chicken braise and beef stew—are familiar, but their 2¼- to 4¼-hour timelines exclude them from quick shelves.
- Ratatouille with baked eggs is an approachable household anchor using one final skillet and familiar vegetables, eggs, and bread.
- Sole meunière is a 30-minute cuisine anchor with a short ingredient list; its delicacy is pan technique, not ingredient or equipment burden.
- Cassoulet is the sole genuinely complex meal in this group: a 12-hour soak, six active hours, several meats, and repeated crust work. It remains a weekend cuisine anchor and cannot surface as an ordinary weeknight option.

## Highest-rated pattern synthesis

- Coq au vin's 4.94/5 across 81 votes supports bone-in dark meat, bacon, dry wine, pearl onions, mushrooms, patient browning, and sauce reduction, corroborated by official French identity evidence.
- Beef bourguignon's 4.94/5 across 45 votes supports large chuck cubes and separately cooked garnishes; two long-running editorial sources reinforce submersion and tenderness controls.
- Cassoulet relies more heavily on regional authority than star volume: the Universal Academy of Cassoulet, France's official tourism magazine, and a rigorous editorial version agree on beans, preserved meats, slow baking, and crust development.
- Ratatouille's 4.91/5 across 123 votes supports a rustic stew with eggs and bread; corroborating methods explain why drying and browning watery vegetables matters.
- Sole meunière's 4.6/5 across 54 ratings supports the disciplined flour-butter-lemon-parsley method, corroborated by France.fr and Saveur.

## Verification

- Focused batch and combined-catalog tests: 2 suites and 5 tests passed.
- Full recipe-data gate: 72 suites and 157 tests passed.
- Scoped formatting check: passed.
