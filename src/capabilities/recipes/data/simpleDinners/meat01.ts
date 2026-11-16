import type { EditorialRecipe } from '../editorialRecipeCatalog';

// Original formulations; source comparisons and desk review are not kitchen tests.
export const SIMPLE_DINNER_MEAT_01: readonly EditorialRecipe[] = [
  {
    "rosterId": "DI381",
    "title": "Beef mushroom stroganoff with egg noodles",
    "description": "Golden mushrooms and tender beef in a tangy cream sauce, with peas tucked among the noodles.",
    "category": "Dinner",
    "cuisine": "Everyday home cooking",
    "tier": "household-anchor",
    "yieldQuantity": 4,
    "yieldUnit": "servings",
    "prepMinutes": 10,
    "cookMinutes": 25,
    "inactiveMinutes": 0,
    "ingredients": [
      "1 pound lean ground beef",
      "12 ounces sliced cremini mushrooms",
      "10 ounces dried wide egg noodles",
      "2 cups frozen peas",
      "1 small onion, finely diced",
      "2 cloves garlic, minced",
      "1 cup low-sodium beef broth",
      "3/4 cup sour cream",
      "1 tablespoon Dijon mustard",
      "1 tablespoon all-purpose flour",
      "1 tablespoon olive oil",
      "1/2 teaspoon salt",
      "1/4 teaspoon black pepper"
    ],
    "instructions": [
      "Bring a covered pot of water to a boil. Cook the noodles according to the package, adding peas for the last 3 minutes. Reserve 1 cup cooking water and drain.",
      "Meanwhile, heat oil in a 12-inch deep skillet. Cook beef and onion over medium-high heat for 6–8 minutes, breaking up the meat, until the beef reaches 160°F. Transfer to a plate.",
      "Cook mushrooms in the same pan for 6 minutes until their liquid evaporates. Stir in garlic and flour for 1 minute, then gradually add broth. Return beef; simmer 3 minutes until lightly thickened.",
      "Remove from heat. Stir in mustard, sour cream, salt and pepper, then noodles and peas. Loosen with reserved water a tablespoon at a time; serve immediately without boiling the sour cream."
    ],
    "notes": "Hands-on estimate: 20 minutes or less. Use a pasta pot and a 12-inch skillet. Contains wheat, egg, milk and mustard. Scale ingredients proportionally; for more than four servings use a second pan or cook in batches, allowing extra time. Keep food in a shallow layer for browning; do not double simmering time. Check tenderness and temperature, not the clock.",
    "artworkIndex": 0,
    "kitchenTestState": "desk-reviewed",
    "kitchenTestNotes": [
      "Original formulation reviewed on paper; not kitchen-tested. Boil noodles separately to control texture; sour cream goes in off heat."
    ],
    "research": {
      "accessedAt": "2026-10-16",
      "sources": [
        {
          "publisher": "Budget Bytes",
          "title": "Beef Stroganoff",
          "url": "https://www.budgetbytes.com/one-pot-beef-mushroom-stroganoff/",
          "rating": null,
          "ratingCount": null,
          "signal": "Tender noodles; dairy added after simmering."
        },
        {
          "publisher": "Good Food",
          "title": "Pasta with ham and minty pea pesto",
          "url": "https://www.bbcgoodfood.com/recipes/pasta-ham-minty-pea-pesto",
          "rating": null,
          "ratingCount": null,
          "signal": "Add peas late; reserve water to loosen sauce."
        },
        {
          "publisher": "RecipeTin Eats",
          "title": "Beef Stroganoff",
          "url": "https://www.recipetineats.com/beef-stroganoff/",
          "rating": null,
          "ratingCount": null,
          "signal": "Quick searing differs from a long braise; mustard balances sour cream gravy."
        },
        {
          "publisher": "FoodSafety.gov",
          "title": "Safe Minimum Internal Temperatures",
          "url": "https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures",
          "rating": null,
          "ratingCount": null,
          "signal": "Thermometer endpoints and rests govern doneness."
        }
      ],
      "nonNegotiableTechniques": [
        "Boil noodles separately to control texture; sour cream goes in off heat."
      ],
      "repeatedSuccessSignals": [
        "Editorial target, not reviewer consensus: Golden mushrooms and tender beef in a tangy cream sauce, with peas tucked among the noodles."
      ],
      "repeatedFailureRisks": [
        "Desk-review risk: Use a pasta pot and a 12-inch skillet. Contains wheat, egg, milk and mustard."
      ],
      "adaptationDecision": "Original everyday dinner using the cited technique comparisons. Distinct from existing mushroom stroganoff: beef gravy and peas, no dill or yogurt. Comparison decision: Ground beef is economical; separately boiled noodles give more control than the one-pot reference, and sour cream is added off heat."
    }
  },
  {
    "rosterId": "DI382",
    "title": "Cheeseburger rice skillet with peas",
    "description": "A warm skillet of beef, fluffy rice and peas under melted cheddar, brightened with chopped pickles.",
    "category": "Dinner",
    "cuisine": "Everyday home cooking",
    "tier": "household-anchor",
    "yieldQuantity": 4,
    "yieldUnit": "servings",
    "prepMinutes": 10,
    "cookMinutes": 35,
    "inactiveMinutes": 0,
    "ingredients": [
      "1 pound lean ground beef",
      "1 cup dry long-grain white rice",
      "2 cups frozen peas",
      "1 small onion, diced",
      "2 cups low-sodium beef broth",
      "1 cup shredded cheddar",
      "1/3 cup ketchup",
      "1 tablespoon yellow mustard",
      "1/3 cup chopped dill pickles",
      "1 tablespoon olive oil",
      "1/4 teaspoon black pepper"
    ],
    "instructions": [
      "Heat oil in a deep 12-inch lidded skillet. Brown beef and onion for 7 minutes, breaking up clumps, until beef reaches 160°F.",
      "Stir in rice, broth, ketchup, mustard and pepper. Bring to a boil, cover and reduce to low. Simmer 17–20 minutes until rice is almost tender.",
      "Scatter peas over the rice, cover and cook 4 minutes. If the rice is still firm and dry, add 1/4 cup water and continue covered until tender.",
      "Turn off the heat, sprinkle with cheddar and cover for 3 minutes. Top with pickles and serve generous scoops."
    ],
    "notes": "Hands-on estimate: 20 minutes or less. Use one deep lidded skillet; long-grain white rice, not brown. Contains milk and mustard; check broth. Scale ingredients proportionally; for more than four servings use a second pan or cook in batches, allowing extra time. Keep food in a shallow layer for browning; do not double simmering time. Check tenderness and temperature, not the clock.",
    "artworkIndex": 1,
    "kitchenTestState": "desk-reviewed",
    "kitchenTestNotes": [
      "Original formulation reviewed on paper; not kitchen-tested. Covered rice absorption precedes peas and cheese."
    ],
    "research": {
      "accessedAt": "2026-10-16",
      "sources": [
        {
          "publisher": "Budget Bytes",
          "title": "Beef and Tomato Rice Bowl",
          "url": "https://www.budgetbytes.com/beef-and-tomato-rice-bowl/",
          "rating": null,
          "ratingCount": null,
          "signal": "Brown beef before introducing wet ingredients."
        },
        {
          "publisher": "Budget Bytes",
          "title": "Beef Taco Skillet",
          "url": "https://www.budgetbytes.com/beef-taco-skillet/",
          "rating": null,
          "ratingCount": null,
          "signal": "Beans stretch browned beef; toppings finish separately."
        },
        {
          "publisher": "RecipeTin Eats",
          "title": "Beef and Rice with Veggies",
          "url": "https://www.recipetineats.com/ground-beef-and-rice-recipe/",
          "rating": null,
          "ratingCount": null,
          "signal": "Rice grade and covered absorption matter; brown rice is not a quick swap."
        },
        {
          "publisher": "FoodSafety.gov",
          "title": "Safe Minimum Internal Temperatures",
          "url": "https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures",
          "rating": null,
          "ratingCount": null,
          "signal": "Thermometer endpoints and rests govern doneness."
        }
      ],
      "nonNegotiableTechniques": [
        "Covered rice absorption precedes peas and cheese."
      ],
      "repeatedSuccessSignals": [
        "Editorial target, not reviewer consensus: A warm skillet of beef, fluffy rice and peas under melted cheddar, brightened with chopped pickles."
      ],
      "repeatedFailureRisks": [
        "Desk-review risk: Use one deep lidded skillet; long-grain white rice, not brown. Contains milk and mustard; check broth."
      ],
      "adaptationDecision": "Original everyday dinner using the cited technique comparisons. Different format and cooking path from grilled cheeseburgers; complete one-pan rice meal. Comparison decision: Keep the absorption method, use white rice, and finish with peas, cheddar and pickles rather than a burger bun."
    }
  },
  {
    "rosterId": "DI383",
    "title": "Beef cabbage tomato skillet with bulgur",
    "description": "Sweet cabbage and tomato mingle with beef and nutty bulgur in a soft, spoonable supper.",
    "category": "Dinner",
    "cuisine": "Everyday home cooking",
    "tier": "household-anchor",
    "yieldQuantity": 4,
    "yieldUnit": "servings",
    "prepMinutes": 10,
    "cookMinutes": 30,
    "inactiveMinutes": 0,
    "ingredients": [
      "1 pound lean ground beef",
      "1 cup medium bulgur",
      "4 cups thinly sliced green cabbage",
      "1 small onion, diced",
      "1 can (14.5 ounces) diced tomatoes with juices",
      "1 1/2 cups low-sodium beef broth",
      "2 cloves garlic, minced",
      "1 teaspoon sweet paprika",
      "1 tablespoon cider vinegar",
      "1 tablespoon olive oil",
      "1/2 teaspoon salt",
      "1/4 teaspoon black pepper"
    ],
    "instructions": [
      "Heat oil in a deep lidded skillet. Cook beef and onion 7 minutes over medium-high heat, breaking up meat, until beef reaches 160°F.",
      "Add garlic, paprika and cabbage. Stir for 3 minutes to begin wilting the cabbage.",
      "Add bulgur, tomatoes, broth, salt and pepper. Bring to a simmer, cover and cook on low 12–15 minutes, stirring once, until the bulgur is tender.",
      "Uncover and stir in vinegar. If liquid remains, simmer uncovered for 2 minutes; if grains need more cooking, add 1/4 cup water and cover again briefly. Divide among individual plates."
    ],
    "notes": "Hands-on estimate: 20 minutes or less. One deep skillet. Contains wheat. Scale ingredients proportionally; for more than four servings use a second pan or cook in batches, allowing extra time. Keep food in a shallow layer for browning; do not double simmering time. Check tenderness and temperature, not the clock.",
    "artworkIndex": 2,
    "kitchenTestState": "desk-reviewed",
    "kitchenTestNotes": [
      "Original formulation reviewed on paper; not kitchen-tested. Specify medium bulgur; fine or coarse grades change absorption and timing."
    ],
    "research": {
      "accessedAt": "2026-10-16",
      "sources": [
        {
          "publisher": "Budget Bytes",
          "title": "Beef and Cabbage Stir Fry",
          "url": "https://www.budgetbytes.com/beef-cabbage-stir-fry/",
          "rating": null,
          "ratingCount": null,
          "signal": "Thin vegetables cook after beef browns."
        },
        {
          "publisher": "Budget Bytes",
          "title": "Beef and Tomato Rice Bowl",
          "url": "https://www.budgetbytes.com/beef-and-tomato-rice-bowl/",
          "rating": null,
          "ratingCount": null,
          "signal": "Brown beef before introducing wet ingredients."
        },
        {
          "publisher": "RecipeTin Eats",
          "title": "Beef and Rice with Veggies",
          "url": "https://www.recipetineats.com/ground-beef-and-rice-recipe/",
          "rating": null,
          "ratingCount": null,
          "signal": "Rice grade and covered absorption matter; brown rice is not a quick swap."
        },
        {
          "publisher": "FoodSafety.gov",
          "title": "Safe Minimum Internal Temperatures",
          "url": "https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures",
          "rating": null,
          "ratingCount": null,
          "signal": "Thermometer endpoints and rests govern doneness."
        }
      ],
      "nonNegotiableTechniques": [
        "Specify medium bulgur; fine or coarse grades change absorption and timing."
      ],
      "repeatedSuccessSignals": [
        "Editorial target, not reviewer consensus: Sweet cabbage and tomato mingle with beef and nutty bulgur in a soft, spoonable supper."
      ],
      "repeatedFailureRisks": [
        "Desk-review risk: One deep skillet. Contains wheat."
      ],
      "adaptationDecision": "Original everyday dinner using the cited technique comparisons. Unlike existing Turkish beef bulgur, cabbage and paprika dominate; no peppers, spinach or yogurt. Comparison decision: Use medium bulgur rather than rice; cabbage and paprika supply the vegetable and seasoning base."
    }
  },
  {
    "rosterId": "DI384",
    "title": "Beef zucchini taco rice",
    "description": "Mild cumin beef, juicy zucchini and corn folded into tomato rice with a little melted cheese.",
    "category": "Dinner",
    "cuisine": "Everyday home cooking",
    "tier": "household-anchor",
    "yieldQuantity": 4,
    "yieldUnit": "servings",
    "prepMinutes": 10,
    "cookMinutes": 35,
    "inactiveMinutes": 0,
    "ingredients": [
      "1 pound lean ground beef",
      "1 cup dry long-grain white rice",
      "2 medium zucchini, cut into 1/2-inch pieces",
      "1 cup frozen corn",
      "1 cup mild tomato salsa",
      "1 3/4 cups low-sodium beef broth",
      "1 teaspoon ground cumin",
      "1 teaspoon sweet paprika",
      "3/4 cup shredded Monterey Jack",
      "1 lime, cut into wedges",
      "1 tablespoon olive oil"
    ],
    "instructions": [
      "Heat oil in a deep lidded skillet; brown beef with cumin and paprika for 7 minutes, breaking it into small pieces, until it reaches 160°F.",
      "Stir in rice, salsa and broth. Bring to a boil, cover and simmer on low for 15 minutes.",
      "Add zucchini and corn, folding them gently into the rice. Cover and simmer 7–9 minutes until the rice and zucchini are tender; add a splash of water if dry.",
      "Remove from heat, scatter cheese over the top and cover for 3 minutes. Serve with lime wedges."
    ],
    "notes": "Hands-on estimate: 20 minutes or less. One deep skillet. Choose mild salsa; contains milk. Scale ingredients proportionally; for more than four servings use a second pan or cook in batches, allowing extra time. Keep food in a shallow layer for browning; do not double simmering time. Check tenderness and temperature, not the clock.",
    "artworkIndex": 3,
    "kitchenTestState": "desk-reviewed",
    "kitchenTestNotes": [
      "Original formulation reviewed on paper; not kitchen-tested. Add zucchini late so it does not collapse during rice cooking."
    ],
    "research": {
      "accessedAt": "2026-10-16",
      "sources": [
        {
          "publisher": "Budget Bytes",
          "title": "Beef Taco Skillet",
          "url": "https://www.budgetbytes.com/beef-taco-skillet/",
          "rating": null,
          "ratingCount": null,
          "signal": "Beans stretch browned beef; toppings finish separately."
        },
        {
          "publisher": "Budget Bytes",
          "title": "Beef and Tomato Rice Bowl",
          "url": "https://www.budgetbytes.com/beef-and-tomato-rice-bowl/",
          "rating": null,
          "ratingCount": null,
          "signal": "Brown beef before introducing wet ingredients."
        },
        {
          "publisher": "RecipeTin Eats",
          "title": "Beef and Rice with Veggies",
          "url": "https://www.recipetineats.com/ground-beef-and-rice-recipe/",
          "rating": null,
          "ratingCount": null,
          "signal": "Rice grade and covered absorption matter; brown rice is not a quick swap."
        },
        {
          "publisher": "FoodSafety.gov",
          "title": "Safe Minimum Internal Temperatures",
          "url": "https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures",
          "rating": null,
          "ratingCount": null,
          "signal": "Thermometer endpoints and rests govern doneness."
        }
      ],
      "nonNegotiableTechniques": [
        "Add zucchini late so it does not collapse during rice cooking."
      ],
      "repeatedSuccessSignals": [
        "Editorial target, not reviewer consensus: Mild cumin beef, juicy zucchini and corn folded into tomato rice with a little melted cheese."
      ],
      "repeatedFailureRisks": [
        "Desk-review risk: One deep skillet. Choose mild salsa; contains milk."
      ],
      "adaptationDecision": "Original everyday dinner using the cited technique comparisons. Distinct from tortilla-layer beef taco casserole; this is an absorption-cooked rice dinner. Comparison decision: Delay zucchini until rice is partly cooked so vegetables do not become watery."
    }
  },
  {
    "rosterId": "DI385",
    "title": "Steak mushroom pepper flatbreads",
    "description": "Crisp flatbreads carry sliced steak, browned mushrooms and sweet peppers beneath bubbling mozzarella.",
    "category": "Dinner",
    "cuisine": "Everyday home cooking",
    "tier": "household-anchor",
    "yieldQuantity": 4,
    "yieldUnit": "servings",
    "prepMinutes": 12,
    "cookMinutes": 30,
    "inactiveMinutes": 0,
    "ingredients": [
      "1 pound sirloin steak, 3/4 inch thick",
      "2 large naan flatbreads (about 6 ounces each)",
      "8 ounces sliced mushrooms",
      "2 bell peppers, thinly sliced",
      "1 cup shredded mozzarella",
      "1/3 cup plain Greek yogurt",
      "1 tablespoon Dijon mustard",
      "1 teaspoon dried oregano",
      "2 tablespoons olive oil, divided",
      "1/2 teaspoon salt",
      "1/4 teaspoon black pepper"
    ],
    "instructions": [
      "Heat the oven to 425°F. Season steak with salt and pepper. Heat half the oil in a large skillet and sear steak 4–5 minutes per side, to 145°F; rest on a clean board at least 3 minutes.",
      "Add remaining oil to the skillet. Cook mushrooms and peppers for 7–8 minutes until softened and any mushroom water has evaporated. Stir in oregano.",
      "Mix yogurt and mustard. Put both naan on an 18-by-13-inch sheet pan, spread with the yogurt mixture, and divide vegetables and mozzarella over them. Bake 6–8 minutes until edges crisp and cheese melts.",
      "Slice rested steak thinly across the grain. Lay over the hot flatbreads, cut each into two portions and serve."
    ],
    "notes": "Hands-on estimate: 20 minutes or less. Skillet plus large sheet pan. Contains wheat, milk and mustard. Do not crowd the naan. Scale ingredients proportionally; for more than four servings use a second pan or cook in batches, allowing extra time. Keep food in a shallow layer for browning; do not double simmering time. Check tenderness and temperature, not the clock.",
    "artworkIndex": 4,
    "kitchenTestState": "desk-reviewed",
    "kitchenTestNotes": [
      "Original formulation reviewed on paper; not kitchen-tested. Cook steak separately; add after baking to protect its texture."
    ],
    "research": {
      "accessedAt": "2026-10-16",
      "sources": [
        {
          "publisher": "Good Food",
          "title": "Chilli and lime steak salad",
          "url": "https://www.bbcgoodfood.com/recipes/oriental-steak-salad/",
          "rating": null,
          "ratingCount": null,
          "signal": "Rest steak before slicing onto dressed leaves."
        },
        {
          "publisher": "Budget Bytes",
          "title": "Hearty Black Bean Quesadillas",
          "url": "https://www.budgetbytes.com/hearty-black-bean-quesadillas/",
          "rating": null,
          "ratingCount": null,
          "signal": "Moderate heat melts cheese as tortillas crisp."
        },
        {
          "publisher": "Budget Bytes",
          "title": "Easy Caprese Pizza",
          "url": "https://www.budgetbytes.com/easy-caprese-pizza/",
          "rating": null,
          "ratingCount": null,
          "signal": "Cooked naan makes a quick baked base; cheese needs only a short bake."
        },
        {
          "publisher": "FoodSafety.gov",
          "title": "Safe Minimum Internal Temperatures",
          "url": "https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures",
          "rating": null,
          "ratingCount": null,
          "signal": "Thermometer endpoints and rests govern doneness."
        }
      ],
      "nonNegotiableTechniques": [
        "Cook steak separately; add after baking to protect its texture."
      ],
      "repeatedSuccessSignals": [
        "Editorial target, not reviewer consensus: Crisp flatbreads carry sliced steak, browned mushrooms and sweet peppers beneath bubbling mozzarella."
      ],
      "repeatedFailureRisks": [
        "Desk-review risk: Skillet plus large sheet pan. Contains wheat, milk and mustard. Do not crowd the naan."
      ],
      "adaptationDecision": "Original everyday dinner using the cited technique comparisons. Unlike cheesesteaks, these have a crisp open base, yogurt spread and mushrooms, with no sandwich roll. Comparison decision: Pre-cooked naan removes dough work; steak is placed on after the cheese bake to protect its doneness."
    }
  }
];
