# Quality audit: recipes 321–325

Date: 2026-08-06
Proof state: desk-reviewed; no kitchen-test claim.

## Result

DI146–DI150 pass source comparison, roster continuity, unique-body checks, exact ingredient allocation, cultural-identity review, safety review, the full recipe-data gate of 69 suites and 151 tests, and scoped formatting. The staging corpus now contains 325 recipes; the live catalog remains untouched.

## Identity checks

- Chicken katsu curry preserves two distinct components: browned-roux Japanese vegetable curry and crisp panko chicken, plated so the cutlet is not submerged.
- Oyakodon uses chicken and egg—the parent-and-child reference—in measured dashi seasoning with eggs added in two soft ribbons.
- Gyudon remains a minimal 20-minute beef-and-onion bowl, distinct from both egg-bound oyakodon and Kansai sukiyaki-style variants.
- Tonkatsu preserves the complete Japanese cutlet set: airy panko pork, abundant icy cabbage, sesame tonkatsu sauce, rice, mustard, and pickles.
- Yakisoba correctly uses steamed wheat noodles, pork and cabbage, high-heat char, Worcestershire-based sauce, aonori, and beni shoga.

## Safety and execution checks

- Katsu chicken reaches 165°F in 350°F oil; rack draining and separated plating protect the crust.
- Oyakodon chicken reaches 165°F before egg enters. Pasteurized eggs are required for a traditional soft surface; otherwise eggs continue to 160°F.
- Paper-thin gyudon beef stops at 145°F/no raw pink to prevent both undercooking and toughness.
- Tonkatsu reaches 145°F and rests three minutes; the pork rim is slashed to prevent curling and frying oil is held at 335–345°F.
- Yakisoba pork reaches 145°F before noodles and vegetables reunite; a hot uncrowded pan prevents steaming.

## Familiarity and effort check

- Oyakodon, gyudon, tonkatsu, and yakisoba take 25–45 minutes and use ordinary cookware, making them appropriate for approachable/default discovery.
- Chicken katsu curry takes about 90 minutes because it legitimately combines homemade curry, rice, and a fried cutlet. It remains a household anchor, but should not appear in under-an-hour shelves.
- None of these five requires specialized pantry depth beyond a compact set of reusable Japanese staples.

## Highest-rated pattern synthesis

- Katsu curry's 4.76/5 across 61 votes supports the cutlet-curry-rice architecture, corroborated by Japanese home and family sources.
- Oyakodon's 4.72/5 across 655 votes is an exceptional household signal and is reinforced by Japan's agriculture ministry and a Japanese seasoning authority.
- Gyudon's 4.74/5 across 531 votes strongly supports the minimal 20-minute dashi version; two Japanese developers corroborate the thin-beef stop-cooking logic.
- Tonkatsu's 4.68/5 across 310 votes supports airy panko, controlled frying, and the full cabbage-sauce set.
- Yakisoba's 4.8/5 across 424 votes supports steamed wheat noodles, pork, cabbage, late sauce, griddle char, and traditional garnishes.

## Verification

- Focused batch and combined-catalog tests: 2 suites and 5 tests passed.
- Full recipe-data gate: 69 suites and 151 tests passed.
- Scoped formatting check: passed.
