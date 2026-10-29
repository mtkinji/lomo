import type { EditorialRecipe } from '../editorialRecipeCatalog';

// Original formulations; source comparisons and desk review are not kitchen tests.
export const SIMPLE_DINNER_VEGETARIAN_03: readonly EditorialRecipe[] = [
  {
    "rosterId": "DI461",
    "title": "Cauliflower chickpea taco skillet",
    "description": "Tender cauliflower and chickpeas in a smoky tomato coating, ready to scoop into warm tortillas.",
    "category": "Dinner",
    "cuisine": "Everyday vegetarian",
    "tier": "household-anchor",
    "yieldQuantity": 4,
    "yieldUnit": "servings",
    "prepMinutes": 10,
    "cookMinutes": 25,
    "inactiveMinutes": 0,
    "ingredients": [
      "1 small cauliflower (about 1 1/4 pounds), cut into 1/2-inch florets",
      "2 cans (15 ounces each) chickpeas, drained and rinsed",
      "1 cup mild salsa",
      "8 small flour tortillas",
      "1 avocado, sliced",
      "1/2 cup plain Greek yogurt",
      "1 teaspoon ground cumin",
      "1 teaspoon smoked paprika",
      "1 tablespoon olive oil",
      "1/2 cup water",
      "1/4 teaspoon salt"
    ],
    "instructions": [
      "Heat oil in a deep skillet. Add cauliflower, cumin, paprika and salt and cook over medium-high heat for 4 minutes.",
      "Add water, cover and cook on medium-low for 8–10 minutes until cauliflower is tender. Uncover and allow any pool of water to evaporate.",
      "Add chickpeas and salsa. Simmer uncovered for 5 minutes until hot and thick. Meanwhile microwave tortillas under a damp towel for 30–60 seconds.",
      "Divide filling among tortillas, top with avocado and yogurt, and serve two tacos per person."
    ],
    "notes": "Hands-on: about 17 minutes. Equipment: lidded skillet and microwave. Choose cheese and pesto labeled vegetarian when used. Scale ingredients with servings, but keep pan depth and cooking cues unchanged; use another batch when the pan becomes crowded. Timing includes all listed meal components; larger batches take longer.",
    "artworkIndex": 10,
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
          "publisher": "Cookie and Kate",
          "title": "Favorite Chickpea Salad",
          "url": "https://cookieandkate.com/best-chickpea-salad-recipe/",
          "rating": null,
          "ratingCount": null,
          "signal": "Chickpeas carry a substantial chopped salad; a bright dressing balances the beans."
        }
      ],
      "nonNegotiableTechniques": [
        "Tenderize cauliflower before reducing the salsa around the chickpeas."
      ],
      "repeatedSuccessSignals": [
        "Editorial comparison, not reviewer consensus: Tenderize cauliflower before reducing the salsa around the chickpeas."
      ],
      "repeatedFailureRisks": [
        "Editorial risk assessment, not a claimed pattern of reviews: Large florets leave crunchy centers and awkward taco filling."
      ],
      "adaptationDecision": "Soft chickpea tacos with steamed-then-simmered cauliflower differ from black-bean tostadas and spicy quinoa bowls."
    }
  },
  {
    "rosterId": "DI462",
    "title": "Spinach artichoke white bean pasta",
    "description": "Pasta spirals carry creamy white beans, bright artichokes and tender spinach.",
    "category": "Dinner",
    "cuisine": "Everyday vegetarian",
    "tier": "household-anchor",
    "yieldQuantity": 4,
    "yieldUnit": "servings",
    "prepMinutes": 10,
    "cookMinutes": 20,
    "inactiveMinutes": 0,
    "ingredients": [
      "10 ounces penne",
      "2 cans (15 ounces each) cannellini beans, drained and rinsed",
      "1 can (14 ounces) artichoke hearts in water, drained and chopped",
      "5 ounces baby spinach",
      "4 ounces cream cheese",
      "3/4 cup milk",
      "2 garlic cloves, minced",
      "1 lemon, juiced",
      "1 tablespoon olive oil",
      "1/4 teaspoon salt",
      "1/4 teaspoon black pepper"
    ],
    "instructions": [
      "Bring a pot of water to a boil and cook penne to package directions. Reserve 1 cup cooking water before draining.",
      "Meanwhile heat oil in a wide skillet and cook garlic over medium-low heat for 30 seconds. Add milk and cream cheese; stir gently until smooth, without a hard boil.",
      "Stir in beans and artichokes and warm for 4 minutes. Add spinach in handfuls and stir until wilted.",
      "Toss in pasta, salt, pepper and the lemon juice. Loosen with pasta water as needed and serve immediately."
    ],
    "notes": "Hands-on: about 17 minutes. Equipment: large pot and skillet. Choose cheese and pesto labeled vegetarian when used. Scale ingredients with servings, but keep pan depth and cooking cues unchanged; use another batch when the pan becomes crowded. Timing includes all listed meal components; larger batches take longer.",
    "artworkIndex": 11,
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
          "publisher": "Good Food",
          "title": "Braised butter beans & leeks",
          "url": "https://www.bbcgoodfood.com/recipes/braised-butter-beans-leeks/",
          "rating": null,
          "ratingCount": null,
          "signal": "Leeks need time to soften in stock; add cultured cream after removing the pan from heat."
        }
      ],
      "nonNegotiableTechniques": [
        "Drain artichokes and keep the dairy sauce below a vigorous boil."
      ],
      "repeatedSuccessSignals": [
        "Editorial comparison, not reviewer consensus: Drain artichokes and keep the dairy sauce below a vigorous boil."
      ],
      "repeatedFailureRisks": [
        "Editorial risk assessment, not a claimed pattern of reviews: Wet artichokes dilute the sauce and hard boiling splits it."
      ],
      "adaptationDecision": "White beans add substantial protein; the sauce is artichoke-cream rather than the existing pesto-chickpea pasta."
    }
  },
  {
    "rosterId": "DI463",
    "title": "Sweet potato black bean loaded nachos",
    "description": "Crisp chips hold smoky black beans, soft sweet potato, melted cheese and cool avocado.",
    "category": "Dinner",
    "cuisine": "Everyday vegetarian",
    "tier": "household-anchor",
    "yieldQuantity": 4,
    "yieldUnit": "servings",
    "prepMinutes": 10,
    "cookMinutes": 25,
    "inactiveMinutes": 0,
    "ingredients": [
      "1 pound sweet potatoes, peeled and cut into 1/2-inch cubes",
      "2 cans (15 ounces each) black beans, drained and rinsed",
      "8 ounces sturdy tortilla chips",
      "6 ounces vegetarian cheddar, grated",
      "1 cup mild salsa, divided",
      "1 avocado, diced",
      "1 teaspoon smoked paprika",
      "1/2 cup plain Greek yogurt",
      "1 tablespoon olive oil",
      "1/4 cup water",
      "1/4 teaspoon salt"
    ],
    "instructions": [
      "Heat oven to 425°F. Put sweet potato and water in a covered microwave-safe bowl. Microwave for 7–9 minutes, stirring halfway, until tender; drain any water.",
      "Toss hot sweet potato with oil, paprika and salt. Fold in beans and half the salsa. Microwave uncovered for 2–3 minutes until beans are steaming hot.",
      "Spread chips on a large rimmed sheet pan, distribute the warm filling and scatter cheddar. Bake 7–9 minutes until cheese melts and exposed chips are crisp.",
      "Top with avocado, remaining salsa and yogurt just before serving. Divide into equal dinner portions and eat immediately."
    ],
    "notes": "Hands-on: about 18 minutes. Equipment: microwave-safe bowl and sheet pan. Choose cheese and pesto labeled vegetarian when used. Scale ingredients with servings, but keep pan depth and cooking cues unchanged; use another batch when the pan becomes crowded. Timing includes all listed meal components; larger batches take longer.",
    "artworkIndex": 12,
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
          "title": "French Bread Pizza",
          "url": "https://www.budgetbytes.com/french-bread-pizza/",
          "rating": null,
          "ratingCount": null,
          "signal": "A ready-baked bread base saves dough time; thick sauce and restrained wet toppings protect the crumb."
        }
      ],
      "nonNegotiableTechniques": [
        "Heat the bean topping before giving chips a short oven finish."
      ],
      "repeatedSuccessSignals": [
        "Editorial comparison, not reviewer consensus: Heat the bean topping before giving chips a short oven finish."
      ],
      "repeatedFailureRisks": [
        "Editorial risk assessment, not a claimed pattern of reviews: A cold wet topping needs too long in the oven and ruins chip texture."
      ],
      "adaptationDecision": "Crisp open nachos contrast with DI453 soft enchilada tortillas; microwave sweet potato removes an unnecessary pan."
    }
  },
  {
    "rosterId": "DI464",
    "title": "Broccoli tofu sesame rice",
    "description": "Golden tofu and tender broccoli with a mellow sesame-soy glaze over fluffy rice.",
    "category": "Dinner",
    "cuisine": "Everyday vegetarian",
    "tier": "household-anchor",
    "yieldQuantity": 4,
    "yieldUnit": "servings",
    "prepMinutes": 10,
    "cookMinutes": 30,
    "inactiveMinutes": 0,
    "ingredients": [
      "2 packages (14 ounces each) extra-firm tofu, drained",
      "1 cup long-grain white rice",
      "12 ounces broccoli florets, cut small",
      "3 tablespoons low-sodium soy sauce",
      "1 tablespoon rice vinegar",
      "1 tablespoon honey",
      "2 teaspoons toasted sesame oil",
      "2 teaspoons cornstarch",
      "2 tablespoons vegetable oil",
      "1 1/2 cups water, for rice",
      "2 tablespoons water, for steaming broccoli",
      "2 tablespoons water, for sauce"
    ],
    "instructions": [
      "Bring rice and the rice water to a boil in a lidded saucepan. Cover and simmer on low for 15–18 minutes, then rest off heat for 5 minutes.",
      "While rice cooks, blot tofu dry and cut into 3/4-inch cubes. Heat vegetable oil in a 12-inch nonstick skillet; cook tofu for 10–12 minutes, turning occasionally, until golden. Transfer to a plate.",
      "Put broccoli and the broccoli-steaming water into the skillet. Cover for 4 minutes, then uncover. Whisk soy sauce, vinegar, honey, sesame oil, cornstarch and the sauce water.",
      "Return tofu and add sauce. Stir over medium heat for 1–2 minutes until glossy and broccoli is tender. Serve over rice."
    ],
    "notes": "Hands-on: about 20 minutes. Equipment: lidded saucepan and nonstick skillet. Choose cheese and pesto labeled vegetarian when used. Scale ingredients with servings, but keep pan depth and cooking cues unchanged; use another batch when the pan becomes crowded. Timing includes all listed meal components; larger batches take longer.",
    "artworkIndex": 13,
    "kitchenTestState": "desk-reviewed",
    "kitchenTestNotes": [
      "Original formulation reviewed on paper; not kitchen-tested."
    ],
    "research": {
      "accessedAt": "2026-10-16",
      "sources": [
        {
          "publisher": "Cookie and Kate",
          "title": "How to Make Crispy Baked Tofu",
          "url": "https://cookieandkate.com/how-to-make-crispy-baked-tofu/",
          "rating": null,
          "ratingCount": null,
          "signal": "Dry extra-firm tofu before cooking and allow space for browning; oven crisping requires a real bake interval."
        },
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
        }
      ],
      "nonNegotiableTechniques": [
        "Steam broccoli separately in the skillet after browning tofu."
      ],
      "repeatedSuccessSignals": [
        "Editorial comparison, not reviewer consensus: Steam broccoli separately in the skillet after browning tofu."
      ],
      "repeatedFailureRisks": [
        "Editorial risk assessment, not a claimed pattern of reviews: Water added early prevents tofu browning; starch must be mixed cold."
      ],
      "adaptationDecision": "No orange glaze, roasting or sweet soy specialty sauce; a mild sesame skillet complements the catalog without copying its orange tofu tray meal."
    }
  },
  {
    "rosterId": "DI465",
    "title": "Mushroom mozzarella French bread pizzas",
    "description": "Crisp French bread holds browned mushrooms and bubbly mozzarella, with a simple chickpea salad alongside.",
    "category": "Dinner",
    "cuisine": "Everyday vegetarian",
    "tier": "household-anchor",
    "yieldQuantity": 4,
    "yieldUnit": "servings",
    "prepMinutes": 10,
    "cookMinutes": 25,
    "inactiveMinutes": 0,
    "ingredients": [
      "1 soft French loaf (about 14 ounces), split lengthwise and halved crosswise",
      "12 ounces mushrooms, sliced",
      "1 cup thick pizza sauce",
      "8 ounces vegetarian mozzarella, grated",
      "1 can (15 ounces) chickpeas, drained and rinsed",
      "1 cucumber, diced",
      "1 tablespoon lemon juice",
      "1 teaspoon dried oregano",
      "2 tablespoons olive oil",
      "1/4 teaspoon salt"
    ],
    "instructions": [
      "Heat oven to 425°F. Heat half the oil in a skillet and cook mushrooms with oregano and salt for 8–10 minutes until their released water evaporates.",
      "Put bread cut-side up on a sheet pan and toast in the oven for 4 minutes. Spread pizza sauce over bread, then add mushrooms and mozzarella.",
      "Bake for 8–10 minutes until cheese bubbles and edges are crisp.",
      "Meanwhile toss chickpeas and cucumber with lemon juice and remaining oil. Serve a pizza quarter and a share of salad per person."
    ],
    "notes": "Hands-on: about 19 minutes. Equipment: skillet and sheet pan. Choose cheese and pesto labeled vegetarian when used. Scale ingredients with servings, but keep pan depth and cooking cues unchanged; use another batch when the pan becomes crowded. Timing includes all listed meal components; larger batches take longer.",
    "artworkIndex": 14,
    "kitchenTestState": "desk-reviewed",
    "kitchenTestNotes": [
      "Original formulation reviewed on paper; not kitchen-tested."
    ],
    "research": {
      "accessedAt": "2026-10-16",
      "sources": [
        {
          "publisher": "Budget Bytes",
          "title": "French Bread Pizza",
          "url": "https://www.budgetbytes.com/french-bread-pizza/",
          "rating": null,
          "ratingCount": null,
          "signal": "A ready-baked bread base saves dough time; thick sauce and restrained wet toppings protect the crumb."
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
          "publisher": "Cookie and Kate",
          "title": "Favorite Chickpea Salad",
          "url": "https://cookieandkate.com/best-chickpea-salad-recipe/",
          "rating": null,
          "ratingCount": null,
          "signal": "Chickpeas carry a substantial chopped salad; a bright dressing balances the beans."
        }
      ],
      "nonNegotiableTechniques": [
        "Brown mushrooms and pre-toast bread before adding sauce."
      ],
      "repeatedSuccessSignals": [
        "Editorial comparison, not reviewer consensus: Brown mushrooms and pre-toast bread before adding sauce."
      ],
      "repeatedFailureRisks": [
        "Editorial risk assessment, not a claimed pattern of reviews: Raw mushrooms release water into the bread."
      ],
      "adaptationDecision": "A store-baked bread base, substantial mushrooms and chickpea side make this a practical dinner distinct from dough-based margherita."
    }
  }
];
