import type { EditorialRecipe } from '../editorialRecipeCatalog';

// Original formulations; source comparisons and desk review are not kitchen tests.
export const SIMPLE_DINNER_POULTRY_06: readonly EditorialRecipe[] = [
  {
    "rosterId": "DI356",
    "title": "Chicken mushroom barley soup",
    "description": "A hearty broth with tender barley, browned mushrooms, chicken and spinach.",
    "category": "Dinner",
    "cuisine": "Contemporary American",
    "tier": "household-anchor",
    "yieldQuantity": 4,
    "yieldUnit": "servings",
    "prepMinutes": 10,
    "cookMinutes": 30,
    "inactiveMinutes": 0,
    "ingredients": [
      "1 tablespoon olive oil",
      "8 ounces presliced mushrooms",
      "1 small onion, diced",
      "2 carrots, thinly sliced",
      "3/4 cup quick-cooking barley, labeled 10–12 minutes",
      "5 cups low-sodium chicken broth",
      "2 cups diced cooked chicken",
      "1/2 teaspoon dried thyme",
      "5 ounces baby spinach",
      "1 tablespoon lemon juice"
    ],
    "instructions": [
      "Heat oil in a large pot over medium-high heat. Cook mushrooms and onion for 7–8 minutes until mushroom liquid evaporates and edges brown.",
      "Add carrots, thyme and broth. Bring to a simmer and cook 5 minutes, then stir in quick-cooking barley.",
      "Simmer for the barley package time, usually 10–12 minutes, stirring occasionally. Add chicken for the last 5 minutes and confirm it reaches 165°F.",
      "When barley and carrots are tender, stir in spinach until wilted and finish with lemon juice. Divide among serving bowls. Ordinary pearl barley takes longer and is not a time-neutral substitute."
    ],
    "notes": "Quick-cooking barley gives the soup a chewy grain base; mushrooms are browned before broth rather than boiled from raw. Estimated hands-on work: 18 minutes. Timing includes the stated accompaniments and assumes the purchased prepared ingredients listed. This original formulation is desk-reviewed, not kitchen-tested. When increasing servings, preserve pan area or cook in batches and allow extra time; check doneness independently of the clock.",
    "artworkIndex": 1,
    "kitchenTestState": "desk-reviewed",
    "research": {
      "accessedAt": "2026-10-16",
      "sources": [
        {
          "publisher": "Budget Bytes",
          "title": "Vegetable Barley Soup",
          "url": "https://www.budgetbytes.com/vegetable-barley-soup/",
          "rating": null,
          "ratingCount": null,
          "signal": "Pearled barley takes a long simmer; the quick product is explicitly required in this adaptation."
        },
        {
          "publisher": "Budget Bytes",
          "title": "Homemade Mushroom Soup",
          "url": "https://www.budgetbytes.com/creamy-mushroom-soup/",
          "rating": null,
          "ratingCount": null,
          "signal": "Evaporate mushroom moisture before adding flour and broth."
        },
        {
          "publisher": "Budget Bytes",
          "title": "The Best Homemade Chicken Noodle Soup",
          "url": "https://www.budgetbytes.com/chicken-noodle-soup/",
          "rating": null,
          "ratingCount": null,
          "signal": "Soften aromatic vegetables before broth; noodles cook after chicken."
        }
      ],
      "nonNegotiableTechniques": [
        "Simmer for the barley package time, usually 10–12 minutes, stirring occasionally. Add chicken for the last 5 minutes and confirm it reaches 165°F."
      ],
      "repeatedSuccessSignals": [
        "The linked component and technique references informed this formulation; no reader consensus or kitchen results for this original recipe are claimed."
      ],
      "repeatedFailureRisks": [
        "Standard pearl barley may require 40 minutes or more."
      ],
      "adaptationDecision": "Quick-cooking barley gives the soup a chewy grain base; mushrooms are browned before broth rather than boiled from raw."
    }
  },
  {
    "rosterId": "DI357",
    "title": "Turkey pesto pita melts with tomato salad",
    "description": "Warm pita pockets with turkey, basil pesto and melting mozzarella, beside a bright tomato salad.",
    "category": "Dinner",
    "cuisine": "Contemporary American",
    "tier": "household-anchor",
    "yieldQuantity": 4,
    "yieldUnit": "servings",
    "prepMinutes": 10,
    "cookMinutes": 15,
    "inactiveMinutes": 0,
    "ingredients": [
      "4 whole-wheat pita breads, 6 inches",
      "12 ounces sliced cooked turkey breast",
      "1/4 cup basil pesto",
      "3/4 cup shredded mozzarella",
      "2 cups baby spinach",
      "1 pint cherry tomatoes, halved",
      "1 cucumber, diced",
      "1 tablespoon red wine vinegar",
      "1 tablespoon olive oil",
      "1/4 teaspoon fine salt"
    ],
    "instructions": [
      "Heat the oven to 400°F. Cut each pita in half to make pockets and place on a baking sheet.",
      "Spread pesto inside the pockets and divide turkey, spinach and mozzarella among them. Arrange in one layer with the openings facing up.",
      "Bake for 10–12 minutes until cheese melts and turkey reaches 165°F. Cover loosely with foil if the pita edges brown before the centers are hot.",
      "Meanwhile toss tomatoes and cucumber with vinegar, oil and salt. Serve two filled halves per person with the salad."
    ],
    "notes": "Cooked turkey and pocket bread create an easy hot sandwich dinner with a full fresh vegetable side. Estimated hands-on work: 15 minutes. Timing includes the stated accompaniments and assumes the purchased prepared ingredients listed. This original formulation is desk-reviewed, not kitchen-tested. When increasing servings, preserve pan area or cook in batches and allow extra time; check doneness independently of the clock.",
    "artworkIndex": 2,
    "kitchenTestState": "desk-reviewed",
    "research": {
      "accessedAt": "2026-10-16",
      "sources": [
        {
          "publisher": "Budget Bytes",
          "title": "Creamy Pesto Chicken",
          "url": "https://www.budgetbytes.com/creamy-pesto-chicken/",
          "rating": null,
          "ratingCount": null,
          "signal": "Thin cutlets sear quickly; tomatoes soften before pesto and cream."
        },
        {
          "publisher": "Good Food Middle East",
          "title": "Chicken pitta pockets with hummus drizzle",
          "url": "https://www.bbcgoodfoodme.com/recipes/chicken-pitta-pockets-with-houmous-drizzle/",
          "rating": null,
          "ratingCount": null,
          "signal": "Warm pita opens for chicken, cucumber and grated carrot; hummus forms the creamy element."
        },
        {
          "publisher": "Budget Bytes",
          "title": "Easy Pesto Chicken and Vegetables",
          "url": "https://www.budgetbytes.com/easy-pesto-chicken-and-vegetables/",
          "rating": null,
          "ratingCount": null,
          "signal": "Add squash after firmer vegetables and finish with pesto off heat."
        }
      ],
      "nonNegotiableTechniques": [
        "Bake for 10–12 minutes until cheese melts and turkey reaches 165°F. Cover loosely with foil if the pita edges brown before the centers are hot."
      ],
      "repeatedSuccessSignals": [
        "The linked component and technique references informed this formulation; no reader consensus or kitchen results for this original recipe are claimed."
      ],
      "repeatedFailureRisks": [
        "Overfilled pockets heat unevenly; spread filling thinly."
      ],
      "adaptationDecision": "Cooked turkey and pocket bread create an easy hot sandwich dinner with a full fresh vegetable side."
    }
  },
  {
    "rosterId": "DI358",
    "title": "Chicken couscous stuffed peppers",
    "description": "Sweet roasted peppers filled with chicken, fluffy couscous, spinach and tomato, with a little melted mozzarella.",
    "category": "Dinner",
    "cuisine": "Contemporary American",
    "tier": "household-anchor",
    "yieldQuantity": 4,
    "yieldUnit": "servings",
    "prepMinutes": 12,
    "cookMinutes": 45,
    "inactiveMinutes": 0,
    "ingredients": [
      "4 large bell peppers",
      "1 tablespoon olive oil",
      "3/4 cup dry plain couscous",
      "3/4 cup low-sodium chicken broth",
      "2 cups diced cooked chicken",
      "1 cup marinara sauce",
      "3 ounces baby spinach, chopped",
      "3/4 cup shredded mozzarella",
      "1/2 teaspoon dried oregano",
      "1/4 teaspoon fine salt",
      "1/4 cup water"
    ],
    "instructions": [
      "Heat oven to 425°F. Halve peppers lengthwise and remove seeds. Place cut-side up in a large baking dish, brush with oil, add water around them and cover with foil. Bake 15 minutes.",
      "Meanwhile boil broth in a saucepan. Stir in couscous, cover and remove from heat for 5 minutes; use package liquid ratio if different. Fluff and fold in chicken, marinara, spinach, oregano and salt.",
      "Carefully uncover peppers. Fill the prepared pepper halves evenly and scatter mozzarella over the top. Cover again and bake 15 minutes.",
      "Uncover and bake 5–10 minutes until peppers are tender and filling reaches 165°F in the center. Serve two halves per person with any extra filling alongside."
    ],
    "notes": "Quick couscous and cooked chicken reduce filling preparation; peppers still receive enough covered oven time to soften. Estimated hands-on work: 20 minutes. Timing includes the stated accompaniments and assumes the purchased prepared ingredients listed. This original formulation is desk-reviewed, not kitchen-tested. When increasing servings, preserve pan area or cook in batches and allow extra time; check doneness independently of the clock.",
    "artworkIndex": 3,
    "kitchenTestState": "desk-reviewed",
    "research": {
      "accessedAt": "2026-10-16",
      "sources": [
        {
          "publisher": "Skinnytaste",
          "title": "Turkey Stuffed Peppers",
          "url": "https://www.skinnytaste.com/turkey-stuffed-peppers-45-pts/",
          "rating": null,
          "ratingCount": null,
          "signal": "Cook the filling before stuffing; covered peppers need time to soften."
        },
        {
          "publisher": "Budget Bytes",
          "title": "Roasted Vegetable Couscous",
          "url": "https://www.budgetbytes.com/roasted-vegetable-couscous/",
          "rating": null,
          "ratingCount": null,
          "signal": "Quick couscous steeps covered off heat; this is not pearl couscous."
        },
        {
          "publisher": "Budget Bytes",
          "title": "White Beans with Mushrooms and Marinara",
          "url": "https://www.budgetbytes.com/white-beans-with-mushrooms-and-marinara/",
          "rating": null,
          "ratingCount": null,
          "signal": "Cook mushroom liquid away before adding beans, tomato and cheese."
        }
      ],
      "nonNegotiableTechniques": [
        "Carefully uncover peppers. Fill all eight halves evenly and scatter mozzarella over the top. Cover again and bake 15 minutes."
      ],
      "repeatedSuccessSignals": [
        "The linked component and technique references informed this formulation; no reader consensus or kitchen results for this original recipe are claimed."
      ],
      "repeatedFailureRisks": [
        "Large thick-walled peppers may require the full baking range."
      ],
      "adaptationDecision": "Quick couscous and cooked chicken reduce filling preparation; peppers still receive enough covered oven time to soften."
    }
  },
  {
    "rosterId": "DI359",
    "title": "Chicken cauliflower cheddar skillet",
    "description": "Tender chicken and cauliflower in a creamy cheddar sauce, served with crusty whole-grain bread.",
    "category": "Dinner",
    "cuisine": "Contemporary American",
    "tier": "household-anchor",
    "yieldQuantity": 4,
    "yieldUnit": "servings",
    "prepMinutes": 10,
    "cookMinutes": 25,
    "inactiveMinutes": 0,
    "ingredients": [
      "1 tablespoon olive oil",
      "1 pound chicken breast, cut into 1/2-inch pieces",
      "1 pound small cauliflower florets",
      "1/2 cup low-sodium chicken broth",
      "3/4 cup whole milk",
      "1 tablespoon cornstarch",
      "1 cup shredded sharp cheddar",
      "1 teaspoon Dijon mustard",
      "1/2 teaspoon fine salt",
      "1/4 teaspoon black pepper",
      "4 thick slices whole-grain bread"
    ],
    "instructions": [
      "Heat oil in a deep lidded skillet. Season chicken with salt and pepper and cook over medium-high heat 5 minutes, turning; it will finish with the cauliflower.",
      "Add cauliflower and broth, cover and simmer over medium-low heat 7–9 minutes until cauliflower is fork-tender and chicken reaches 165°F. Stir halfway.",
      "Whisk cornstarch into cold milk and stir it into the skillet with mustard. Simmer gently, stirring, for 2 minutes until the sauce thickens.",
      "Remove from heat and fold in cheddar until melted. Divide among serving plates with the bread for the sauce; do not boil the cheese sauce."
    ],
    "notes": "A cauliflower-based skillet with bread as the starch provides a different texture from the catalog’s chicken broccoli rice casserole. Estimated hands-on work: 18 minutes. Timing includes the stated accompaniments and assumes the purchased prepared ingredients listed. This original formulation is desk-reviewed, not kitchen-tested. When increasing servings, preserve pan area or cook in batches and allow extra time; check doneness independently of the clock.",
    "artworkIndex": 4,
    "kitchenTestState": "desk-reviewed",
    "research": {
      "accessedAt": "2026-10-16",
      "sources": [
        {
          "publisher": "Skinnytaste",
          "title": "Chicken and Broccoli Noodle Casserole",
          "url": "https://www.skinnytaste.com/chicken-and-broccoli-noodle-casserole/",
          "rating": null,
          "ratingCount": null,
          "signal": "Parcook noodles; control broccoli moisture before adding a thickened milk sauce."
        },
        {
          "publisher": "Budget Bytes",
          "title": "Creamy Chicken and Rice Skillet",
          "url": "https://www.budgetbytes.com/creamy-chicken-and-rice-skillet/",
          "rating": null,
          "ratingCount": null,
          "signal": "Covered rice needs moisture checks; vegetables and cheese enter late."
        },
        {
          "publisher": "Budget Bytes",
          "title": "Chicken Alfredo",
          "url": "https://www.budgetbytes.com/chicken-alfredo/",
          "rating": null,
          "ratingCount": null,
          "signal": "Reserve pasta water, rest seared chicken, and melt Parmesan gently into cream."
        }
      ],
      "nonNegotiableTechniques": [
        "Whisk cornstarch into cold milk and stir it into the skillet with mustard. Simmer gently, stirring, for 2 minutes until the sauce thickens."
      ],
      "repeatedSuccessSignals": [
        "The linked component and technique references informed this formulation; no reader consensus or kitchen results for this original recipe are claimed."
      ],
      "repeatedFailureRisks": [
        "Large florets cook unevenly; keep them bite-sized."
      ],
      "adaptationDecision": "A cauliflower-based skillet with bread as the starch provides a different texture from the catalog’s chicken broccoli rice casserole."
    }
  },
  {
    "rosterId": "DI360",
    "title": "Chicken ramen with corn and spinach",
    "description": "Springy noodles in a ginger-soy broth with chicken, sweet corn and tender spinach.",
    "category": "Dinner",
    "cuisine": "Japanese-inspired",
    "tier": "household-anchor",
    "yieldQuantity": 4,
    "yieldUnit": "servings",
    "prepMinutes": 8,
    "cookMinutes": 20,
    "inactiveMinutes": 0,
    "ingredients": [
      "8 ounces plain dried ramen noodles, seasoning packets discarded",
      "4 cups low-sodium chicken broth",
      "2 cups water",
      "3 cups shredded cooked chicken",
      "1 1/2 cups frozen corn",
      "5 ounces baby spinach",
      "1 tablespoon finely grated ginger",
      "2 tablespoons low-sodium soy sauce",
      "1 teaspoon toasted sesame oil",
      "2 scallions, sliced"
    ],
    "instructions": [
      "Combine broth, water and ginger in a large saucepan. Bring to a simmer and cook 5 minutes.",
      "Add chicken and corn and simmer for 5–7 minutes until chicken reaches 165°F and corn is hot.",
      "Add ramen and cook for the package time, usually 3–4 minutes, gently separating the strands. Stir in spinach during the final minute.",
      "Take off heat and add soy sauce and sesame oil. Divide noodles and broth among serving bowls and finish with scallions. Serve immediately so noodles do not absorb all the broth."
    ],
    "notes": "An original quick noodle soup using prepared chicken and packaged plain ramen; it does not claim the long-simmered stock of traditional ramen. Estimated hands-on work: 15 minutes. Timing includes the stated accompaniments and assumes the purchased prepared ingredients listed. This original formulation is desk-reviewed, not kitchen-tested. When increasing servings, preserve pan area or cook in batches and allow extra time; check doneness independently of the clock.",
    "artworkIndex": 5,
    "kitchenTestState": "desk-reviewed",
    "research": {
      "accessedAt": "2026-10-16",
      "sources": [
        {
          "publisher": "Budget Bytes",
          "title": "Easy Dumpling Soup",
          "url": "https://www.budgetbytes.com/easy-dumpling-soup/",
          "rating": null,
          "ratingCount": null,
          "signal": "Follow frozen dumpling package cooking instructions; greens enter at the end."
        },
        {
          "publisher": "Budget Bytes",
          "title": "The Best Homemade Chicken Noodle Soup",
          "url": "https://www.budgetbytes.com/chicken-noodle-soup/",
          "rating": null,
          "ratingCount": null,
          "signal": "Soften aromatic vegetables before broth; noodles cook after chicken."
        },
        {
          "publisher": "Budget Bytes",
          "title": "Sesame Noodles with Wilted Greens",
          "url": "https://www.budgetbytes.com/sesame-noodles/",
          "rating": null,
          "ratingCount": null,
          "signal": "Mix the sauce first; noodles absorb seasoning and need tossing before serving."
        }
      ],
      "nonNegotiableTechniques": [
        "Add ramen and cook for the package time, usually 3–4 minutes, gently separating the strands. Stir in spinach during the final minute."
      ],
      "repeatedSuccessSignals": [
        "The linked component and technique references informed this formulation; no reader consensus or kitchen results for this original recipe are claimed."
      ],
      "repeatedFailureRisks": [
        "Salt varies between broths; use low-sodium broth and omit noodle seasoning packets."
      ],
      "adaptationDecision": "An original quick noodle soup using prepared chicken and packaged plain ramen; it does not claim the long-simmered stock of traditional ramen."
    }
  }
];
