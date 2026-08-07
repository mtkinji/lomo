# Ten-recipe quality checkpoint: recipes 326–335

Date: 2026-08-06
Proof state: desk-reviewed; no kitchen-test or household-acceptance claim.

## Result

DI151–DI160 pass the explicit ten-recipe checkpoint: online source comparison, roster continuity, original-body checks, exact ingredient allocation, cultural-identity review, safety review, familiarity/effort classification, the full recipe-data gate of 71 suites and 155 tests, and scoped formatting. The staging corpus now contains 335 recipes; the live catalog remains untouched.

## Familiarity and desirability

- Seven of the ten are anchors rather than discovery recipes: Osaka-style okonomiyaki, nikujaga, salt-grilled mackerel, karaage rice plate, Japanese curry rice, omurice, and miso black cod.
- Karaage rice plate and Japanese curry rice are household anchors. Omurice, nikujaga, and salt-grilled mackerel are particularly approachable cuisine anchors built from familiar meal forms: chicken and rice, meat and potatoes, omelet and rice, and simply cooked fish.
- Sukiyaki, shabu-shabu, and unadon are the three discovery entries. They are present for cuisine coverage, but explicitly excluded from default weeknight emphasis because they involve communal equipment, specialty slicing, or prepared eel.
- The current 335-recipe corpus contains 130 household anchors, 178 cuisine anchors, and 27 discovery recipes. Discovery remains a clear minority at 8.1% even though this Japanese sequence temporarily contains three.
- Unfamiliar names are accompanied by plain descriptions of what the meal actually is; the name alone will not be treated as a recommendation signal.

## Effort and complexity

- Salt-grilled mackerel has seven ingredients and 20 minutes of active cooking; omurice takes 40 minutes; okonomiyaki takes 50 minutes; nikujaga is an approachable one-pot 65-minute meal including rest.
- Karaage takes 40 active minutes plus a 30-minute marinade. Japanese curry takes 85 active minutes. Both remain household anchors, but neither qualifies for an under-30-minute shelf.
- Miso black cod has only 30 active minutes but an honest 48-hour cure (`inactiveMinutes: 2910`), preventing it from appearing as a quick meal.
- Sukiyaki and shabu-shabu require tabletop-burner setup and raw/cooked utensil management; their complexity is inherent and is not hidden by short cook-time labels.
- Unadon takes 30 minutes only because it begins with fully cooked commercial kabayaki eel. The recipe does not pretend specialist whole-eel preparation is a household shortcut.

## Why the strongest variations work

- Osaka okonomiyaki: mix each cabbage portion minimally and only when the hot griddle is ready; cover after flipping and never press.
- Sukiyaki and shabu-shabu: preserve their opposite liquid architectures—sweet-soy warishita versus clear kombu broth with individual dips—and cook in small social batches.
- Nikujaga: use a drop lid, protect thin beef from a long simmer, retain potato structure, and rest off heat so seasoning enters the vegetables.
- Salt-grilled mackerel: sake, salt rest, thorough blotting, crisp skin, and a 145°F stop keep an oily fish clean-tasting and juicy.
- Unadon: quality prepared kabayaki, thin layers of fresh tare, controlled reheating, hot rice, and restrained sauce deliver the home version honestly.
- Karaage: even skin-on thigh pieces, a short absorbed marinade, potato-starch-heavy crags, uncrowded oil, and a rest between 325°F and 375°F fries create juicy meat and brittle crust.
- Japanese curry: deeply browned onion, intact root vegetables, toasted homemade roux, gradual dissolution, and low heat after thickening create familiar mild curry without flouriness or scorching.
- Omurice: reduce ketchup before mixing in rice, cook one thin egg sheet at a time, and use a fully set classic wrapper instead of a fragile runny showpiece.
- Miso black cod: salt and blot first, cool the Saikyo marinade, cure for 48 hours, scrape excess miso, and watch the sugar-rich surface closely under the broiler.

## Common failure risks caught

- Watery cabbage, pressed pancakes, crowded hot pots, tough thin beef, broken potatoes, steamed mackerel skin, syrupy eel tare, gummy karaage coating, lumpy or scorched curry, browned tough omelets, and burned miso were each addressed with an explicit control in the method.
- Chicken reaches 165°F, beef and pork reach 145°F, eggs reach 160°F unless pasteurized for the specified soft application, and fish reaches 145°F. Commercially cooked eel is reheated to 165°F.
- Tabletop recipes require a stable ventilated burner and separate raw/cooked utensils. Raw-fish marinades are discarded.
- Every listed ingredient is allocated to preparation, cooking, or service.

## Source strength

- Each recipe has at least three unique HTTPS sources, anchored by a visible high-rating pattern and corroborated with Japanese developers, Japan's agriculture ministry, or Japanese culinary institutions.
- The ten visible lead signals range from 4.62/5 across 1,652 votes for Japanese chicken curry to 4.79/5 across 466 votes for miso black cod; lower-volume ratings are not treated as equivalent to high-volume evidence.
- Source ratings and counts are recorded only where both were visible during the 2026-08-06 review.

## Verification

- Focused batch and combined-catalog tests: 2 suites and 5 tests passed for each five-recipe batch.
- Full recipe-data gate after recipe 335: 71 suites and 155 tests passed.
- Staging manifest count: 335 recipes; Dinner count: 160.
- Scoped formatting check: passed.
- Live catalog integration: intentionally not performed.
