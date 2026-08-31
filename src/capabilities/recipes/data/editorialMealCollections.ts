import type {
  CollectionDiscoveryRole,
  CollectionMealEntry,
  EditorialCollection,
  EditorialMealPlanTemplate,
  MealEditorialEdition,
} from "../domain/editorialMealCollectionContracts";

function entry(
  id: string,
  rosterId: string,
  discoveryRole: CollectionDiscoveryRole,
  whyTry: string,
  whyDoable: string,
  firstTimeNote?: string,
): CollectionMealEntry {
  return {
    id,
    recipeId: `kwilt-recipe-${rosterId.toLowerCase()}`,
    recipeVersion: 1,
    discoveryRole,
    whyTry,
    whyDoable,
    ...(firstTimeNote ? { firstTimeNote } : {}),
  };
}

const JAPAN_ID = "collection-weeknight-tour-japan";
const BUDGET_ID = "collection-dinners-on-a-budget";
const NEW_FLAVORS_ID = "collection-new-flavors-familiar-rhythm";
const EASY_WEEK_ID = "collection-less-effort-good-dinners";

export const EDITORIAL_MEAL_COLLECTIONS: readonly EditorialCollection[] = [
  {
    id: JAPAN_ID,
    slug: "weeknight-tour-of-japan",
    version: 1,
    title: "A weeknight tour of Japan",
    deck: "Five comforting dinners with a familiar rice-or-noodle rhythm and a little room to explore.",
    eyebrow: "COOK AROUND THE WORLD",
    jobIntent: "explore_cuisine",
    heroRecipeId: "kwilt-recipe-di145",
    editorialOwner: "Kwilt Kitchen",
    culturalSources: [
      "Kwilt Kitchen Japanese home-cooking research notes, reviewed August 2026",
    ],
    mealPlanTemplateId: "template-weeknight-tour-japan",
    sections: [
      {
        id: "familiar-ways-in",
        title: "Familiar ways in",
        note: "Glossy sauces, crisp cutlets, and warm rice make a gentle beginning.",
        entries: [
          entry(
            "japan-teriyaki",
            "DI145",
            "familiar_anchor",
            "Sweet-savory salmon, warm rice, and cool vegetables land together in every bite.",
            "The sauce is whisked in one bowl and the whole dinner takes about 35 minutes.",
          ),
          entry(
            "japan-katsu",
            "DI146",
            "adjacent_discovery",
            "Crisp chicken and mellow curry turn an ordinary bowl into real comfort food.",
            "The curry simmers while the cutlets cook in one skillet.",
            "Japanese curry is milder and thicker than many curries; taste before adding heat.",
          ),
          entry(
            "japan-oyakodon",
            "DI147",
            "adjacent_discovery",
            "Tender chicken and softly set egg make a deeply comforting rice bowl.",
            "The chicken and egg cook in one small pan while the rice stays warm.",
          ),
        ],
      },
      {
        id: "keep-exploring",
        title: "Keep exploring",
        note: "Two dinners that stretch the same dependable bowl-and-noodle format.",
        entries: [
          entry(
            "japan-sukiyaki",
            "DI152",
            "stretch",
            "Tender beef, tofu, mushrooms, and vegetables share a sweet-savory tabletop pot.",
            "The ingredients are arranged ahead, then each person cooks and eats from the same pot.",
          ),
          entry(
            "japan-soba",
            "LU085",
            "stretch",
            "Nutty noodles, edamame, and crunchy vegetables are good warm or chilled.",
            "Soba cooks quickly and the dressing is mixed while the water boils.",
            "Rinse cooked soba well so the noodles stay springy instead of sticky.",
          ),
        ],
      },
    ],
  },
  {
    id: BUDGET_ID,
    slug: "dinners-on-a-budget",
    version: 1,
    title: "Dinners on a budget",
    deck: "Five generous meals built around beans, lentils, pasta, rice, and vegetables—without pretending every store costs the same.",
    eyebrow: "MAKE THE BASKET WORK HARDER",
    jobIntent: "plan_budget",
    heroRecipeId: "kwilt-recipe-so009",
    editorialOwner: "Kwilt Kitchen",
    culturalSources: [],
    mealPlanTemplateId: "template-dinners-on-a-budget",
    sections: [
      {
        id: "pantry-foundations",
        title: "Start with sturdy staples",
        note: "Beans, lentils, and pasta bring the center of the meal without a costly centerpiece.",
        entries: [
          entry(
            "budget-white-bean-chili",
            "SO009",
            "familiar_anchor",
            "Turkey, white beans, tomatoes, and warm spice make a generous pot of chili.",
            "It uses one pot, canned beans, and freezer-friendly portions.",
          ),
          entry(
            "budget-minestrone",
            "SO013",
            "familiar_anchor",
            "Beans, pasta, and a full slate of vegetables make pantry food feel abundant.",
            "The flexible soup welcomes the vegetables and small pasta already on hand.",
          ),
          entry(
            "budget-pasta-beans",
            "SO014",
            "adjacent_discovery",
            "Creamy beans and small pasta deliver comfort and real staying power.",
            "Canned beans and one pot keep the ingredient list and cleanup contained.",
          ),
        ],
      },
      {
        id: "stretch-the-produce",
        title: "Let vegetables carry dinner",
        note: "A little roasting and seasoning makes inexpensive produce feel intentional.",
        entries: [
          entry(
            "budget-quinoa-bowl",
            "SA010",
            "adjacent_discovery",
            "Black beans, corn, quinoa, and bright toppings make an inexpensive bowl worth repeating.",
            "Cooked grain and canned beans make the base flexible and easy to scale.",
          ),
          entry(
            "budget-aloo-gobi",
            "DI126",
            "adjacent_discovery",
            "Cauliflower and potatoes turn deeply savory with tomato and warm spice.",
            "The vegetables carry dinner in one pan without a costly centerpiece.",
          ),
        ],
      },
    ],
  },
  {
    id: NEW_FLAVORS_ID,
    slug: "new-flavors-familiar-rhythm",
    version: 1,
    title: "New flavors, familiar rhythm",
    deck: "A small nudge beyond the usual rotation, using skillets, bowls, and sheet pans you already know.",
    eyebrow: "TRY SOMETHING A LITTLE NEW",
    jobIntent: "escape_rotation",
    heroRecipeId: "kwilt-recipe-di212",
    editorialOwner: "Kwilt Kitchen",
    culturalSources: [],
    mealPlanTemplateId: "template-new-flavors-familiar-rhythm",
    sections: [
      {
        id: "one-pan-bridges",
        title: "Begin with the pan you know",
        note: "Fast browning and one good sauce move familiar ingredients somewhere new.",
        entries: [
          entry(
            "new-cashew-chicken",
            "DI212",
            "familiar_anchor",
            "Juicy chicken, crisp vegetables, and cashews get a glossy savory finish.",
            "It is a single-pan dinner with a short sauce and familiar ingredients.",
          ),
          entry(
            "new-red-curry",
            "DI216",
            "adjacent_discovery",
            "Tender chicken, coconut milk, and red curry make a bright, silky sauce.",
            "Curry paste supplies layered flavor without a long spice list.",
            "Start with less curry paste; brands vary in heat.",
          ),
          entry(
            "new-shawarma",
            "DI189",
            "stretch",
            "Spiced chicken, cool sauce, chopped salad, and warm rice create a dinner with contrast.",
            "The oven handles the chicken while the salad and sauce come together.",
          ),
        ],
      },
    ],
  },
  {
    id: EASY_WEEK_ID,
    slug: "less-effort-good-dinners",
    version: 1,
    title: "Less effort, still a good dinner",
    deck: "Flexible meals for a full week: short prep, forgiving ingredients, and very little ceremony.",
    eyebrow: "FOR THE BUSY NIGHTS",
    jobIntent: "reduce_effort",
    heroRecipeId: "kwilt-recipe-di088",
    editorialOwner: "Kwilt Kitchen",
    culturalSources: [],
    mealPlanTemplateId: "template-less-effort-good-dinners",
    sections: [
      {
        id: "fast-and-flexible",
        title: "Fast and flexible",
        note: "Meals that tolerate a swap, a shortcut, or a late start.",
        entries: [
          entry(
            "easy-fajitas",
            "DI088",
            "familiar_anchor",
            "Charred chicken, peppers, onion, and lime make taco night feel fresh again.",
            "The filling cooks in one pan and the toppings need only chopping.",
          ),
          entry(
            "easy-lemon-chicken",
            "DI180",
            "adjacent_discovery",
            "Golden lemon chicken and potatoes share one pan and one bright finish.",
            "The oven does the roasting while a simple salad can come together.",
          ),
          entry(
            "easy-shrimp-rice",
            "DI012",
            "adjacent_discovery",
            "Garlic-butter shrimp and rice make a cozy supper with very little ceremony.",
            "Shrimp cooks quickly and the rice turns the skillet juices into dinner.",
          ),
        ],
      },
    ],
  },
] as const;

function slots(collectionId: string) {
  const collection = EDITORIAL_MEAL_COLLECTIONS.find(
    (item) => item.id === collectionId,
  );
  if (!collection) return [];
  return collection.sections
    .flatMap((section) => section.entries)
    .map((item, index) => ({
      id: `${collectionId}-slot-${index + 1}`,
      recipeId: item.recipeId,
      recipeVersion: item.recipeVersion,
      role: (index === 0
        ? "quick_anchor"
        : index === 1
          ? "ingredient_bridge"
          : "longer_cook") as
        "quick_anchor" | "ingredient_bridge" | "longer_cook",
      reason: item.whyDoable,
    }));
}

export const EDITORIAL_MEAL_PLAN_TEMPLATES: readonly EditorialMealPlanTemplate[] =
  EDITORIAL_MEAL_COLLECTIONS.map((collection) => ({
    id: collection.mealPlanTemplateId!,
    version: 1,
    sourceCollectionId: collection.id,
    sourceCollectionVersion: collection.version,
    title: collection.title,
    horizon: {
      kind: "meal_count",
      count: collection.sections.reduce(
        (total, section) => total + section.entries.length,
        0,
      ),
    },
    defaultServings: 4,
    basketRationale:
      collection.jobIntent === "plan_budget"
        ? "Staple ingredients repeat across meals, while each dinner still has a distinct center."
        : "The sequence balances familiar anchors with a small amount of useful novelty.",
    slots: slots(collection.id),
  }));

export const EDITORIAL_MEAL_COLLECTION_ROTATIONS = [
  [JAPAN_ID, BUDGET_ID],
  [NEW_FLAVORS_ID, EASY_WEEK_ID],
] as const;

function startOfUTCWeek(value: Date): Date {
  const start = new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
  const day = start.getUTCDay();
  start.setUTCDate(start.getUTCDate() - (day === 0 ? 6 : day - 1));
  return start;
}

export function getMealEditorialEdition(
  at: Date = new Date(),
): MealEditorialEdition {
  const starts = startOfUTCWeek(at);
  const ends = new Date(starts);
  ends.setUTCDate(ends.getUTCDate() + 7);
  const weekIndex = Math.floor(starts.getTime() / (7 * 24 * 60 * 60 * 1000));
  const rotation =
    EDITORIAL_MEAL_COLLECTION_ROTATIONS[
      ((weekIndex % EDITORIAL_MEAL_COLLECTION_ROTATIONS.length) + EDITORIAL_MEAL_COLLECTION_ROTATIONS.length) % EDITORIAL_MEAL_COLLECTION_ROTATIONS.length
    ];
  return {
    id: `meal-edition-${starts.toISOString().slice(0, 10)}`,
    startsAt: starts.toISOString(),
    endsAt: ends.toISOString(),
    placements: [
      { slot: "after_third_shelf", collectionId: rotation[0] },
      { slot: "after_sixth_shelf", collectionId: rotation[1] },
    ],
  };
}

export function getEditorialCollection(
  collectionId: string,
): EditorialCollection | null {
  return (
    EDITORIAL_MEAL_COLLECTIONS.find(
      (collection) => collection.id === collectionId,
    ) ?? null
  );
}

export function getEditorialMealPlanTemplate(
  templateId: string,
): EditorialMealPlanTemplate | null {
  return (
    EDITORIAL_MEAL_PLAN_TEMPLATES.find(
      (template) => template.id === templateId,
    ) ?? null
  );
}
