import type { EditorialRecipe } from '../editorialRecipeCatalog';

// Original formulations; source comparisons and desk review are not kitchen tests.
export const SIMPLE_DINNER_VEGETARIAN_01: readonly EditorialRecipe[] = [
  {
    "rosterId": "DI451",
    "title": "Broccoli cheddar rice and white bean skillet",
    "description": "Tender rice, creamy white beans and little broccoli florets tucked into a mellow cheddar supper.",
    "category": "Dinner",
    "cuisine": "Everyday vegetarian",
    "tier": "household-anchor",
    "yieldQuantity": 4,
    "yieldUnit": "servings",
    "prepMinutes": 10,
    "cookMinutes": 35,
    "inactiveMinutes": 0,
    "ingredients": [
      "1 cup long-grain white rice",
      "2 cans (15 ounces each) cannellini beans, drained and rinsed",
      "12 ounces broccoli florets, cut into 1/2-inch pieces",
      "1 small onion, finely diced",
      "2 cups low-sodium vegetable broth",
      "1/2 cup milk",
      "6 ounces vegetarian cheddar, grated",
      "1 teaspoon Dijon mustard",
      "1 tablespoon olive oil",
      "1/4 teaspoon salt",
      "1/4 teaspoon black pepper"
    ],
    "instructions": [
      "Heat the oil in a deep 12-inch lidded skillet over medium heat. Cook the onion for 4 minutes, stirring, until softened.",
      "Stir in the rice, broth, salt and pepper. Bring to a boil, cover and simmer on low for 12 minutes.",
      "Scatter broccoli and beans over the rice without stirring. Cover and cook for 7–9 minutes, until rice is tender and broccoli is easily pierced. Add 2 tablespoons water and cook 2 minutes longer if the pan dries before rice softens.",
      "Remove from heat and rest covered for 5 minutes. Fold in milk, mustard and cheddar until creamy; serve."
    ],
    "notes": "Hands-on: about 16 minutes. Equipment: deep lidded skillet. Choose cheese and pesto labeled vegetarian when used. Scale ingredients with servings, but keep pan depth and cooking cues unchanged; use another batch when the pan becomes crowded. Timing includes all listed meal components; larger batches take longer.",
    "artworkIndex": 0,
    "kitchenTestState": "desk-reviewed",
    "kitchenTestNotes": [
      "Original formulation reviewed on paper; not kitchen-tested."
    ],
    "research": {
      "accessedAt": "2026-10-16",
      "sources": [
        {
          "publisher": "Budget Bytes",
          "title": "Tomato Herb Rice with White Beans and Spinach",
          "url": "https://www.budgetbytes.com/tomato-herb-rice-with-white-beans-and-spinach/",
          "rating": null,
          "ratingCount": null,
          "signal": "A covered heavy pan and a final rest support evenly cooked white rice; brown rice is not a direct substitution."
        },
        {
          "publisher": "Budget Bytes",
          "title": "Easy Broccoli Rice",
          "url": "https://www.budgetbytes.com/easy-cheesy-broccoli-rice/",
          "rating": null,
          "ratingCount": null,
          "signal": "Fresh broccoli needs cooking; cheese is incorporated after the rice cooks."
        },
        {
          "publisher": "Budget Bytes",
          "title": "Broccoli Cheddar Orzo",
          "url": "https://www.budgetbytes.com/broccoli-cheddar-orzo/",
          "rating": null,
          "ratingCount": null,
          "signal": "Stir simmering orzo to prevent sticking and melt cheese with residual heat."
        }
      ],
      "nonNegotiableTechniques": [
        "Cook rice before folding in cheese."
      ],
      "repeatedSuccessSignals": [
        "Editorial comparison, not reviewer consensus: Cook rice before folding in cheese."
      ],
      "repeatedFailureRisks": [
        "Editorial risk assessment, not a claimed pattern of reviews: A wide uncovered pan loses water before rice softens."
      ],
      "adaptationDecision": "White beans make a complete meatless meal rather than a chicken-casserole variation; use a smaller rice load and generous broccoli."
    }
  },
  {
    "rosterId": "DI452",
    "title": "Spinach ricotta lemon pasta",
    "description": "Lemon-scented ricotta coats spirals of pasta with tender spinach and sweet peas.",
    "category": "Dinner",
    "cuisine": "Everyday vegetarian",
    "tier": "household-anchor",
    "yieldQuantity": 4,
    "yieldUnit": "servings",
    "prepMinutes": 10,
    "cookMinutes": 20,
    "inactiveMinutes": 0,
    "ingredients": [
      "12 ounces fusilli",
      "15 ounces vegetarian ricotta",
      "5 ounces baby spinach",
      "2 cups frozen peas",
      "1 lemon, zest and juice",
      "2 tablespoons olive oil",
      "2 garlic cloves, minced",
      "1/2 teaspoon salt",
      "1/4 teaspoon black pepper"
    ],
    "instructions": [
      "Bring a large pot of water to a boil. Cook fusilli according to its package, adding peas for the final 3 minutes. Reserve 1 cup cooking water, then drain.",
      "While pasta cooks, stir ricotta, lemon zest, the lemon juice, salt and pepper in a serving bowl.",
      "Return the pot to medium-low heat, add oil and garlic, and stir for 30 seconds. Add spinach and 2 tablespoons reserved water; cover for 1 minute, then stir until wilted.",
      "Take the pot off the heat. Fold in pasta, peas and ricotta mixture, loosening with reserved water a little at a time until creamy. Divide immediately among serving plates."
    ],
    "notes": "Hands-on: about 15 minutes. Equipment: large pot and mixing bowl. Choose cheese and pesto labeled vegetarian when used. Scale ingredients with servings, but keep pan depth and cooking cues unchanged; use another batch when the pan becomes crowded. Timing includes all listed meal components; larger batches take longer.",
    "artworkIndex": 1,
    "kitchenTestState": "desk-reviewed",
    "kitchenTestNotes": [
      "Original formulation reviewed on paper; not kitchen-tested."
    ],
    "research": {
      "accessedAt": "2026-10-16",
      "sources": [
        {
          "publisher": "Budget Bytes",
          "title": "Creamy Spinach Artichoke Pasta",
          "url": "https://www.budgetbytes.com/20-minute-creamy-spinach-artichoke-pasta/",
          "rating": null,
          "ratingCount": null,
          "signal": "Drain artichokes well; gentle heat protects dairy sauces and fresh spinach wilts at the finish."
        },
        {
          "publisher": "Budget Bytes",
          "title": "Creamy Mushroom Herb Pasta",
          "url": "https://www.budgetbytes.com/creamy-mushroom-herb-pasta/",
          "rating": null,
          "ratingCount": null,
          "signal": "Evaporate mushroom liquid before adding flour; cook pasta just to tenderness before saucing."
        },
        {
          "publisher": "Budget Bytes",
          "title": "Gnocchi with Spring Vegetables",
          "url": "https://www.budgetbytes.com/gnocchi-with-spring-vegetables/",
          "rating": null,
          "ratingCount": null,
          "signal": "Shelf-stable gnocchi withstand skillet cooking; peas and lemon are added near the finish."
        }
      ],
      "nonNegotiableTechniques": [
        "Loosen ricotta with hot pasta water off heat."
      ],
      "repeatedSuccessSignals": [
        "Editorial comparison, not reviewer consensus: Loosen ricotta with hot pasta water off heat."
      ],
      "repeatedFailureRisks": [
        "Editorial risk assessment, not a claimed pattern of reviews: Boiling ricotta makes a dry grainy coating."
      ],
      "adaptationDecision": "No stuffed pasta, baked filling or long sauce; peas and a full tub of ricotta provide dinner substance."
    }
  },
  {
    "rosterId": "DI453",
    "title": "Black bean sweet potato enchilada skillet",
    "description": "Soft tortillas soak up mild red sauce around black beans and tender sweet potato under melted cheddar.",
    "category": "Dinner",
    "cuisine": "Everyday vegetarian",
    "tier": "household-anchor",
    "yieldQuantity": 4,
    "yieldUnit": "servings",
    "prepMinutes": 10,
    "cookMinutes": 30,
    "inactiveMinutes": 0,
    "ingredients": [
      "1 pound sweet potatoes, peeled and cut into 1/2-inch cubes",
      "2 cans (15 ounces each) black beans, drained and rinsed",
      "8 small corn tortillas, cut into wide strips",
      "1 1/2 cups mild vegetarian enchilada sauce",
      "1 cup frozen corn",
      "4 ounces vegetarian cheddar, grated",
      "1 teaspoon ground cumin",
      "1 tablespoon olive oil",
      "3/4 cup water",
      "1/4 teaspoon salt"
    ],
    "instructions": [
      "Heat oil in a deep lidded skillet. Add sweet potato, cumin and salt; stir over medium heat for 3 minutes.",
      "Pour in water, cover and simmer for 12–15 minutes, stirring once, until sweet potato is tender all the way through. If needed add 2 tablespoons water and continue until tender.",
      "Stir in beans, corn and enchilada sauce. Simmer uncovered for 5 minutes until hot, then fold in tortilla strips.",
      "Scatter cheese over the top. Cover on low for 3 minutes, turn off heat and stand 2 minutes before spooning onto serving plates."
    ],
    "notes": "Hands-on: about 17 minutes. Equipment: deep lidded skillet. Choose cheese and pesto labeled vegetarian when used. Scale ingredients with servings, but keep pan depth and cooking cues unchanged; use another batch when the pan becomes crowded. Timing includes all listed meal components; larger batches take longer.",
    "artworkIndex": 2,
    "kitchenTestState": "desk-reviewed",
    "kitchenTestNotes": [
      "Original formulation reviewed on paper; not kitchen-tested."
    ],
    "research": {
      "accessedAt": "2026-10-16",
      "sources": [
        {
          "publisher": "Budget Bytes",
          "title": "Sweet Potato Black Bean Skillet",
          "url": "https://www.budgetbytes.com/sweet-potato-black-bean-skillet/",
          "rating": null,
          "ratingCount": null,
          "signal": "Small sweet-potato pieces cook more predictably; tenderness matters more than the short published timer."
        },
        {
          "publisher": "Budget Bytes",
          "title": "Hearty Black Bean Quesadillas",
          "url": "https://www.budgetbytes.com/hearty-black-bean-quesadillas/",
          "rating": null,
          "ratingCount": null,
          "signal": "Drained beans avoid a wet filling; moderate skillet heat melts cheese before tortillas burn."
        },
        {
          "publisher": "Budget Bytes",
          "title": "Tomato Herb Rice with White Beans and Spinach",
          "url": "https://www.budgetbytes.com/tomato-herb-rice-with-white-beans-and-spinach/",
          "rating": null,
          "ratingCount": null,
          "signal": "A covered heavy pan and a final rest support evenly cooked white rice; brown rice is not a direct substitution."
        }
      ],
      "nonNegotiableTechniques": [
        "Steam sweet potato until tender before adding acidic sauce."
      ],
      "repeatedSuccessSignals": [
        "Editorial comparison, not reviewer consensus: Steam sweet potato until tender before adding acidic sauce."
      ],
      "repeatedFailureRisks": [
        "Editorial risk assessment, not a claimed pattern of reviews: Acidic sauce and large cubes can leave a hard center."
      ],
      "adaptationDecision": "A soft tortilla casserole texture distinguishes this from crispy tostadas and from the separate nacho dinner."
    }
  },
  {
    "rosterId": "DI454",
    "title": "Chickpea spinach coconut rice",
    "description": "Fragrant coconut rice with chickpeas, green spinach and a bright squeeze of lime.",
    "category": "Dinner",
    "cuisine": "Everyday vegetarian",
    "tier": "household-anchor",
    "yieldQuantity": 4,
    "yieldUnit": "servings",
    "prepMinutes": 10,
    "cookMinutes": 35,
    "inactiveMinutes": 0,
    "ingredients": [
      "1 cup basmati rice, rinsed",
      "2 cans (15 ounces each) chickpeas, drained and rinsed",
      "1 can (13.5 ounces) light coconut milk",
      "3/4 cup water",
      "5 ounces baby spinach",
      "1 small onion, diced",
      "1 teaspoon mild curry powder",
      "1 lime, juiced",
      "1 tablespoon vegetable oil",
      "1/2 teaspoon salt"
    ],
    "instructions": [
      "Warm oil in a heavy lidded pot over medium heat. Soften onion for 4 minutes, then stir in curry powder for 30 seconds.",
      "Add rice, coconut milk, water, salt and chickpeas. Bring just to a simmer, cover and lower heat. Cook for 17–20 minutes without lifting the lid repeatedly.",
      "Check a grain: if still chalky add 2 tablespoons water, cover and cook another 3 minutes. Once tender, scatter spinach over the top, cover and remove from heat for 5 minutes.",
      "Fold spinach through the rice and add half the lime juice. Serve with remaining juice at the table."
    ],
    "notes": "Hands-on: about 14 minutes. Equipment: heavy lidded pot. Choose cheese and pesto labeled vegetarian when used. Scale ingredients with servings, but keep pan depth and cooking cues unchanged; use another batch when the pan becomes crowded. Timing includes all listed meal components; larger batches take longer.",
    "artworkIndex": 3,
    "kitchenTestState": "desk-reviewed",
    "kitchenTestNotes": [
      "Original formulation reviewed on paper; not kitchen-tested."
    ],
    "research": {
      "accessedAt": "2026-10-16",
      "sources": [
        {
          "publisher": "Budget Bytes",
          "title": "Tomato Herb Rice with White Beans and Spinach",
          "url": "https://www.budgetbytes.com/tomato-herb-rice-with-white-beans-and-spinach/",
          "rating": null,
          "ratingCount": null,
          "signal": "A covered heavy pan and a final rest support evenly cooked white rice; brown rice is not a direct substitution."
        },
        {
          "publisher": "Budget Bytes",
          "title": "Creamy Coconut Curry Lentils with Spinach",
          "url": "https://www.budgetbytes.com/creamy-coconut-curry-lentils-with-spinach/",
          "rating": null,
          "ratingCount": null,
          "signal": "The method separates legume cooking from coconut-sauce finishing and folds spinach in after heating; mild curry powder is an explicit option."
        },
        {
          "publisher": "Cookie and Kate",
          "title": "Best Lentil Soup",
          "url": "https://cookieandkate.com/best-lentil-soup-recipe/",
          "rating": null,
          "ratingCount": null,
          "signal": "Aromatics precede lentils, greens finish later, and lemon brightens the finished pot."
        }
      ],
      "nonNegotiableTechniques": [
        "Keep coconut rice at a gentle covered simmer."
      ],
      "repeatedSuccessSignals": [
        "Editorial comparison, not reviewer consensus: Keep coconut rice at a gentle covered simmer."
      ],
      "repeatedFailureRisks": [
        "Editorial risk assessment, not a claimed pattern of reviews: Vigorous boiling can scorch the bottom before the grain cooks."
      ],
      "adaptationDecision": "This is a lightly spiced rice pilaf, not the existing tomato-based chickpea curry."
    }
  },
  {
    "rosterId": "DI455",
    "title": "Mushroom pea creamy orzo",
    "description": "Small pasta pearls simmer with browned mushrooms and peas in a soft, creamy sauce.",
    "category": "Dinner",
    "cuisine": "Everyday vegetarian",
    "tier": "household-anchor",
    "yieldQuantity": 4,
    "yieldUnit": "servings",
    "prepMinutes": 10,
    "cookMinutes": 30,
    "inactiveMinutes": 0,
    "ingredients": [
      "12 ounces mushrooms, sliced",
      "1 1/2 cups orzo",
      "2 cups frozen peas",
      "3 1/2 cups low-sodium vegetable broth",
      "4 ounces cream cheese",
      "1 small onion, diced",
      "2 garlic cloves, minced",
      "1 teaspoon dried thyme",
      "2 tablespoons olive oil",
      "1/4 teaspoon salt",
      "1/4 teaspoon black pepper"
    ],
    "instructions": [
      "Heat oil in a deep 12-inch skillet over medium-high heat. Cook mushrooms and onion for 7–8 minutes, stirring occasionally, until mushroom liquid evaporates.",
      "Add garlic, thyme and orzo; stir for 1 minute. Pour in broth with salt and pepper and bring to a simmer.",
      "Cook uncovered over medium-low heat for 10–12 minutes, stirring frequently along the bottom. Add peas for the final 4 minutes. Add water 2 tablespoons at a time only if pasta is still firm and liquid has gone.",
      "When orzo is tender, remove from heat and stir in cream cheese until smooth. Let stand 2 minutes and serve."
    ],
    "notes": "Hands-on: about 19 minutes. Equipment: deep skillet. Choose cheese and pesto labeled vegetarian when used. Scale ingredients with servings, but keep pan depth and cooking cues unchanged; use another batch when the pan becomes crowded. Timing includes all listed meal components; larger batches take longer.",
    "artworkIndex": 4,
    "kitchenTestState": "desk-reviewed",
    "kitchenTestNotes": [
      "Original formulation reviewed on paper; not kitchen-tested."
    ],
    "research": {
      "accessedAt": "2026-10-16",
      "sources": [
        {
          "publisher": "Budget Bytes",
          "title": "Creamy Mushroom Herb Pasta",
          "url": "https://www.budgetbytes.com/creamy-mushroom-herb-pasta/",
          "rating": null,
          "ratingCount": null,
          "signal": "Evaporate mushroom liquid before adding flour; cook pasta just to tenderness before saucing."
        },
        {
          "publisher": "Budget Bytes",
          "title": "Broccoli Cheddar Orzo",
          "url": "https://www.budgetbytes.com/broccoli-cheddar-orzo/",
          "rating": null,
          "ratingCount": null,
          "signal": "Stir simmering orzo to prevent sticking and melt cheese with residual heat."
        },
        {
          "publisher": "Budget Bytes",
          "title": "Creamy Spinach Artichoke Pasta",
          "url": "https://www.budgetbytes.com/20-minute-creamy-spinach-artichoke-pasta/",
          "rating": null,
          "ratingCount": null,
          "signal": "Drain artichokes well; gentle heat protects dairy sauces and fresh spinach wilts at the finish."
        }
      ],
      "nonNegotiableTechniques": [
        "Brown mushrooms before simmering pasta; stir the bottom during absorption."
      ],
      "repeatedSuccessSignals": [
        "Editorial comparison, not reviewer consensus: Brown mushrooms before simmering pasta; stir the bottom during absorption."
      ],
      "repeatedFailureRisks": [
        "Editorial risk assessment, not a claimed pattern of reviews: Unstirred orzo sticks while the surface remains wet."
      ],
      "adaptationDecision": "A substantial pea load and cream cheese yield a one-pan supper distinct from wild-mushroom risotto and mushroom noodle stroganoff."
    }
  }
];
