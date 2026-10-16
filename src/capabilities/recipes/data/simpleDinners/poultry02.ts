import type { EditorialRecipe } from '../editorialRecipeCatalog';

// Original formulations; source comparisons and desk review are not kitchen tests.
export const SIMPLE_DINNER_POULTRY_02: readonly EditorialRecipe[] = [
  {
    "rosterId": "DI336",
    "title": "Chicken enchilada skillet with black beans",
    "category": "Dinner",
    "cuisine": "Tex-Mex-inspired",
    "tier": "household-anchor",
    "description": "A bubbling skillet of chicken, black beans, peppers, and tender corn-tortilla pieces in mild red sauce, finished with melted cheese.",
    "yieldQuantity": 4,
    "yieldUnit": "servings",
    "prepMinutes": 10,
    "cookMinutes": 20,
    "inactiveMinutes": 0,
    "artworkIndex": 5,
    "ingredients": [
      "1 tablespoon olive oil",
      "1 red bell pepper, diced",
      "1 teaspoon ground cumin",
      "2 cups shredded cooked rotisserie chicken, skin and bones removed",
      "1 can (15 ounces) black beans, rinsed and drained",
      "1 cup frozen corn",
      "2 cups mild red enchilada sauce",
      "1/4 cup water",
      "6 small corn tortillas, cut into wide strips",
      "3/4 cup shredded Monterey Jack",
      "1/4 cup plain Greek yogurt",
      "1 tablespoon lime juice"
    ],
    "instructions": [
      "Heat the oil in a deep 12-inch lidded skillet over medium heat. Add the bell pepper and cook for 5 minutes until softened. Stir in the cumin for 20 seconds.",
      "Add the cooked chicken, drained beans, frozen corn, enchilada sauce, and water. Stir and bring to a steady simmer. Cook for 5–6 minutes, stirring occasionally, until the chicken and sauce are steaming hot and the chicken reaches 165°F.",
      "Fold in the tortilla strips until coated, then simmer gently for 3–4 minutes. Turn them carefully once so they soften without breaking down into paste. The skillet should be thick and spoonable rather than dry.",
      "Scatter the Monterey Jack over the top, cover, and reduce the heat to low. Cook for 2–3 minutes until the cheese melts. Meanwhile, stir the yogurt and lime juice together in a small bowl.",
      "Divide the skillet among shallow serving bowls and add the lime yogurt. This timing assumes purchased cooked chicken; cooking raw chicken first adds time. For larger batches, use a wider pan or two skillets and confirm the filling heats through before adding tortillas."
    ],
    "notes": "This is an original Tex-Mex-inspired tortilla skillet rather than rolled traditional enchiladas. Purchased cooked chicken, canned beans, and mild prepared sauce keep the whole meal within about 30 minutes. The pepper and corn provide vegetables without a separate side, and the stovetop cheese finish avoids an oven transfer. The tortillas soften into the sauce; they are not intended to stay crisp.",
    "kitchenTestState": "desk-reviewed",
    "research": {
      "accessedAt": "2026-10-16",
      "sources": [
        {
          "publisher": "Budget Bytes",
          "title": "Creamy Chicken and Black Bean Enchiladas",
          "url": "https://www.budgetbytes.com/snap-challenge-creamy-chicken-black-bean-enchiladas/",
          "rating": 4.76,
          "ratingCount": 37,
          "signal": "Uses chicken, beans, and corn for a substantial filling. Its rolled, oven-baked approach is slower and requires a second vessel."
        },
        {
          "publisher": "Skinnytaste",
          "title": "Cheesy Rotisserie Chicken Enchilada Skillet",
          "url": "https://www.skinnytaste.com/cheesy-rotisserie-chicken-enchilada-skillet/",
          "rating": 4.94,
          "ratingCount": 194,
          "signal": "Explicitly describes a tortilla casserole instead of rolled enchiladas; cooked chicken and cut corn tortillas support a simpler method."
        },
        {
          "publisher": "Simply Recipes",
          "title": "Easy Chicken Skillet Enchiladas",
          "url": "https://www.simplyrecipes.com/recipes/easy_chicken_skillet_enchiladas/",
          "rating": null,
          "ratingCount": null,
          "signal": "Uses a skillet and cooked chicken while retaining rolled tortillas; highlights the difference between pliable flour tortillas and corn tortillas."
        }
      ],
      "nonNegotiableTechniques": [
        "Use cooked chicken and include reheating in the method.",
        "Heat the filling before folding in tortillas.",
        "Melt cheese gently under a lid."
      ],
      "repeatedSuccessSignals": [
        "Compared recipes use cooked chicken and prepared components to simplify assembly; this exact formulation has no cook feedback yet."
      ],
      "repeatedFailureRisks": [
        "Editorial risks: stirring softened tortillas too much and treating uncooked chicken as a time-neutral substitution."
      ],
      "adaptationDecision": "Original stovetop version with bell pepper, corn, a mild prepared sauce, and lime yogurt added after cooking. Unlike existing rolled enchiladas, it needs no filling, rolling, baking, or separate side."
    }
  },
  {
    "rosterId": "DI337",
    "title": "Chicken tortilla soup with avocado",
    "description": "Tomato broth, tender chicken, black beans and corn under a crunchy tortilla topping.",
    "category": "Dinner",
    "cuisine": "Tex-Mex-inspired",
    "tier": "household-anchor",
    "yieldQuantity": 4,
    "yieldUnit": "servings",
    "prepMinutes": 10,
    "cookMinutes": 30,
    "inactiveMinutes": 0,
    "ingredients": [
      "1 tablespoon olive oil",
      "1 small onion, diced",
      "1 teaspoon ground cumin",
      "1 can (14.5 ounces) diced tomatoes",
      "4 cups low-sodium chicken broth",
      "1 can (15 ounces) black beans, rinsed and drained",
      "1 cup frozen corn",
      "2 cups shredded cooked rotisserie chicken",
      "1 tablespoon lime juice",
      "1 avocado, diced",
      "4 ounces plain tortilla chips"
    ],
    "instructions": [
      "Heat the oil in a large soup pot over medium heat. Soften the onion for 5 minutes, then stir in the cumin for 30 seconds.",
      "Add tomatoes with their juices, broth and beans. Bring to a simmer and cook for 10 minutes, stirring once or twice.",
      "Add corn and chicken. Return to a simmer for 5–7 minutes until the corn is tender and the chicken reaches 165°F. Add a splash of water if the broth has reduced too far.",
      "Remove from heat and add lime juice. Divide among serving bowls and finish with avocado and crushed tortilla chips just before eating."
    ],
    "notes": "A broth-based Tex-Mex-inspired supper distinct from the tortilla skillet: crunchy chips and cool avocado remain separate until serving. Estimated hands-on work: 15 minutes. Timing includes the stated accompaniments and assumes the purchased prepared ingredients listed. This original formulation is desk-reviewed, not kitchen-tested. When increasing servings, preserve pan area or cook in batches and allow extra time; check doneness independently of the clock.",
    "artworkIndex": 6,
    "kitchenTestState": "desk-reviewed",
    "research": {
      "accessedAt": "2026-10-16",
      "sources": [
        {
          "publisher": "Budget Bytes",
          "title": "Slow Cooker Chicken Tortilla Soup",
          "url": "https://www.budgetbytes.com/slow-cooker-chicken-tortilla-soup/",
          "rating": null,
          "ratingCount": null,
          "signal": "Tomato, beans and corn build the soup; lime and crisp tortilla toppings are added at serving. Slow-cooker timing is not adopted."
        },
        {
          "publisher": "Budget Bytes",
          "title": "Creamy White Chicken Chili",
          "url": "https://www.budgetbytes.com/creamy-white-chicken-chili/",
          "rating": null,
          "ratingCount": null,
          "signal": "Beans add body; dairy goes in after simmering and shredding chicken."
        },
        {
          "publisher": "Budget Bytes",
          "title": "Chicken Nachos",
          "url": "https://www.budgetbytes.com/chicken-nachos/",
          "rating": null,
          "ratingCount": null,
          "signal": "Spread chips in layers; fresh toppings follow melting cheese in the oven."
        }
      ],
      "nonNegotiableTechniques": [
        "Add corn and chicken. Return to a simmer for 5–7 minutes until the corn is tender and the chicken reaches 165°F. Add a splash of water if the broth has reduced too far."
      ],
      "repeatedSuccessSignals": [
        "The linked component and technique references informed this formulation; no reader consensus or kitchen results for this original recipe are claimed."
      ],
      "repeatedFailureRisks": [
        "Chips soften rapidly if left in the soup."
      ],
      "adaptationDecision": "A broth-based Tex-Mex-inspired supper distinct from the tortilla skillet: crunchy chips and cool avocado remain separate until serving."
    }
  },
  {
    "rosterId": "DI338",
    "title": "Chicken pesto flatbreads with tomato salad",
    "description": "Crisp flatbreads topped with chicken, basil pesto and melted mozzarella, with juicy tomato salad.",
    "category": "Dinner",
    "cuisine": "Contemporary American",
    "tier": "household-anchor",
    "yieldQuantity": 4,
    "yieldUnit": "servings",
    "prepMinutes": 10,
    "cookMinutes": 15,
    "inactiveMinutes": 0,
    "ingredients": [
      "4 naan flatbreads, about 3 ounces each",
      "1/4 cup basil pesto",
      "2 cups chopped cooked chicken",
      "1 cup shredded mozzarella",
      "5 ounces baby spinach",
      "1 pint cherry tomatoes, halved",
      "1 tablespoon balsamic vinegar",
      "1 tablespoon olive oil",
      "1/4 teaspoon fine salt"
    ],
    "instructions": [
      "Heat the oven to 425°F. Arrange naan on two baking sheets. Divide the pesto evenly over them, leaving the rim clear.",
      "Divide chicken, half the spinach and mozzarella over the breads. Keep toppings in an even thin layer so the center heats through.",
      "Bake for 10–14 minutes, switching sheet positions halfway, until cheese bubbles, edges are crisp and chicken reaches 165°F.",
      "Toss tomatoes and remaining spinach with vinegar, oil and salt. Cut the hot flatbreads into wedges and serve immediately alongside the salad."
    ],
    "notes": "Purchased naan supplies a crisp dinner base without dough preparation; spinach is divided between the hot topping and fresh side. Estimated hands-on work: 15 minutes. Timing includes the stated accompaniments and assumes the purchased prepared ingredients listed. This original formulation is desk-reviewed, not kitchen-tested. When increasing servings, preserve pan area or cook in batches and allow extra time; check doneness independently of the clock.",
    "artworkIndex": 7,
    "kitchenTestState": "desk-reviewed",
    "research": {
      "accessedAt": "2026-10-16",
      "sources": [
        {
          "publisher": "Budget Bytes",
          "title": "Easy Pesto Chicken and Vegetables",
          "url": "https://www.budgetbytes.com/easy-pesto-chicken-and-vegetables/",
          "rating": null,
          "ratingCount": null,
          "signal": "Add squash after firmer vegetables and finish with pesto off heat."
        },
        {
          "publisher": "Budget Bytes",
          "title": "Creamy Pesto Chicken",
          "url": "https://www.budgetbytes.com/creamy-pesto-chicken/",
          "rating": null,
          "ratingCount": null,
          "signal": "Thin cutlets sear quickly; tomatoes soften before pesto and cream."
        },
        {
          "publisher": "Budget Bytes",
          "title": "Chicken Nachos",
          "url": "https://www.budgetbytes.com/chicken-nachos/",
          "rating": null,
          "ratingCount": null,
          "signal": "Spread chips in layers; fresh toppings follow melting cheese in the oven."
        }
      ],
      "nonNegotiableTechniques": [
        "Bake for 10–14 minutes, switching sheet positions halfway, until cheese bubbles, edges are crisp and chicken reaches 165°F."
      ],
      "repeatedSuccessSignals": [
        "The linked component and technique references informed this formulation; no reader consensus or kitchen results for this original recipe are claimed."
      ],
      "repeatedFailureRisks": [
        "Overloaded naan stays soft in the center."
      ],
      "adaptationDecision": "Purchased naan supplies a crisp dinner base without dough preparation; spinach is divided between the hot topping and fresh side."
    }
  },
  {
    "rosterId": "DI339",
    "title": "Chicken and sweetcorn chowder",
    "description": "A creamy potato-and-corn supper with tender chicken and a gentle thyme aroma.",
    "category": "Dinner",
    "cuisine": "Contemporary American",
    "tier": "household-anchor",
    "yieldQuantity": 4,
    "yieldUnit": "servings",
    "prepMinutes": 10,
    "cookMinutes": 35,
    "inactiveMinutes": 0,
    "ingredients": [
      "1 tablespoon butter",
      "1 small onion, diced",
      "2 celery ribs, thinly sliced",
      "1 pound Yukon Gold potatoes, cut into 1/2-inch cubes",
      "3 cups low-sodium chicken broth",
      "2 cups frozen corn",
      "1/2 teaspoon dried thyme",
      "2 cups diced cooked chicken",
      "1 cup whole milk",
      "2 tablespoons all-purpose flour",
      "4 whole-grain dinner rolls"
    ],
    "instructions": [
      "Melt butter in a large pot over medium heat. Cook onion and celery for 5 minutes, stirring until softened.",
      "Add potatoes, broth and thyme. Bring to a simmer, cover loosely and cook 12–15 minutes until a knife easily enters the potatoes.",
      "Whisk the flour into cold milk until smooth. Stir into the soup with corn and chicken; simmer gently for 5–7 minutes, stirring, until thickened and chicken reaches 165°F.",
      "Mash a few potatoes against the pot to thicken further if desired. Divide into serving bowls and serve with the rolls; do not boil hard after adding milk."
    ],
    "notes": "Potato and flour supply body without canned soup; cooked chicken shortens the schedule while rolls make the portions dinner-sized. Estimated hands-on work: 18 minutes. Timing includes the stated accompaniments and assumes the purchased prepared ingredients listed. This original formulation is desk-reviewed, not kitchen-tested. When increasing servings, preserve pan area or cook in batches and allow extra time; check doneness independently of the clock.",
    "artworkIndex": 8,
    "kitchenTestState": "desk-reviewed",
    "research": {
      "accessedAt": "2026-10-16",
      "sources": [
        {
          "publisher": "Budget Bytes",
          "title": "Potato Corn Chowder Recipe",
          "url": "https://www.budgetbytes.com/potato-corn-chowder/",
          "rating": null,
          "ratingCount": null,
          "signal": "Small potatoes soften before dairy; gentle heat protects milk."
        },
        {
          "publisher": "Budget Bytes",
          "title": "Creamy White Chicken Chili",
          "url": "https://www.budgetbytes.com/creamy-white-chicken-chili/",
          "rating": null,
          "ratingCount": null,
          "signal": "Beans add body; dairy goes in after simmering and shredding chicken."
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
        "Whisk the flour into cold milk until smooth. Stir into the soup with corn and chicken; simmer gently for 5–7 minutes, stirring, until thickened and chicken reaches 165°F."
      ],
      "repeatedSuccessSignals": [
        "The linked component and technique references informed this formulation; no reader consensus or kitchen results for this original recipe are claimed."
      ],
      "repeatedFailureRisks": [
        "Large potato pieces remain hard after the stated simmer."
      ],
      "adaptationDecision": "Potato and flour supply body without canned soup; cooked chicken shortens the schedule while rolls make the portions dinner-sized."
    }
  },
  {
    "rosterId": "DI340",
    "title": "Chicken stroganoff with mushrooms and noodles",
    "description": "Golden chicken and mushrooms in a tangy cream sauce, tucked into soft egg noodles with peas.",
    "category": "Dinner",
    "cuisine": "Contemporary American",
    "tier": "household-anchor",
    "yieldQuantity": 4,
    "yieldUnit": "servings",
    "prepMinutes": 10,
    "cookMinutes": 25,
    "inactiveMinutes": 0,
    "ingredients": [
      "10 ounces egg noodles",
      "1 cup frozen peas",
      "1 pound chicken breast, cut into 1/2-inch strips",
      "1 tablespoon olive oil",
      "8 ounces presliced mushrooms",
      "1 small onion, thinly sliced",
      "1 tablespoon all-purpose flour",
      "1 cup low-sodium chicken broth",
      "1 tablespoon Dijon mustard",
      "1/2 cup sour cream",
      "1/2 teaspoon fine salt",
      "1/4 teaspoon black pepper"
    ],
    "instructions": [
      "Bring a saucepan of water to a boil and cook noodles according to their package; add peas for the final 2 minutes. Drain, reserving 1/2 cup cooking water.",
      "While the water heats, season chicken with salt and pepper. Heat oil in a wide skillet and brown chicken for 6–8 minutes, turning, until 165°F; move to a clean plate.",
      "Cook mushrooms and onion in the same skillet for 6–8 minutes until their liquid evaporates. Stir in flour for 1 minute, then slowly add broth and mustard. Simmer 3 minutes until lightly thickened.",
      "Reduce heat to low. Stir in sour cream and chicken without boiling. Toss in noodles and peas, adding a little reserved water to make a coating sauce, then serve."
    ],
    "notes": "A full noodle supper uses peas for a vegetable and a small amount of sour cream for the characteristic tang; unlike Marsala, there is no wine reduction. Estimated hands-on work: 20 minutes. Timing includes the stated accompaniments and assumes the purchased prepared ingredients listed. This original formulation is desk-reviewed, not kitchen-tested. When increasing servings, preserve pan area or cook in batches and allow extra time; check doneness independently of the clock.",
    "artworkIndex": 9,
    "kitchenTestState": "desk-reviewed",
    "research": {
      "accessedAt": "2026-10-16",
      "sources": [
        {
          "publisher": "RecipeTin Eats",
          "title": "Chicken Stroganoff",
          "url": "https://www.recipetineats.com/chicken-stroganoff/",
          "rating": null,
          "ratingCount": null,
          "signal": "Brown chicken and mushrooms separately; flour thickens the sour-cream sauce."
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
          "publisher": "Skinnytaste",
          "title": "Chicken and Broccoli Noodle Casserole",
          "url": "https://www.skinnytaste.com/chicken-and-broccoli-noodle-casserole/",
          "rating": null,
          "ratingCount": null,
          "signal": "Parcook noodles; control broccoli moisture before adding a thickened milk sauce."
        }
      ],
      "nonNegotiableTechniques": [
        "Cook mushrooms and onion in the same skillet for 6–8 minutes until their liquid evaporates. Stir in flour for 1 minute, then slowly add broth and mustard. Simmer 3 minutes until lightly thickened."
      ],
      "repeatedSuccessSignals": [
        "The linked component and technique references informed this formulation; no reader consensus or kitchen results for this original recipe are claimed."
      ],
      "repeatedFailureRisks": [
        "Boiling sour cream can split the sauce."
      ],
      "adaptationDecision": "A full noodle supper uses peas for a vegetable and a small amount of sour cream for the characteristic tang; unlike Marsala, there is no wine reduction."
    }
  }
];
