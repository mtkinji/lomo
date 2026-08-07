import { parseRecipeProjection } from "./recipeCache";
import { compileEditorialRecipeProjection } from "./compileEditorialRecipe";
import { STARTER_RECIPE_BATCH_001 } from "./starterRecipeBatch001";

describe("compile editorial recipe", () => {
  it("creates a stable, contract-valid Kwilt catalog projection without overstating proof", () => {
    const editorial = STARTER_RECIPE_BATCH_001[0];
    const projection = compileEditorialRecipeProjection(editorial);

    expect(() => parseRecipeProjection(projection)).not.toThrow();
    expect(projection.recipe.id).toBe("kwilt-recipe-br001");
    expect(projection.recipe.ownerPersonId).toBe("kwilt-catalog");
    expect(projection.recipe.provenance).toEqual(
      expect.objectContaining({
        method: "catalog",
        rightsBasis: "kwilt_authored",
        sourceTitle: "Kwilt Starter Catalog",
      }),
    );
    expect(projection.currentVersion).toEqual(
      expect.objectContaining({
        title: editorial.title,
        description: editorial.description,
        prepMinutes: editorial.prepMinutes,
        cookMinutes: editorial.cookMinutes,
        notes: editorial.notes,
      }),
    );
    expect(
      projection.currentVersion.ingredients.map((line) => line.originalText),
    ).toEqual(editorial.ingredients);
    expect(
      projection.currentVersion.instructions.map((step) => step.text),
    ).toEqual(editorial.instructions);
    expect(projection.currentVersion.instructions[1].cues).toEqual([
      expect.objectContaining({ position: 0, text: 'Whisk flour, sugar, baking powder, baking soda, and salt in a large bowl.' }),
      expect.objectContaining({ position: 1, text: 'Whisk buttermilk, eggs, and melted butter in a second bowl.' }),
    ]);
    expect(projection.currentVersion.instructions[0].sectionLabel).toBeNull();
    expect(projection.currentVersion.contentHash).toBe("kwilt:BR001:v1");
  });

  it("uses roster identities rather than title slugs", () => {
    const editorial = STARTER_RECIPE_BATCH_001[0];
    const renamed = { ...editorial, title: "A clearer pancake title" };

    expect(compileEditorialRecipeProjection(renamed).recipe.id).toBe(
      compileEditorialRecipeProjection(editorial).recipe.id,
    );
  });

  it("compiles the familiar presentation title for an unfamiliar dish name", () => {
    const editorial = STARTER_RECIPE_BATCH_001[0];
    const unfamiliar = {
      ...editorial,
      rosterId: "BR018",
      title: "Çılbır with chile butter",
    };

    expect(
      compileEditorialRecipeProjection(unfamiliar).currentVersion.title,
    ).toBe("Turkish eggs with garlic yogurt and chile butter (Çılbır)");
  });
});
