import type { EditorialRecipe } from "./editorialRecipeCatalog";

export const STARTER_RECIPE_BATCH_093: readonly EditorialRecipe[] = [
  {
    rosterId: "DE026",
    title: "Classic tiramisu",
    category: "Desserts",
    cuisine: "Italian",
    tier: "household-anchor",
    description:
      "Espresso-soaked ladyfingers layered with airy mascarpone cream and a dark cocoa finish.",
    yieldQuantity: 9,
    yieldUnit: "servings",
    prepMinutes: 35,
    cookMinutes: 8,
    inactiveMinutes: 480,
    artworkIndex: 23,
    ingredients: [
      "1 1/2 cups (360 grams) strong espresso or coffee, cooled",
      "2 tablespoons Marsala wine or dark rum, optional",
      "6 large egg yolks",
      "2/3 cup (133 grams) granulated sugar",
      "16 ounces (454 grams) mascarpone, cool but pliable",
      "1 1/2 cups (360 grams) cold heavy cream",
      "1 teaspoon vanilla extract",
      "1 package (7 ounces) crisp Italian ladyfingers (savoiardi)",
      "2 tablespoons unsweetened cocoa powder",
      "1 ounce dark chocolate, finely grated, optional",
    ],
    instructions: [
      "Combine cooled espresso and optional Marsala. Set a heatproof bowl over barely simmering water without touching it. Whisk yolks and sugar constantly until pale, thick, and 160°F, 6 to 8 minutes. Remove and cool 10 minutes.",
      "Whisk mascarpone briefly until smooth, then fold in the cooked yolk mixture. Whip cold cream and vanilla to medium peaks and fold into mascarpone in three additions, preserving the air.",
      "Dip each ladyfinger in coffee for about 1 second per side; do not soak until limp. Arrange one snug layer in an 8-inch square dish, spread with half the mascarpone cream, and repeat with remaining ladyfingers and cream.",
      "Cover and refrigerate at least 8 hours or overnight so the coffee, biscuit, and cream become cohesive. Dust generously with cocoa and optional grated chocolate immediately before serving. Keep refrigerated and serve within 3 days.",
    ],
    notes:
      "Tiramisù is widely understood as Italy's coffee-and-mascarpone layered dessert, though accounts of its precise twentieth-century origin differ. The name is often translated as “pick me up,” fitting its espresso character. This version cooks the yolk foam to 160°F for a safer home method while preserving mascarpone, savoiardi, coffee, cocoa, and the long chill that turn separate layers into the familiar spoonable dessert.",
    kitchenTestState: "desk-reviewed",
    research: {
      accessedAt: "2026-08-06",
      sources: [
        {
          publisher: "King Arthur Baking",
          title: "Tiramisu",
          url: "https://www.kingarthurbaking.com/recipes/tiramisu-recipe",
          rating: 5,
          ratingCount: 27,
          signal:
            "A 5/5 pattern across 27 reviews supports generous espresso saturation, airy sweet mascarpone, cocoa, a high cream-to-cake balance, and sufficient chilling.",
        },
        {
          publisher: "Epicurious",
          title: "Classic Tiramisu",
          url: "https://www.epicurious.com/recipes/food/views/tiramisu",
          rating: 4.8,
          ratingCount: null,
          signal:
            "A 4.8/5 editorial recipe corroborates savoiardi, espresso and optional liqueur, mascarpone zabaglione, whipped cream, cocoa, minimal active work, and a long hands-off chill.",
        },
        {
          publisher: "Once Upon a Chef",
          title: "Tiramisu",
          url: "https://www.onceuponachef.com/recipes/tiramisu.html",
          rating: null,
          ratingCount: null,
          signal:
            "A tested make-ahead version reinforces cooked yolks for structure, proper mascarpone consistency, quick dipping, easy assembly, and restaurant-style results without raw egg risk.",
        },
      ],
      nonNegotiableTechniques: [
        "Cook the yolk-sugar foam to 160°F and cool it before adding mascarpone.",
        "Dip crisp savoiardi quickly so they absorb coffee without collapsing.",
        "Fold whipped cream gently and chill the assembled dessert at least eight hours.",
      ],
      repeatedSuccessSignals: [
        "Coffee flavor reaches every biscuit without liquid pooling",
        "Mascarpone layer is light smooth and stable",
        "Cocoa supplies a clean bitter contrast",
        "Layers cut softly but hold after an overnight chill",
      ],
      repeatedFailureRisks: [
        "Long dipping turns ladyfingers into wet paste.",
        "Overbeaten mascarpone or cream becomes grainy.",
        "Serving too soon leaves hard biscuits and disconnected layers.",
      ],
      adaptationDecision:
        "Preserve the highly rated coffee-savoiardi-mascarpone-cocoa architecture, use a 160°F yolk foam for home safety, and keep alcohol optional without replacing the dessert's essential espresso bitterness.",
    },
  },
  {
    rosterId: "DE027",
    title: "Silky vanilla cream (Panna cotta)",
    category: "Desserts",
    cuisine: "Italian",
    tier: "household-anchor",
    description:
      "A softly set vanilla cream that trembles on the spoon and melts cleanly with fresh berries.",
    yieldQuantity: 6,
    yieldUnit: "servings",
    prepMinutes: 15,
    cookMinutes: 8,
    inactiveMinutes: 300,
    artworkIndex: 23,
    ingredients: [
      "1/2 cup (120 grams) cold whole milk",
      "2 teaspoons (6 grams) powdered unflavored gelatin",
      "2 1/2 cups (600 grams) heavy cream",
      "1/3 cup (67 grams) granulated sugar",
      "1 vanilla bean, split and scraped",
      "1/4 teaspoon fine sea salt",
      "1 teaspoon vanilla extract",
      "1 cup fresh berries, for serving",
    ],
    instructions: [
      "Pour cold milk into a wide bowl, sprinkle gelatin evenly over the surface, and let bloom 5 to 10 minutes without stirring. Lightly oil six 6-ounce ramekins only if you plan to unmold them.",
      "Heat cream, sugar, vanilla seeds and pod, and salt over medium-low until steaming and sugar dissolves; do not boil. Remove the pod and whisk hot cream into bloomed gelatin until completely dissolved, then stir in vanilla extract.",
      "Strain into a pitcher and divide among ramekins. Cool 20 minutes, cover, and refrigerate at least 4 hours until set but visibly trembling. Do not freeze to speed the set.",
      "Serve in the ramekins with berries, or dip each outside in warm water for 5 seconds, loosen the edge, and invert onto a cold plate. If it resists, repeat briefly rather than heating until the cream melts.",
    ],
    notes:
      "Panna cotta means cooked cream, though the cream is only gently heated. The Piedmont-associated Italian dessert succeeds when gelatin acts quietly: enough to hold a delicate shape, never enough to bounce like firm gelatin. The catalog title leads with what someone will eat—a silky vanilla cream—while the detail page retains the traditional name and its defining tremble.",
    kitchenTestState: "desk-reviewed",
    research: {
      accessedAt: "2026-08-06",
      sources: [
        {
          publisher: "Food.com",
          title: "Vanilla Panna Cotta",
          url: "https://www.food.com/recipe/vanilla-panna-cotta-364331",
          rating: null,
          ratingCount: null,
          signal:
            "Repeated community praise emphasizes remarkable ease, silky texture, successful unmolding, light vanilla flavor, and fresh fruit as the best accompaniment.",
        },
        {
          publisher: "Good Food",
          title: "Vanilla Panna Cotta",
          url: "https://www.bbcgoodfood.com/recipes/vanilla-panna-cotta",
          rating: null,
          ratingCount: null,
          signal:
            "A broad home authority corroborates milk and cream, sugar, vanilla seeds, bloomed gelatin, gentle heat, straining, molds, and a full refrigerated set.",
        },
        {
          publisher: "Cadena SER",
          title: "Panna Cotta",
          url: "https://cadenaser.com/nacional/2026/06/08/panna-cotta-cadena-ser/",
          rating: null,
          ratingCount: null,
          signal:
            "A current culinary account states the decisive quality test plainly: restrained gelatin should let panna cotta tremble, hold, and melt rather than bounce.",
        },
      ],
      nonNegotiableTechniques: [
        "Bloom gelatin evenly in cold milk before introducing heat.",
        "Heat vanilla cream without boiling and dissolve gelatin completely.",
        "Use restrained gelatin and chill fully for a trembling set.",
      ],
      repeatedSuccessSignals: [
        "Cream trembles visibly and melts on the tongue",
        "Vanilla seeds and dairy remain clean and fragrant",
        "Dessert unmolds intact without rubbery edges",
        "Fresh berries cut through the richness",
      ],
      repeatedFailureRisks: [
        "Too much gelatin creates a bouncy texture.",
        "Adding gelatin directly to hot cream causes stubborn lumps.",
        "Prolonged warm-water unmolding melts the outside.",
      ],
      adaptationDecision:
        "Lead with a familiar vanilla-cream description, synthesize the easiest successful mold method, and set a restrained six-gram gelatin ratio so the traditional tremble survives home handling.",
    },
  },
  {
    rosterId: "DE028",
    title: "Chocolate chip ricotta cannoli",
    category: "Desserts",
    cuisine: "Sicilian Italian",
    tier: "cuisine-anchor",
    description:
      "Crisp blistered pastry tubes filled at the last minute with sweet ricotta, chocolate, orange, and pistachio.",
    yieldQuantity: 12,
    yieldUnit: "cannoli",
    prepMinutes: 75,
    cookMinutes: 30,
    inactiveMinutes: 720,
    artworkIndex: 23,
    ingredients: [
      "2 cups (240 grams) all-purpose flour",
      "2 tablespoons (25 grams) granulated sugar",
      "1 tablespoon unsweetened cocoa powder",
      "1/2 teaspoon ground cinnamon",
      "1/2 teaspoon fine sea salt",
      "3 tablespoons (42 grams) cold unsalted butter, cubed",
      "1 large egg",
      "1/3 cup (80 grams) dry Marsala wine",
      "1 teaspoon white wine vinegar",
      "1 egg white, lightly beaten, for sealing",
      "2 quarts neutral high-heat oil, for frying",
      "24 ounces (680 grams) whole-milk ricotta, drained overnight",
      "3/4 cup (90 grams) confectioners' sugar, plus more for dusting",
      "1 teaspoon finely grated orange zest",
      "1 teaspoon vanilla extract",
      "1/2 cup (85 grams) mini chocolate chips",
      "1/3 cup (38 grams) finely chopped toasted pistachios",
    ],
    instructions: [
      "The night before, drain ricotta in a cheesecloth-lined sieve over a bowl. For shells, pulse flour, granulated sugar, cocoa, cinnamon, salt, and butter to fine crumbs. Add egg, Marsala, and vinegar; knead 8 minutes until firm and smooth. Wrap and rest 1 hour.",
      "Divide dough in four and keep covered. Roll each piece with a pasta machine or rolling pin to about 1/16 inch, thin enough to see a hand shadow. Cut twelve 4-inch rounds. Wrap each around a lightly oiled metal cannoli tube and seal the overlap with egg white without getting it between dough and tube.",
      "Fill a heavy pot no more than halfway with oil and heat to 350°F. Turn handles inward, exclude children and pets, keep a lid nearby, never add water, and never leave oil unattended. Fry two or three shells and tubes at a time 60 to 90 seconds until blistered and deep golden.",
      "Lift with tongs, drain, and wait until tubes are safe to touch before sliding shells off; metal stays dangerously hot. Repeat while holding oil at 345–355°F. Cool shells completely and store airtight. Cool oil fully before handling.",
      "Press drained ricotta through a fine sieve and fold with confectioners' sugar, orange zest, vanilla, and chocolate chips. Refrigerate in a piping bag. Fill shells from both ends only just before serving, dip ends in pistachios, and dust with sugar. This is the batch's one true project: overnight draining, thin rolling, special tubes, sealing, serial deep frying, cooling, filling, and immediate service are intrinsic.",
    ],
    notes:
      "Cannoli originated in Sicily and became associated with Carnival before growing into an all-occasion Italian pastry. Cannolo is singular and cannoli plural. Their identity depends on contrast: a dry, blistered, brittle shell and smooth sweet sheep's- or cow's-milk ricotta added only at service. Chocolate, orange, and pistachio are familiar accents, but none should turn the filling into buttercream.",
    kitchenTestState: "desk-reviewed",
    research: {
      accessedAt: "2026-08-06",
      sources: [
        {
          publisher: "Epicurious",
          title: "Sicilian Cannoli",
          url: "https://www.epicurious.com/recipes/food/views/cannoli-recipe",
          rating: null,
          ratingCount: null,
          signal:
            "A test-kitchen classic establishes Sicilian Carnival roots, fried tubular shells, ricotta filling, thin dough, blistering, and last-minute filling as identity-bearing features.",
        },
        {
          publisher: "Serious Eats",
          title: "Homemade Cannoli",
          url: "https://www.seriouseats.com/homemade-cannoli-recipe",
          rating: null,
          ratingCount: null,
          signal:
            "A technique authority reinforces thoroughly drained smooth ricotta, very thin shell dough, metal forms, controlled frying, citrus, chocolate, pistachio, and moisture barriers.",
        },
        {
          publisher: "Eataly",
          title: "Cannoli Siciliani",
          url: "https://www.eataly.com/us_en/magazine/eataly-recipes/cannoli-siciliani",
          rating: null,
          ratingCount: null,
          signal:
            "An Italian food authority corroborates crisp Marsala shell, sweet ricotta rather than cream-cheese filling, regional garnish variation, and filling only before eating.",
        },
      ],
      nonNegotiableTechniques: [
        "Drain and sieve whole-milk ricotta rather than thickening a wet filling with excess sugar.",
        "Roll shell dough extremely thin, seal on metal forms, and fry at 345–355°F.",
        "Keep shells airtight and fill only at service.",
      ],
      repeatedSuccessSignals: [
        "Shells are thin blistered brittle and not greasy",
        "Ricotta filling is smooth lightly sweet and recognizably dairy",
        "Orange chocolate and pistachio remain balanced accents",
        "Every cannolo is filled immediately before eating",
      ],
      repeatedFailureRisks: [
        "Wet ricotta makes loose filling and soggy shells.",
        "Thick dough fries hard rather than shatteringly crisp.",
        "Hot metal tubes and deep oil create serious burn risk.",
      ],
      adaptationDecision:
        "Retain the Sicilian thin-shell and pure ricotta architecture with familiar accents, and expose every sourcing, equipment, frying, and timing burden rather than treating cannoli as ordinary filled cookies.",
    },
  },
  {
    rosterId: "DE029",
    title: "Citrus olive oil cake",
    category: "Desserts",
    cuisine: "Italian",
    tier: "cuisine-anchor",
    description:
      "A simple golden cake with a plush olive-oil crumb, crisp sugar edge, and bright orange-lemon aroma.",
    yieldQuantity: 10,
    yieldUnit: "slices",
    prepMinutes: 18,
    cookMinutes: 42,
    inactiveMinutes: 45,
    artworkIndex: 23,
    ingredients: [
      "1 3/4 cups (210 grams) all-purpose flour",
      "1 1/2 teaspoons baking powder",
      "1/2 teaspoon baking soda",
      "1/2 teaspoon fine sea salt",
      "3 large eggs, room temperature",
      "1 cup (200 grams) granulated sugar, plus 2 tablespoons for the pan",
      "3/4 cup (170 grams) fruity extra-virgin olive oil",
      "3/4 cup (180 grams) whole-milk plain yogurt, room temperature",
      "1 tablespoon finely grated orange zest",
      "1 teaspoon finely grated lemon zest",
      "2 tablespoons fresh orange juice",
      "1 teaspoon vanilla extract",
      "Confectioners' sugar, optional for serving",
    ],
    instructions: [
      "Heat oven to 350°F. Coat a 9-inch springform or round cake pan with olive oil, line the bottom with parchment, oil it, and coat sides and bottom with the 2 tablespoons sugar.",
      "Whisk flour, baking powder, baking soda, and salt. In another bowl whisk eggs and 1 cup sugar vigorously for 2 minutes until pale and slightly thick. Slowly stream in olive oil while whisking, then whisk in yogurt, both zests, orange juice, and vanilla.",
      "Fold in dry ingredients only until smooth. Pour into the pan and bake 38 to 47 minutes until deeply golden, springy, and a center tester shows moist crumbs; tent only if the top darkens before the center sets.",
      "Cool in the pan 15 minutes, loosen the edge, and move to a rack. Serve warm or room temperature, plain or with optional confectioners' sugar. Wrap only after fully cool; the oil-based crumb stays plush for several days.",
    ],
    notes:
      "Olive oil cakes appear in several Mediterranean baking traditions and vary widely across Italy; this is an Italian-style citrus version, not one protected regional formula. Good extra-virgin oil acts as both fat and flavor, creating a moist crumb that stays soft longer than many butter cakes. Citrus brightens its peppery-fruity notes, and the sugared pan gives a crisp edge without frosting.",
    kitchenTestState: "desk-reviewed",
    research: {
      accessedAt: "2026-08-06",
      sources: [
        {
          publisher: "The New York Times",
          title: "Easy and Elegant Olive Oil Cake",
          url: "https://www.nytimes.com/2025/03/29/dining/easy-olive-oil-cake.html",
          rating: 5,
          ratingCount: null,
          signal:
            "A five-star pattern with glowing reviews supports olive oil cake as especially excellent, elegant, and genuinely simple rather than a specialist novelty.",
        },
        {
          publisher: "Bon Appétit",
          title: "Olive Oil Cake",
          url: "https://www.bonappetit.com/recipe/olive-oil-cake",
          rating: null,
          ratingCount: null,
          signal:
            "A test-kitchen favorite corroborates pronounced olive-oil flavor, a simple hand-mixed batter, moist dairy-free-capable crumb, citrus affinity, and serious repeat appeal.",
        },
        {
          publisher: "Food Wishes",
          title: "Italian Olive Oil Cake",
          url: "https://www.allrecipes.com/recipe/8486777/italian-olive-oil-cake/",
          rating: null,
          ratingCount: null,
          signal:
            "A widely viewed chef demonstration reinforces very low technical burden, fruity oil, citrus, a one-pan bake, and fresh berries or plain service as an Italian-style household dessert.",
        },
      ],
      nonNegotiableTechniques: [
        "Use an extra-virgin olive oil pleasant enough to taste directly.",
        "Emulsify oil gradually into eggs and sugar before folding flour minimally.",
        "Bake to deep gold and cool before wrapping so the sugared edge stays crisp.",
      ],
      repeatedSuccessSignals: [
        "Olive oil tastes fruity and intentional",
        "Crumb is plush moist and evenly emulsified",
        "Citrus brightens without becoming extract-like",
        "Sugared edge stays delicate and crisp",
      ],
      repeatedFailureRisks: [
        "Rancid or harsh oil dominates the simple cake.",
        "Adding oil too quickly can break the emulsion.",
        "Overmixing flour makes the moist crumb rubbery.",
      ],
      adaptationDecision:
        "Use the five-star simple-cake signal, pair a clearly fruity oil with orange and lemon, and create texture through yogurt and a sugared pan rather than frosting or specialty garnish.",
    },
  },
  {
    rosterId: "DE030",
    title: "Espresso over vanilla gelato (Affogato)",
    category: "Desserts",
    cuisine: "Italian",
    tier: "cuisine-anchor",
    description:
      "Cold vanilla gelato drowned at the table in hot bitter espresso for an instant creamy coffee dessert.",
    yieldQuantity: 4,
    yieldUnit: "servings",
    prepMinutes: 8,
    cookMinutes: 2,
    inactiveMinutes: 20,
    artworkIndex: 23,
    ingredients: [
      "1 pint high-quality vanilla or fior di latte gelato",
      "4 double shots freshly brewed espresso",
      "2 tablespoons toasted chopped hazelnuts, optional",
      "1 ounce dark chocolate, finely grated, optional",
      "4 crisp almond biscotti, optional for serving",
    ],
    instructions: [
      "Chill four small glasses or bowls for at least 20 minutes. Scoop two small portions of very firm gelato into each and return them to the freezer while brewing espresso.",
      "Brew four double shots of espresso immediately before service. Bring frozen gelato bowls and hot espresso to the table separately so each serving preserves the hot-cold contrast.",
      "Pour one hot double espresso directly over each gelato portion. Add optional hazelnuts or grated chocolate sparingly; serve optional biscotti alongside rather than burying the two-ingredient core.",
      "Eat immediately with a spoon, then drink the bittersweet melted remainder. For children or caffeine-sensitive diners, use freshly brewed decaf espresso; do not substitute a large volume of weak coffee, which floods rather than coats the gelato.",
    ],
    notes:
      "Affogato means drowned in Italian: gelato is drowned with espresso. The familiar-name-first title states the entire experience before giving the traditional word. This is intentionally closer to a serving ritual than a cooking project. Very cold gelato and glass slow the melt just enough for the first spoonfuls to contrast hot bitter coffee with cold sweet cream.",
    kitchenTestState: "desk-reviewed",
    research: {
      accessedAt: "2026-08-06",
      sources: [
        {
          publisher: "TasteAtlas",
          title: "Authentic Affogato Recipe",
          url: "https://www.tasteatlas.com/affogato/recipe",
          rating: null,
          ratingCount: null,
          signal:
            "A cuisine reference establishes the two-ingredient Italian core, the meaning drowned, chilled glass and pre-firmed gelato, hot espresso, immediate service, and spoon-then-drink experience.",
        },
        {
          publisher: "De'Longhi Italia",
          title: "Affogato al Caffè",
          url: "https://www.delonghi.com/it-it/e/r/affogato-al-caffe",
          rating: null,
          ratingCount: null,
          signal:
            "An Italian espresso authority corroborates one or two scoops of vanilla or cream gelato, a hot concentrated espresso, and the direct hot-cold sweet-bitter contrast.",
        },
        {
          publisher: "Bon Appétit",
          title: "Affogato, the Adult Sundae",
          url: "https://www.bonappetit.com/recipes/article/affogato-the-adult-sundae",
          rating: null,
          ratingCount: null,
          signal:
            "A test-kitchen account explicitly favors effortless complexity and the plain hot-espresso-over-vanilla-gelato ritual over unnecessary over-the-top preparation.",
        },
      ],
      nonNegotiableTechniques: [
        "Use firm high-quality vanilla or fior di latte gelato in chilled vessels.",
        "Brew concentrated espresso immediately before service.",
        "Pour at the table and eat at once to preserve hot-cold contrast.",
      ],
      repeatedSuccessSignals: [
        "First spoonful is simultaneously hot cold bitter and sweet",
        "Espresso coats and melts gelato without flooding it",
        "Vanilla dairy softens coffee bitterness",
        "The final melted sip remains balanced rather than watery",
      ],
      repeatedFailureRisks: [
        "Soft gelato or warm glass melts before espresso arrives.",
        "Weak large-volume coffee creates sweet coffee soup.",
        "Too many toppings obscure the defining two-part contrast.",
      ],
      adaptationDecision:
        "Put the literal eating experience first in the title, preserve the Italian two-ingredient ritual, and relegate familiar garnishes to optional accents so a beautifully simple dessert does not become a niche production.",
    },
  },
];
