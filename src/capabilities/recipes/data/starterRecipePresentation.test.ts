import { STARTER_EDITORIAL_RECIPE_CATALOG } from "./starterEditorialRecipeCatalog";
import {
  FAMILIAR_STARTER_RECIPE_TITLES,
  getStarterRecipeDisplayTitle,
} from "./starterRecipePresentation";

describe("starter recipe presentation", () => {
  it("leads with familiar food language while retaining useful traditional names", () => {
    const titleFor = (rosterId: string) => {
      const recipe = STARTER_EDITORIAL_RECIPE_CATALOG.find(
        (candidate) => candidate.rosterId === rosterId,
      );
      if (!recipe) throw new Error(`Missing ${rosterId}`);
      return getStarterRecipeDisplayTitle(recipe);
    };

    expect(titleFor("BR018")).toBe(
      "Turkish eggs with garlic yogurt and chile butter (Çılbır)",
    );
    expect(titleFor("BR087")).toBe(
      "Black-eyed pea fritters with corn porridge (Akara with pap)",
    );
    expect(titleFor("DI147")).toBe(
      "Japanese chicken and egg rice bowl (Oyakodon)",
    );
    expect(titleFor("BR001")).toBe("Buttermilk pancakes");
  });

  it("has valid, unique override targets and display titles", () => {
    const rosterIds = new Set(
      STARTER_EDITORIAL_RECIPE_CATALOG.map((recipe) => recipe.rosterId),
    );
    const displayTitles = STARTER_EDITORIAL_RECIPE_CATALOG.map((recipe) =>
      getStarterRecipeDisplayTitle(recipe).trim().toLocaleLowerCase(),
    );

    expect(
      Object.keys(FAMILIAR_STARTER_RECIPE_TITLES).every((id) =>
        rosterIds.has(id),
      ),
    ).toBe(true);
    expect(new Set(displayTitles).size).toBe(600);
    expect(
      displayTitles.every((title) => title.length > 0 && title.length <= 80),
    ).toBe(true);
  });
});
