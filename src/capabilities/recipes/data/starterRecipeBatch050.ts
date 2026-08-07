import type { EditorialRecipe } from "./editorialRecipeCatalog";

export const STARTER_RECIPE_BATCH_050: readonly EditorialRecipe[] = [
  {
    rosterId: "DI106",
    title: "Moo shu pork",
    category: "Dinner",
    cuisine: "Chinese",
    tier: "cuisine-anchor",
    description:
      "A northern Chinese home-style stir-fry of velveted pork, soft golden egg, crisp cucumber, wood ear mushrooms, scallion, ginger, and a light wine-soy glaze.",
    yieldQuantity: 4,
    yieldUnit: "servings",
    prepMinutes: 30,
    cookMinutes: 10,
    inactiveMinutes: 20,
    artworkIndex: 13,
    ingredients: [
      "12 ounces pork tenderloin, cut across the grain into thin strips",
      "4 teaspoons light soy sauce, divided",
      "4 teaspoons Shaoxing wine, divided",
      "2 teaspoons cornstarch",
      "1 teaspoon toasted sesame oil",
      "1 tablespoon finely grated ginger",
      "4 large eggs",
      "1/2 teaspoon kosher salt, divided",
      "3 tablespoons neutral oil, divided",
      "1 English cucumber, halved, seeded, and cut into thin diagonal slices",
      "2 cups rehydrated wood ear mushrooms, trimmed and torn bite-size",
      "4 scallions, sliced with whites and greens separated",
      "1 tablespoon oyster sauce",
      "2 tablespoons water",
      "4 cups steamed rice",
    ],
    instructions: [
      "Mix pork with 1 teaspoon soy, 1 teaspoon Shaoxing, cornstarch, sesame oil, ginger, and 1/4 teaspoon salt. Rest 20 minutes. Beat eggs with 1 teaspoon Shaoxing and remaining salt.",
      "Heat a wok over high heat with 1 tablespoon oil. Add eggs and fold into broad, barely set curds; transfer immediately so they stay tender.",
      "Return the wok to high heat with 1 tablespoon oil. Spread pork in one layer, sear 45 seconds, then stir-fry until lightly browned and 145°F, about 90 seconds more; transfer.",
      "Add remaining oil and scallion whites, then cucumber and wood ears. Stir-fry 60 to 90 seconds so the cucumber stays crisp and the mushrooms are fully hot.",
      "Return pork and add remaining soy and Shaoxing, oyster sauce, and water around the wok edge. Toss 30 seconds until no liquid pools, fold in egg and scallion greens, and serve with rice.",
    ],
    notes:
      "Mu xu rou originated in northern China and the egg's yellow curds evoke osmanthus blossoms. The mainland home-style branch combines pork, egg, cucumber, and wood ear and is commonly served with rice, not pancakes. The cabbage-heavy pancake wrap with sweet hoisin is a valid Chinese-American restaurant branch, but it is intentionally not blended into this recipe.",
    kitchenTestState: "desk-reviewed",
    research: {
      accessedAt: "2026-08-06",
      sources: [
        {
          publisher: "The Woks of Life",
          title: "Moo Shu Pork: The Authentic Chinese Recipe",
          url: "https://thewoksoflife.com/moo-shu-pork/",
          rating: 4.77,
          ratingCount: 13,
          signal:
            "A 4.77/5 Chinese-family pattern across 13 ratings supports the mainland home-style identity: velveted pork, tender egg, cucumber, wood ear, scallion, light seasoning, and no pancakes.",
        },
        {
          publisher: "TravelChinaGuide",
          title: "Moo Shu Pork",
          url: "https://www.travelchinaguide.com/tour/food/chinese-cooking/muxurou.htm",
          rating: null,
          ratingCount: null,
          signal:
            "China-focused culinary documentation corroborates moo shu pork as a mild, lightly seasoned pork-and-egg stir-fry rather than an inherently sweet wrapper dish.",
        },
        {
          publisher: "The Woks of Life",
          title: "Moo Shu Pork (The Restaurant Version)",
          url: "https://thewoksoflife.com/moo-shu-pork-recipe/",
          rating: null,
          ratingCount: null,
          signal:
            "A Chinese-American restaurant source documents cabbage, carrots, pancakes, and sweet sauce as a distinct diaspora lineage, supplying the boundary this mainland version should not blur.",
        },
      ],
      nonNegotiableTechniques: [
        "Velvet thin pork and cook it separately.",
        "Keep egg in broad tender curds.",
        "Flash-cook cucumber and wood ear without a heavy sauce.",
      ],
      repeatedSuccessSignals: [
        "Pork is tender and lightly browned",
        "Egg remains golden and soft",
        "Cucumber retains a fresh snap",
        "Wood ear supplies clean crunch without excess liquid",
      ],
      repeatedFailureRisks: [
        "Thick pork strips cook unevenly.",
        "Overcooked egg becomes dry before it returns to the wok.",
        "A sweet thick sauce erases the mainland dish's mild character.",
      ],
      adaptationDecision:
        "Choose the northern Chinese home-style branch, make the Chinese-American pancake branch explicit in the note, and retain rice as the neutral accompaniment rather than merging two different dishes.",
    },
  },
  {
    rosterId: "DI107",
    title: "Peking duck pancakes",
    category: "Dinner",
    cuisine: "Beijing Chinese",
    tier: "cuisine-anchor",
    description:
      "A whole maltose-glazed duck air-dried overnight and roasted until its lacquered skin shatters, carved into thin slices for handmade Mandarin pancakes.",
    yieldQuantity: 6,
    yieldUnit: "servings",
    prepMinutes: 60,
    cookMinutes: 110,
    inactiveMinutes: 1500,
    artworkIndex: 13,
    ingredients: [
      "1 air-chilled whole Pekin duck, 5 to 6 pounds, giblets removed",
      "2 teaspoons kosher salt",
      "2 tablespoons maltose or honey",
      "2 tablespoons Chinese black vinegar",
      "1 tablespoon light soy sauce",
      "8 cups boiling water",
      "2 cups all-purpose flour",
      "3/4 cup boiling water",
      "2 teaspoons toasted sesame oil",
      "1/2 cup tianmianjiang sweet wheat paste or hoisin sauce",
      "1 English cucumber, cut into 3-inch matchsticks",
      "8 scallions, cut into 3-inch fine slivers",
    ],
    instructions: [
      "Set duck on a rack in a clean sink. Trim excess cavity fat, prick only the fatty tail and thigh skin without piercing meat, and season the cavity with salt. Stir maltose, vinegar, and soy until smooth.",
      "Slowly ladle boiling water over every part of the skin until it tightens. Pat completely dry, brush with the maltose glaze, set breast-side up on a rack over a tray, and refrigerate uncovered 24 hours with clear space around the bird.",
      "For pancakes, stir flour and 3/4 cup boiling water into a shaggy dough, cool, knead smooth, cover, and rest 30 minutes. Roll into a rope, cut 24 pieces, flatten, brush half with sesame oil, and sandwich with the remaining discs. Roll each pair paper-thin.",
      "Cook each pancake pair in a dry skillet over medium until pale blisters form, about 45 seconds per side. While warm, peel into two pancakes and keep covered in a towel; steam 3 minutes just before serving.",
      "Heat oven to 300°F. Roast duck breast-side up on its rack until much of the fat renders, 70 to 90 minutes, draining the pan carefully once. Raise heat to 450°F and roast until the skin is deep mahogany and crisp and the thickest breast reaches 165°F, 15 to 25 minutes; shield any dark spots with foil.",
      "Rest duck uncovered 15 minutes. Remove broad pieces of crisp skin first, then carve thin slices of meat with skin attached. Serve immediately with warm pancakes, sweet wheat paste, cucumber, and scallion.",
    ],
    notes:
      "Beijing roast duck is a specialized restaurant craft: traditional preparation separates skin with air, hangs and dries the glazed bird, roasts in a dedicated oven, and carves tableside with emphasis on skin. This ambitious home adaptation preserves scalding, maltose glazing, uncovered drying, rendered crisp skin, thin carving, and handmade chun bing while honestly not claiming restaurant-equipment equivalence.",
    kitchenTestState: "desk-reviewed",
    research: {
      accessedAt: "2026-08-06",
      sources: [
        {
          publisher: "Serious Eats",
          title: "How to Make Peking Duck at Home",
          url: "https://www.seriouseats.com/how-to-make-peking-duck-at-home-recipe",
          rating: null,
          ratingCount: null,
          signal:
            "A technique-focused home adaptation supports scalding to tighten skin, a maltose glaze, uncovered air-drying, low roasting to render fat, and a final high-heat crisping phase.",
        },
        {
          publisher: "Food Network",
          title: "Peking Duck with Pancakes",
          url: "https://www.foodnetwork.com/recipes/rachael-ray/peking-duck-with-pancakes-recipe-1939976",
          rating: null,
          ratingCount: null,
          signal:
            "A tested version corroborates a whole 5-to-7-pound duck, boiling-water scald, maltose-vinegar glaze, flour pancakes, sweet sauce, scallion, and cucumber service.",
        },
        {
          publisher: "Xi'an Famous Foods via ckbk",
          title: "Mandarin Pancakes",
          url: "https://app.ckbk.com/recipe/xian47526c01s001ss007r003/mandarin-pancakes",
          rating: null,
          ratingCount: null,
          signal:
            "A Chinese restaurant cookbook source supports hot-water dough and paired, oiled, thin-rolled pancakes that separate after skillet cooking.",
        },
      ],
      nonNegotiableTechniques: [
        "Scald, glaze, and air-dry the whole duck uncovered overnight.",
        "Render slowly before a high-heat skin-crisping finish.",
        "Carve crisp skin and thin meat for hot-water-dough pancakes.",
      ],
      repeatedSuccessSignals: [
        "Skin is dry, lacquered, and audibly crisp",
        "Subcutaneous fat is well rendered",
        "Breast meat remains juicy",
        "Pancakes are paper-thin, flexible, and separable",
      ],
      repeatedFailureRisks: [
        "A damp or covered bird cannot develop crisp skin.",
        "Piercing meat releases juices and dries the duck.",
        "High heat from the start burns sugar before fat renders.",
      ],
      adaptationDecision:
        "Retain the long dry, maltose lacquer, two-stage roast, carving, and handmade pancakes while explicitly disclosing that a home oven cannot duplicate pumped-skin, wood-fired restaurant roast duck.",
    },
  },
  {
    rosterId: "DI108",
    title: "Red-braised pork belly",
    category: "Dinner",
    cuisine: "Shanghai Chinese",
    tier: "cuisine-anchor",
    description:
      "Skin-on pork belly slowly red-cooked with rock sugar, Shaoxing wine, light soy, and dark soy until the cubes tremble beneath a glossy mahogany glaze.",
    yieldQuantity: 6,
    yieldUnit: "servings",
    prepMinutes: 20,
    cookMinutes: 80,
    inactiveMinutes: 0,
    artworkIndex: 13,
    ingredients: [
      "2 pounds lean skin-on pork belly, cut into 1-inch cubes",
      "2 tablespoons neutral oil",
      "3 tablespoons Chinese rock sugar or granulated sugar",
      "1/2 cup Shaoxing wine",
      "3 tablespoons light soy sauce",
      "1 1/2 tablespoons dark soy sauce",
      "3 cups hot water, plus more as needed",
      "4 cups steamed jasmine rice",
      "1 pound steamed baby bok choy",
    ],
    instructions: [
      "Cover pork belly with cold water in a saucepan, bring to a boil for 1 minute, then drain, rinse, and pat thoroughly dry.",
      "Heat oil and rock sugar in a heavy pot over low until the sugar melts and turns pale amber. Add dry pork carefully and turn over medium heat until every side is lightly browned and coated.",
      "Lower heat and add Shaoxing around the pot edge. Simmer 1 minute, then add both soy sauces and enough hot water to nearly cover the pork.",
      "Bring to a bare simmer, cover, and cook 50 to 60 minutes, turning cubes occasionally, until skin is gelatinous and a skewer slides through the lean layers easily. Add hot water if the pot threatens to dry.",
      "Uncover and simmer, turning gently, until the liquid becomes a shiny glaze that coats rather than floods the pork, 10 to 15 minutes. Serve small portions with rice and bok choy.",
    ],
    notes:
      "Hong shao rou is a broad Chinese red-cooking family. This is the famously sweet-savory Shanghai expression, kept deliberately spare: belly, sugar, Shaoxing, light soy, and dark soy. It differs from DI099's Hunan Chairman's braise, which uses chile and warm spices and less soy-forward sweetness.",
    kitchenTestState: "desk-reviewed",
    research: {
      accessedAt: "2026-08-06",
      sources: [
        {
          publisher: "The Woks of Life",
          title: "Shanghai-Style Braised Pork Belly (Hong Shao Rou)",
          url: "https://thewoksoflife.com/shanghai-style-braised-pork-belly/",
          rating: 4.86,
          ratingCount: 269,
          signal:
            "A 4.86/5 Shanghainese-family pattern across 269 ratings strongly supports skin-on belly, blanching, rock sugar, Shaoxing, light and dark soy, a gentle braise, and a glossy reduced finish with no added spice clutter.",
        },
        {
          publisher: "China Sichuan Food",
          title: "Hong Shao Rou",
          url: "https://www.chinasichuanfood.com/hong-shao-rou-red-braised-pork-belly/",
          rating: null,
          ratingCount: null,
          signal:
            "A Chinese regional specialist corroborates caramel color, skin-on pork belly, rice wine, soy, slow tenderness, and the wider family variation surrounding red braising.",
        },
        {
          publisher: "TasteAtlas",
          title: "Red Braised Pork Belly",
          url: "https://www.tasteatlas.com/red-braised-pork-belly",
          rating: null,
          ratingCount: null,
          signal:
            "Culinary documentation identifies the dish's Chinese red-cooking identity and its particularly strong Shanghai association, supporting an explicit regional label rather than a universal claim.",
        },
      ],
      nonNegotiableTechniques: [
        "Use skin-on pork belly and blanch before browning.",
        "Build red color from sugar, Shaoxing, and two soy sauces.",
        "Braise gently until gelatinous, then reduce uncovered to gloss.",
      ],
      repeatedSuccessSignals: [
        "Cubes hold shape but tremble when moved",
        "Skin is gelatinous rather than chewy",
        "Sauce is mahogany and lacquer-like",
        "Sweetness and soy balance the pork's richness",
      ],
      repeatedFailureRisks: [
        "Wet blanched pork spits when it enters caramel.",
        "A hard boil separates fat and breaks the cubes.",
        "Reducing too early leaves tough pork in a salty glaze.",
      ],
      adaptationDecision:
        "Follow the unusually strong Shanghainese source signal and preserve its six-ingredient austerity, making the contrast with the already-authored Hunan spiced version explicit.",
    },
  },
  {
    rosterId: "DI109",
    title: "Scallion oil noodles",
    category: "Dinner",
    cuisine: "Shanghai Chinese",
    tier: "cuisine-anchor",
    description:
      "Springy wheat noodles glossed with slowly infused scallion oil and a spare sweet-savory soy reduction, crowned with brittle dark-gold scallion strands.",
    yieldQuantity: 4,
    yieldUnit: "servings",
    prepMinutes: 10,
    cookMinutes: 25,
    inactiveMinutes: 0,
    artworkIndex: 13,
    ingredients: [
      "12 ounces fresh Shanghai wheat noodles or thin dried wheat noodles",
      "8 scallions, cut into 3-inch lengths and thoroughly dried",
      "1/2 cup neutral oil",
      "3 tablespoons light soy sauce",
      "1 1/2 tablespoons dark soy sauce",
      "1 1/2 tablespoons sugar",
      "1 tablespoon Chinkiang black vinegar",
      "1/4 teaspoon ground white pepper",
    ],
    instructions: [
      "Separate scallion whites from greens and pat both completely dry. Put oil and scallion whites in a cold wok, then cook over low heat until pale gold, 8 to 10 minutes.",
      "Add scallion greens and continue frying slowly, turning often, until all pieces are deep golden-brown and crisp but not black, 8 to 12 minutes. Lift scallions to a rack and remove the wok from heat.",
      "Carefully stir light soy, dark soy, sugar, vinegar, and white pepper into 1/4 cup of the warm scallion oil. Return to low heat just until the sugar dissolves and the sauce bubbles; reserve remaining oil for another use.",
      "Boil noodles according to their package until just tender. Reserve 1/2 cup cooking water, drain thoroughly, and return noodles to the warm pot.",
      "Toss noodles with the scallion-soy sauce, adding cooking water one tablespoon at a time only if needed to loosen. Divide immediately and crown each bowl with crisp scallions.",
    ],
    notes:
      "Cong you ban mian is a beloved Shanghai noodle dish built from ordinary pantry ingredients and unusually careful scallion frying. The dark-looking scallions should taste sweet and toasted, never burnt. This vegetarian version keeps the elemental street-and-home-food form; some Shanghai restaurant versions add dried shrimp or pork.",
    kitchenTestState: "desk-reviewed",
    research: {
      accessedAt: "2026-08-06",
      sources: [
        {
          publisher: "The Woks of Life",
          title: "Shanghai Scallion Oil Noodles",
          url: "https://thewoksoflife.com/2014/02/soy-scallion-noodles-cong-ban-mian/",
          rating: 4.93,
          ratingCount: 38,
          signal:
            "A 4.93/5 Shanghainese-family pattern across 38 ratings supports low-and-slow scallion oil, crisp scallion garnish, light and dark soy, sugar, and hot noodles tossed in a concentrated aromatic sauce.",
        },
        {
          publisher: "Chowmi",
          title: "Scallion Oil Noodles",
          url: "https://chowmi.com/recipes/scallion-oil-noodles",
          rating: null,
          ratingCount: null,
          signal:
            "A tested Shanghai-focused version identifies low-temperature scallion caramelization, bitterness avoidance, balanced sweet soy, and hot tossing as the dish's central success mechanisms.",
        },
        {
          publisher: "Bon Appétit",
          title: "Scallion-Oil Noodles",
          url: "https://www.bonappetit.com/recipe/scallion-oil-noodles",
          rating: null,
          ratingCount: null,
          signal:
            "A tested adaptation independently supports fresh Shanghai noodles, a large volume of scallion-infused oil, crisp allium garnish, and immediate saucing at service.",
        },
      ],
      nonNegotiableTechniques: [
        "Begin scallions in cool oil and fry patiently over low heat.",
        "Remove scallions at deep gold before they blacken.",
        "Reduce a restrained soy-sugar sauce and toss with hot noodles.",
      ],
      repeatedSuccessSignals: [
        "Oil smells deeply of scallion",
        "Fried scallions are crisp and bittersweet, not burnt",
        "Noodles stay springy and individually glossed",
        "Sauce concentrates without pooling",
      ],
      repeatedFailureRisks: [
        "Wet scallions spit in hot oil.",
        "High heat blackens greens before they perfume the oil.",
        "Excess noodle water dilutes the aromatic sauce.",
      ],
      adaptationDecision:
        "Keep the vegetarian Shanghai core and its exact low-heat infusion method, add only black vinegar for measured brightness, and leave pork and dried-shrimp variants for separate recipes.",
    },
  },
  {
    rosterId: "DI110",
    title: "Biang biang noodles",
    category: "Dinner",
    cuisine: "Xi'an Chinese",
    tier: "cuisine-anchor",
    description:
      "Hand-ripped Shaanxi belt noodles with thick chew and feathery edges, dressed with garlic, scallion, chile, black vinegar, soy, and a dramatic sizzling-oil pour.",
    yieldQuantity: 4,
    yieldUnit: "servings",
    prepMinutes: 45,
    cookMinutes: 15,
    inactiveMinutes: 120,
    artworkIndex: 13,
    ingredients: [
      "3 cups all-purpose flour",
      "1 teaspoon kosher salt",
      "1 cup room-temperature water, plus 2 tablespoons if needed",
      "2 tablespoons neutral oil for coating dough",
      "8 baby bok choy, halved lengthwise",
      "4 garlic cloves, finely minced",
      "4 scallions, finely sliced",
      "2 tablespoons crushed Chinese chile flakes",
      "1 teaspoon toasted ground cumin",
      "3 tablespoons Chinkiang black vinegar",
      "2 tablespoons light soy sauce",
      "1 teaspoon sugar",
      "1/2 cup neutral oil",
    ],
    instructions: [
      "Mix flour and salt, then add 1 cup water and knead 8 to 10 minutes into a firm, smooth dough, adding extra water one teaspoon at a time only if dry flour remains. Cover and rest 30 minutes.",
      "Knead 1 minute, divide into 8 equal logs, coat lightly with 2 tablespoons oil, cover airtight, and rest at room temperature 90 minutes so the gluten relaxes fully.",
      "Bring a wide pot of water to a boil. Flatten one dough log into a long rectangle and press a groove lengthwise with a chopstick. Hold the ends, slap and stretch it against the counter until belt-wide, then tear along the groove to make one long loop; repeat only as quickly as the pot allows.",
      "Boil noodles in batches until they float and remain chewy but have no raw center, 90 seconds to 3 minutes. Add bok choy for the final 45 seconds, then lift noodles and greens into four heatproof bowls.",
      "Top each bowl with garlic, scallion, chile flakes, and cumin. Heat 1/2 cup oil until shimmering and pour carefully over the aromatics to sizzle. Divide vinegar, soy, and sugar among bowls, toss thoroughly, and eat immediately.",
    ],
    notes:
      "Biang biang mian are famously wide, hand-pulled noodles associated with Xi'an and Shaanxi's wheat culture; the name is commonly linked to the sound of dough striking the work surface. Toppings vary widely. This version uses the oil-splashed you po branch with garlic, chile, vinegar, and soy rather than presenting cumin lamb as universal.",
    kitchenTestState: "desk-reviewed",
    research: {
      accessedAt: "2026-08-06",
      sources: [
        {
          publisher: "King Arthur Baking",
          title: "Biang Biang Noodles",
          url: "https://www.kingarthurbaking.com/recipes/biang-biang-noodles-recipe",
          rating: 4.4,
          ratingCount: 8,
          signal:
            "A 4.4/5 baking-specialist pattern across 8 reviews supports a simple wheat dough, substantial covered rest, oiling, slapping and stretching, hand-torn edges, and mixed thick-chewy and thin-slippery texture.",
        },
        {
          publisher: "Bon Appétit",
          title: "Biang Biang Noodles with Hot Spiced Oil",
          url: "https://www.bonappetit.com/recipe/biang-biang-noodles-hot-oil",
          rating: null,
          ratingCount: null,
          signal:
            "A version adapted from Jason Wang's Xi'an Famous Foods cookbook supports hand-ripped broad noodles and a spare hot-oil sauce that showcases rather than buries their texture.",
        },
        {
          publisher: "TravelChinaGuide",
          title: "10 Famous Xi'an Noodles",
          url: "https://www.travelchinaguide.com/cityguides/famous-xian-noodles.htm",
          rating: null,
          ratingCount: null,
          signal:
            "Xi'an culinary documentation identifies biang biang as the city's most famous noodle, explains the slapping sound, and describes exceptionally broad, long, chewy belts.",
        },
      ],
      nonNegotiableTechniques: [
        "Use a plain wheat dough with enough covered rest to relax gluten.",
        "Oil individual logs, slap-stretch them broad, and hand-tear the center seam.",
        "Boil briefly and dress immediately with black vinegar and sizzling chile oil.",
      ],
      repeatedSuccessSignals: [
        "Dough stretches without springing back or tearing prematurely",
        "Noodles have thick chewy centers and fluttering edges",
        "Garlic and chile bloom audibly under hot oil",
        "Vinegar cuts the oil without making a soup",
      ],
      repeatedFailureRisks: [
        "Under-rested dough snaps back and breaks.",
        "Uneven logs create raw thick knots beside overcooked edges.",
        "Holding cooked noodles before dressing makes them stick.",
      ],
      adaptationDecision:
        "Preserve the Xi'an-defining hand-ripped belt and oil-splash service, choose a tested all-purpose-flour hydration for home kitchens, and label cumin as a topping accent rather than conflating the noodle with one restaurant's lamb version.",
    },
  },
];
