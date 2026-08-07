import type { EditorialRecipe } from "./editorialRecipeCatalog";

export const STARTER_RECIPE_BATCH_086: readonly EditorialRecipe[] = [
  {
    rosterId: "BA011",
    title: "Blue corn skillet bread",
    category: "Breads & baking",
    cuisine: "Southwestern US",
    tier: "cuisine-anchor",
    description:
      "A nutty blue-corn quick bread with a crisp buttered skillet edge and tender buttermilk crumb.",
    yieldQuantity: 8,
    yieldUnit: "wedges",
    prepMinutes: 12,
    cookMinutes: 22,
    inactiveMinutes: 10,
    artworkIndex: 22,
    ingredients: [
      "1 1/2 cups fine blue cornmeal",
      "1/2 cup (60 grams) all-purpose flour",
      "2 teaspoons baking powder",
      "1/2 teaspoon baking soda",
      "1 teaspoon kosher salt",
      "2 tablespoons honey",
      "2 large eggs",
      "1 1/2 cups whole buttermilk",
      "6 tablespoons unsalted butter, divided",
    ],
    instructions: [
      "Place a 10-inch cast-iron skillet in the oven and heat to 425°F. Whisk blue cornmeal, flour, baking powder, baking soda, and salt in a large bowl.",
      "Whisk honey, eggs, and buttermilk in another bowl. Melt 4 tablespoons butter and whisk it slowly into the wet mixture.",
      "Carefully remove the hot skillet, add remaining 2 tablespoons butter, and swirl to coat. Fold wet ingredients into dry only until no dry pockets remain; the batter should retain small lumps.",
      "Pour immediately into the sizzling skillet and bake 19 to 23 minutes until the edges pull away and a center tester shows moist crumbs but no raw batter.",
      "Rest 10 minutes, cut in wedges, and serve warm. Expect the baked color to range from slate blue to purple-gray depending on the cornmeal and batter acidity; color variation is natural, not a doneness signal.",
    ],
    notes:
      "Blue corn comprises several Indigenous maize varieties cultivated for generations in the Southwest and northern Mexico; it is not merely yellow corn dyed blue. This is a modern Southwestern skillet quick bread, not Hopi piki or another specific tribal bread. Fine blue cornmeal gives a sweeter, nuttier flavor and striking natural color while the familiar buttermilk-cornbread format keeps the recipe legible and practical.",
    kitchenTestState: "desk-reviewed",
    research: {
      accessedAt: "2026-08-06",
      sources: [
        {
          publisher: "New Mexico Magazine",
          title: "A Taste of New Mexico Kitchens: Blue Corn Bread",
          url: "https://www.gutenberg.org/ebooks/63283",
          rating: null,
          ratingCount: null,
          signal:
            "A regional cookbook archive establishes blue corn bread within New Mexican home cooking and supports blue cornmeal as the defining grain rather than a novelty garnish.",
        },
        {
          publisher: "The Washington Post",
          title: "Blue Corn",
          url: "https://www.washingtonpost.com/archive/lifestyle/food/1983/08/21/blue-corn/6852b00c-f6a1-4a3d-8824-3f755a444e9b/",
          rating: null,
          ratingCount: null,
          signal:
            "Food reporting documents blue corn's Indigenous Southwestern context, its sweeter nuttier character, and cornbread as one established use.",
        },
        {
          publisher: "New Mexico State University",
          title: "Blue Corn Production and Marketing in New Mexico",
          url: "https://pubs.nmsu.edu/_h/H226.pdf",
          rating: null,
          ratingCount: null,
          signal:
            "An agricultural authority confirms multiple traditional blue-corn foods and the grain's continuing regional importance, supporting cautious identity claims rather than equating this skillet bread with piki.",
        },
      ],
      nonNegotiableTechniques: [
        "Use fine food-grade blue cornmeal and keep it the majority grain.",
        "Preheat cast iron and pour briefly mixed batter into sizzling butter.",
        "Judge doneness by set crumb rather than the variable blue-purple color.",
      ],
      repeatedSuccessSignals: [
        "Blue corn tastes nutty and remains prominent",
        "Bottom and edges are crisp",
        "Crumb is tender and cohesive",
        "Honey and buttermilk balance without making cake",
      ],
      repeatedFailureRisks: [
        "Coarse meal can remain gritty in a short bake.",
        "A cool skillet produces pale soft edges.",
        "Overmixing toughens the wheat-flour portion.",
      ],
      adaptationDecision:
        "Use the familiar hot-skillet buttermilk architecture while centering fine blue cornmeal, and explicitly distinguish this modern regional quick bread from specific Indigenous preparations it does not reproduce.",
    },
  },
  {
    rosterId: "BA012",
    title: "Rosemary focaccia",
    category: "Breads & baking",
    cuisine: "Italian",
    tier: "household-anchor",
    description:
      "An airy olive-oil flatbread with a crisp golden base, deep dimples, rosemary, and flaky salt.",
    yieldQuantity: 12,
    yieldUnit: "squares",
    prepMinutes: 20,
    cookMinutes: 25,
    inactiveMinutes: 840,
    artworkIndex: 22,
    ingredients: [
      "4 cups (480 grams) all-purpose flour",
      "2 teaspoons instant yeast",
      "2 teaspoons kosher salt",
      "2 cups (455 grams) lukewarm water",
      "6 tablespoons extra-virgin olive oil, divided",
      "1 tablespoon chopped fresh rosemary",
      "1 teaspoon flaky sea salt",
    ],
    instructions: [
      "The evening before baking, whisk flour, yeast, and kosher salt. Add water and stir until a sticky uniform dough forms with no dry pockets. Coat with 1 tablespoon olive oil, cover, and refrigerate 8 to 24 hours; no kneading is required.",
      "Coat a 9-by-13-inch metal pan with 2 tablespoons olive oil. Scrape in cold dough, turn to coat, and gently stretch toward the corners. Rest covered 2 to 3 hours until very puffy and filling the pan, stretching once more after 30 minutes if it initially springs back.",
      "Heat oven to 425°F. Drizzle dough with 2 tablespoons oil. Oil fingertips and press straight down repeatedly to the bottom of the pan, creating deep dimples without tearing. Scatter rosemary and flaky salt evenly.",
      "Bake 22 to 28 minutes until deeply golden on top and crisp underneath, rotating once. The center should reach at least 200°F.",
      "Drizzle with remaining tablespoon oil, cool in the pan 10 minutes, then move to a rack so the bottom stays crisp. Serve warm or at room temperature; re-crisp leftovers in a 350°F oven.",
    ],
    notes:
      "Focaccia is an Italian olive-oil flatbread with many regional forms and toppings. Rosemary is a familiar household version, but oil, fermentation, generous dimples, salt, and a crisp base define the experience more than a crowded topping list. The overnight no-knead method turns time into flavor and an airy crumb without requiring a mixer or advanced shaping.",
    kitchenTestState: "desk-reviewed",
    research: {
      accessedAt: "2026-08-06",
      sources: [
        {
          publisher: "Alexandra's Kitchen",
          title: "The Best, Easiest Focaccia Bread",
          url: "https://alexandracooks.com/2018/03/02/overnight-refrigerator-focaccia-best-focaccia/",
          rating: 5,
          ratingCount: null,
          signal:
            "A sustained five-star pattern supports a very wet no-knead dough, overnight refrigeration, generous olive oil, patient pan proof, deep dimples, and easy home success.",
        },
        {
          publisher: "HelloFresh",
          title: "Rosemary Focaccia",
          url: "https://www.hellofresh.com/recipes/rosemary-focaccia-664864d89b48a4f3743af523",
          rating: 4.5,
          ratingCount: 548,
          signal:
            "A 4.5/5 pattern across 548 reviews establishes rosemary focaccia as a familiar, desirable, easy bread rather than a specialist regional inclusion.",
        },
        {
          publisher: "Once Upon a Chef",
          title: "Easy Focaccia Bread",
          url: "https://www.onceuponachef.com/recipes/rosemary-focaccia.html",
          rating: null,
          ratingCount: null,
          signal:
            "An editorial home version corroborates accurate flour measurement, olive-oil pools in deep indentations, coarse salt, fresh rosemary, and crisp-outside soft-inside contrast.",
        },
      ],
      nonNegotiableTechniques: [
        "Keep the dough wet and allow long cold fermentation instead of adding flour.",
        "Proof until very puffy in a well-oiled metal pan and dimple to the bottom.",
        "Bake to deep color and move to a rack after a short pan rest.",
      ],
      repeatedSuccessSignals: [
        "Crumb is airy with irregular bubbles",
        "Base and top are crisp and golden",
        "Dimples hold olive oil and salt",
        "Rosemary remains fragrant rather than burned",
      ],
      repeatedFailureRisks: [
        "Adding flour to sticky dough makes dense bread.",
        "Underproofed dough springs back and bakes tight.",
        "Cooling entirely in the pan softens the bottom crust.",
      ],
      adaptationDecision:
        "Use the strongest five-star overnight no-knead pattern, validate broad desirability with 548 reviews, and limit toppings to rosemary and salt so fermentation, oil, and texture stay central.",
    },
  },
  {
    rosterId: "BA013",
    title: "Rustic ciabatta loaves",
    category: "Breads & baking",
    cuisine: "Italian",
    tier: "cuisine-anchor",
    description:
      "Two flour-dusted Italian slipper loaves with crackly crusts and an irregular open crumb for sandwiches or olive oil.",
    yieldQuantity: 2,
    yieldUnit: "small loaves",
    prepMinutes: 45,
    cookMinutes: 25,
    inactiveMinutes: 960,
    artworkIndex: 22,
    ingredients: [
      "3 3/4 cups (450 grams) bread flour, divided",
      "1 3/4 cups (400 grams) water, divided",
      "1/4 teaspoon plus 1 teaspoon instant yeast, divided",
      "2 teaspoons fine sea salt",
      "2 tablespoons extra-virgin olive oil",
      "Semolina or flour, for dusting",
    ],
    instructions: [
      "The night before, stir 1 3/4 cups (210 grams) flour, 3/4 cup plus 2 tablespoons (200 grams) water, and 1/4 teaspoon yeast into a thick biga. Cover and leave at cool room temperature 10 to 14 hours until domed, webbed, and aromatic.",
      "Add remaining water, yeast, flour, salt, and olive oil. Squeeze and fold until combined. Over 2 hours perform four coil-fold sets 30 minutes apart, lifting the center so ends tuck underneath, until the very wet dough becomes elastic and bubbly.",
      "Dust a work surface and two parchment rectangles generously. Ease dough out without deflating, divide in half, and use a bench scraper to nudge each into a 10-by-4-inch slipper shape. Transfer to parchment, dust, cover, and proof 45 to 60 minutes until pillowy.",
      "Heat oven to 475°F with an inverted sheet pan or baking steel inside and an empty metal pan on the lowest rack. Slide loaves and parchment onto the hot surface, pour 1 cup boiling water into the lower pan, and close the door immediately; keep face and hands clear of steam.",
      "Bake 10 minutes, remove the steam pan if safe, reduce to 450°F, and bake 12 to 16 minutes more until deep golden and 205–210°F. Cool 90 minutes. This is the batch's one true project: preferment, wet-dough folds, gentle division, steam, and overnight scheduling are intrinsic.",
    ],
    notes:
      "Ciabatta means slipper in Italian, referring to the loaf's flat elongated shape. It was developed in Veneto in the 1980s, so it is a modern Italian bread rather than an ancient rustic artifact. Its appeal is practical and familiar: the thin crisp crust and open, olive-oil-catching crumb make exceptional pressed or deli-style sandwiches, but the wet dough punishes excess flour and rough handling.",
    kitchenTestState: "desk-reviewed",
    research: {
      accessedAt: "2026-08-06",
      sources: [
        {
          publisher: "King Arthur Baking",
          title: "Rustic Italian Ciabatta",
          url: "https://www.kingarthurbaking.com/recipes/rustic-italian-ciabatta-recipe",
          rating: 4.1,
          ratingCount: 160,
          signal:
            "A 4.1/5 pattern across 160 reviews supports an overnight biga, very wet dough, irregular holes, flour-dusted slipper shapes, and strong sandwich usefulness.",
        },
        {
          publisher: "The Perfect Loaf",
          title: "Ciabatta Bread",
          url: "https://www.theperfectloaf.com/ciabatta-bread-recipe/",
          rating: null,
          ratingCount: null,
          signal:
            "A specialist bread authority reinforces high hydration, fermentation-built strength, gentle handling, abundant aeration, and a hot steamed bake as the defining technical pattern.",
        },
        {
          publisher: "BBC Good Food",
          title: "Ciabatta",
          url: "https://www.bbcgoodfood.com/recipes/ciabatta",
          rating: null,
          ratingCount: null,
          signal:
            "A broad home-cooking source corroborates strong flour, wet sticky dough, patient rise, minimal shaping, flour-dusted loaves, and a crisp open result.",
        },
      ],
      nonNegotiableTechniques: [
        "Build an aromatic overnight biga and retain high hydration.",
        "Strengthen with folds and divide gently without kneading in bench flour.",
        "Bake hot with initial steam and cool completely before cutting.",
      ],
      repeatedSuccessSignals: [
        "Dough becomes elastic bubbly and jiggly",
        "Loaves retain irregular internal holes",
        "Crust is thin crisp and deeply colored",
        "Crumb stays moist enough for sandwiches",
      ],
      repeatedFailureRisks: [
        "Adding flour to tame stickiness closes the crumb.",
        "Rough shaping presses out fermentation gases.",
        "Unsafe steam handling can cause serious burns.",
      ],
      adaptationDecision:
        "Keep the biga and high-hydration identity, use coil folds and parchment to make handling more controlled, and openly classify ciabatta as the batch's single advanced project rather than pretending it is beginner bread.",
    },
  },
  {
    rosterId: "BA014",
    title: "Rustic Italian country loaf (Pane casereccio)",
    category: "Breads & baking",
    cuisine: "Italian",
    tier: "cuisine-anchor",
    description:
      "A simple crusty round loaf with a chewy airy center for pasta, soup, bruschetta, or olive oil.",
    yieldQuantity: 1,
    yieldUnit: "round loaf",
    prepMinutes: 20,
    cookMinutes: 40,
    inactiveMinutes: 210,
    artworkIndex: 22,
    ingredients: [
      "3 1/2 cups (420 grams) bread flour",
      "1 1/2 teaspoons instant yeast",
      "2 teaspoons fine sea salt",
      "1 1/2 cups (340 grams) lukewarm water",
      "1 tablespoon extra-virgin olive oil",
      "Flour or semolina, for dusting",
    ],
    instructions: [
      "Whisk flour, yeast, and salt. Add water and olive oil and stir vigorously 2 minutes into a sticky shaggy dough with no dry flour. Cover and rest 30 minutes.",
      "With damp hands, stretch each side over the center to make one fold set. Repeat twice at 30-minute intervals, then cover and rise 60 to 90 minutes until doubled, bubbly, and jiggly.",
      "Turn onto a lightly floured surface, fold edges to the center, flip, and draw the dough toward you to create a taut round. Place seam-side down on floured parchment, cover, and proof 35 to 50 minutes until puffy.",
      "Heat oven to 475°F with a covered Dutch oven inside for 40 minutes. Score the loaf 1/2 inch deep, lower it on parchment into the pot, cover, and bake 20 minutes. Uncover, reduce to 450°F, and bake 18 to 22 minutes more until 205–210°F.",
      "Cool at least 90 minutes before slicing. The Italian phrase means household or homemade bread and does not identify one nationally fixed formula; this version is a practical country-style loaf, not a protected regional claim.",
    ],
    notes:
      "Pane casereccio literally means home-style or household bread, and Italy's regional loaves vary in flour, salt, shape, and leavening. The familiar English title leads because the useful experience is what matters: a crisp round loaf with enough chew for soup, pasta sauce, bruschetta, cheese, or olive oil. A few damp-hand folds replace sustained kneading and make this much easier than ciabatta.",
    kitchenTestState: "desk-reviewed",
    research: {
      accessedAt: "2026-08-06",
      sources: [
        {
          publisher: "Savoring Italy",
          title: "Crusty Italian Bread",
          url: "https://www.savoringitaly.com/crusty-no-knead-italian-bread/",
          rating: 5,
          ratingCount: 11,
          signal:
            "A 5/5 pattern across 11 votes supports a no-knead Italian family loaf with crisp crust, soft airy inside, Dutch-oven baking, and ordinary flour-water-yeast-salt structure.",
        },
        {
          publisher: "The Gourmet Project",
          title: "Crusty Italian Bread: Rustic Pane Casereccio",
          url: "https://www.gourmetproject.net/crusty-italian-bread-recipe/",
          rating: null,
          ratingCount: null,
          signal:
            "An Italian-focused source cautions that pane casereccio is not one specific regional loaf and supports slow flavor, crisp crust, airy crumb, and uses from bruschetta to soup and olive oil.",
        },
        {
          publisher: "Due Spaghetti",
          title: "Pane Casereccio",
          url: "https://duespaghetti.com/pane-casareccio/",
          rating: null,
          ratingCount: null,
          signal:
            "An Italian household account corroborates wet no-knead dough, high heat, golden crust, chewy interior, and serving toasted with fresh olive oil.",
        },
      ],
      nonNegotiableTechniques: [
        "Keep the dough sticky and strengthen it with damp-hand folds.",
        "Shape with surface tension without pressing out all the gas.",
        "Bake in a fully preheated covered pot and cool completely.",
      ],
      repeatedSuccessSignals: [
        "Crust is crisp thick enough to crackle and deeply brown",
        "Crumb is airy chewy and moist",
        "Loaf holds a round shape with score expansion",
        "Flavor suits both sauce and toast",
      ],
      repeatedFailureRisks: [
        "Adding flour until dry produces a dense loaf.",
        "Weak shaping lets the round spread flat.",
        "Warm cutting gums the still-setting crumb.",
      ],
      adaptationDecision:
        "Lead with the descriptive English name, avoid claiming a single pan-Italian formula, and use a same-day folded Dutch-oven method that preserves crust and chew with much less handling than the neighboring ciabatta project.",
    },
  },
  {
    rosterId: "BA015",
    title: "Golden sesame semolina bread",
    category: "Breads & baking",
    cuisine: "Sicilian Italian",
    tier: "cuisine-anchor",
    description:
      "A golden Sicilian-style loaf with a softly chewy durum-wheat crumb and a nutty sesame crust.",
    yieldQuantity: 1,
    yieldUnit: "oval loaf",
    prepMinutes: 30,
    cookMinutes: 38,
    inactiveMinutes: 135,
    artworkIndex: 22,
    ingredients: [
      "2 3/4 cups (330 grams) bread flour",
      "1 cup (170 grams) fine durum semolina flour, preferably rimacinata",
      "2 teaspoons instant yeast",
      "1 3/4 teaspoons fine sea salt",
      "1 tablespoon honey",
      "1 1/2 cups (340 grams) lukewarm water",
      "1 tablespoon extra-virgin olive oil",
      "1/2 cup sesame seeds",
    ],
    instructions: [
      "Whisk bread flour, fine semolina, yeast, and salt. Dissolve honey in water, add with olive oil, and knead 8 to 10 minutes until smooth, elastic, and slightly tacky. Fine remilled semolina is flour; coarse pasta semolina will remain gritty and absorb differently.",
      "Cover in an oiled bowl and rise 60 to 75 minutes until doubled. Shape into a taut 10-inch oval by folding the sides inward and rolling the seam closed.",
      "Spread sesame seeds on a tray. Mist the loaf lightly with water, roll all sides in seeds, and place seam-side down on parchment. Cover and proof 40 to 60 minutes until puffy and a gentle press springs back slowly.",
      "Heat oven to 425°F with an inverted sheet pan inside. Score one long 1/2-inch-deep slash, slide loaf and parchment onto the hot pan, and bake 35 to 42 minutes until dark gold and 205°F inside.",
      "Cool 90 minutes before slicing. Serve with soup, cured meats, cheese, jam, or olive oil; store cut-side down for one day, then slice and freeze.",
    ],
    notes:
      "Sicilian sesame breads use durum wheat—the hard wheat also milled for pasta—which gives the crumb its warm gold color and gentle sweetness. Shapes and formulas vary, including the coiled pane siciliano. This approachable oval keeps the defining fine semolina and abundant sesame crust without requiring sourdough, a multi-day preferment, or decorative shaping.",
    kitchenTestState: "desk-reviewed",
    research: {
      accessedAt: "2026-08-06",
      sources: [
        {
          publisher: "Milk Street",
          title: "Sicilian Semolina and Sesame Bread",
          url: "https://www.177milkstreet.com/recipes/sicilian-semolina-sesame-bread",
          rating: null,
          ratingCount: null,
          signal:
            "A test-kitchen version supports fine durum semolina, a soft fine crumb, satisfying chew, abundant sesame, and explicit explanation of semolina's pasta-wheat identity.",
        },
        {
          publisher: "Katie Parla",
          title: "Pane Siciliano al Sesamo",
          url: "https://cookbooks.katieparla.com/recipes/pane-siciliano-al-sesamo",
          rating: null,
          ratingCount: null,
          signal:
            "An Italy food authority corroborates bread flour, fine semolina, wet shaggy dough, sesame coating, and a seam-side-down bake as a recognizable Sicilian household bread.",
        },
        {
          publisher: "Epicurious",
          title: "Pane Siciliano",
          url: "https://www.epicurious.com/recipes/food/views/pane-siciliano-392142",
          rating: null,
          ratingCount: null,
          signal:
            "A respected bread-book adaptation praises semolina's sweetness and nuttiness with sesame and confirms a bread-flour blend for useful loaves, rolls, or breadsticks.",
        },
      ],
      nonNegotiableTechniques: [
        "Use fine remilled durum semolina rather than coarse pasta meal.",
        "Knead to elasticity and coat the shaped loaf generously with sesame.",
        "Score, bake to deep gold and center temperature, and cool fully.",
      ],
      repeatedSuccessSignals: [
        "Crumb is naturally golden and softly chewy",
        "Sesame crust is toasted and adheres well",
        "Loaf rises without becoming dense or gritty",
        "Durum tastes mildly sweet and nutty",
      ],
      repeatedFailureRisks: [
        "Coarse semolina produces grit and hydration errors.",
        "Dry dough limits rise and makes a hard crumb.",
        "Seeds fall off if the surface is not moistened before coating.",
      ],
      adaptationDecision:
        "Retain fine durum and abundant sesame as the cultural identity, but use commercial yeast, a familiar oval, and one-day timing so the loaf is desirable and achievable rather than a specialist sourdough exercise.",
    },
  },
];
