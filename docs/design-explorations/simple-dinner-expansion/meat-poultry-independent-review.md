# Independent poultry desk review — 2026-10-16

Reviewer: meat author, independently reading all fifty complete ingredient lists and instruction sequences in `simpleDinnerPoultry.ts`. This is a cooking logic and duplication desk review, not a kitchen trial or verification of the poultry author's web-source ratings. Findings were sent to the poultry author and integration owner; this file records the reviewed snapshot before their repairs.

## Requested repairs

- DI335: replace fixed quarter of the orzo mixture at service with a proportional serving so a doubled recipe does not allocate one quarter to every person.
- DI348: fixed one tablespoon oil out of two tablespoons must become half the oil for scaling.
- DI353 and DI370: replace fixed quarter-cup reserved pasta water with a splash and texture endpoint, or proportional quantity that runtime scaling supports.
- DI346: upper method total is eight minutes mushrooms, four chicken, and two six-minute quesadilla batches = twenty-four minutes before heating/transfers. Recommend thirty cooking minutes instead of twenty-five.
- DI365: five-minute pepper, half-minute spice, ten-minute pasta, seven-minute chicken finish and two-minute rest already total24.5 minutes before bringing sauce to a simmer. Recommend thirty cooking minutes instead of twenty-five.
- DI337: upper specified operations total22.5 minutes before bringing four cups broth and additions to a simmer. Recommend thirty cooking minutes instead of twenty-five.
- DI339: upper specified operations total27 minutes before bringing broth/potatoes to simmer. Recommend35 cooking minutes instead of30.
- DI350: upper specified operations total26.5 minutes before heating broth plus28 ounces tomato. Recommend35 cooking minutes instead of30.
- DI377: rice18 minutes plus five-minute rest leaves only two minutes to boil at cook25. Recommend30 cooking minutes unless beginning to heat is explicitly included in prep.
- DI377 substantial duplication: existing `starterRecipeMealKitExpansion.ts` Sichuan-style turkey lettuce bowls already combines ground turkey, mushrooms, butter lettuce, carrots, rice, soy and rice vinegar. Ginger/honey replacing peppercorn is a flavor variant, not a clearly new dinner structure. Recommended replacement or explicit integration-owner disposition.

## Other reviewed cooking paths

DI331–334: concurrent rice or couscous/noodles, separated searing and vegetable stages, thin cutlets, and temperature endpoints coherent. DI332 fractional oil allocation is awkward but mathematically complete. DI334 batch caveat acknowledges pan capacity.

DI336/338: prepared chicken reheating endpoints and included starch/vegetables coherent. DI338 uses two baking sheets, within two cooking vessels. DI340–345: separate pasta/starch cooking, mild sauces, meat endpoints and included sides coherent; DI342 includes surplus filling service rather than claiming it all fits zucchini. DI344 microwave vessel plus skillet stays within two vessels.

DI347/349/351/352: sloppy Joe reduction, chilled salad, small sweet potato simmer and two sequential microwave potato batches are explicit. Chilled ready-to-eat chicken is not incorrectly required to be reheated. DI352 includes the final potato rest and sauce can overlap.

DI354–364: cooked sausage, small vegetable cuts, quick barley explicitly named, pepper prebake plus filling bake, cauliflower steam, noodle soup, turkey patties finished in gravy, refrigerated ravioli, sesame noodles and rice soup have coherent cooking order. DI358 honestly budgets45 cooking minutes for multiple bake stages. DI361 specifies a patty per serving and independent165°F center check. DI364 rice continues cooking after chicken addition.

DI366–376: nachos use skillet then baking sheet, cabbage-rice skillet has honest long simmer/rest, cold salad includes toast, packets precook potato, shell bake uses an oven-safe skillet, salads include bread, hash includes microwave pre-steam, tortilla pie has hot filling and rest, small meatballs poach to165°F, dumplings follow packet boiling instructions, and loaded potatoes use sequential pair cooking. All named sides were present in the ingredient lists. DI370 scaling repair remains noted above.

DI378–380: chicken hummus pitas include leftover salad service, polenta specifies quick product and parallel sauce cooking, turkey orzo soup gives carrots a head start and calls for stirring/texture checks. No additional blocking cooking logic finding.

## Duplication comparisons

Compared poultry dinner titles against all existing starter batches and the100 meal-kit expansion titles; read ingredient/method candidates where overlap was strong. DI349 has shared chicken/cucumber/carrot/rice-noodle structure with Lemongrass chicken vermicelli bowls, but chilled cooked chicken and sesame dressing create a different preparation/temperature path. DI379 uses cooked chicken marinara over polenta rather than the existing balsamic cutlet/mushroom glaze. DI336 and DI373 differ from original scratch dried-chile rolled enchiladas and scratch green-chile stacked bake through beans, produce, prepared chicken/sauce and substantially shorter methods. They remain a related flavor family to each other, with skillet strips versus rested layered pie. DI363 is a soft pasta-and-broccoli toss rather than the original velveted-chicken crisp noodle cake. DI377 remains the substantive duplicate concern identified above.
