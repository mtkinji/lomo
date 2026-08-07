import {
  CUISINE_FAMILIES,
  FEATURED_CUISINE_FAMILY_IDS,
  getCuisineFamily,
  getCuisineFamilyForCuisine,
  getSubcuisinesForFamily,
} from "./cuisineFamilies";
import { STARTER_RECIPE_CUISINES } from "../data/starterRecipeCatalog";

describe("cuisine families", () => {
  it("maps every authored catalog cuisine to exactly one canonical family", () => {
    for (const cuisine of STARTER_RECIPE_CUISINES) {
      expect(getCuisineFamilyForCuisine(cuisine)).toEqual(
        expect.objectContaining({ id: expect.any(String) }),
      );
    }
  });

  it("keeps the canonical family set compact and every id unique", () => {
    expect(CUISINE_FAMILIES).toHaveLength(20);
    expect(new Set(CUISINE_FAMILIES.map(({ id }) => id)).size).toBe(20);
  });

  it("features a smaller complete illustration rail", () => {
    expect(FEATURED_CUISINE_FAMILY_IDS).toHaveLength(12);
    for (const id of FEATURED_CUISINE_FAMILY_IDS) {
      expect(getCuisineFamily(id)?.featured).toBe(true);
      expect(getSubcuisinesForFamily(id).length).toBeGreaterThan(0);
    }
  });

  it("preserves regional specificity beneath broad navigation families", () => {
    expect(getCuisineFamilyForCuisine("Provençal French")?.id).toBe("french");
    expect(getCuisineFamilyForCuisine("Sichuan Chinese")?.id).toBe("chinese");
    expect(getCuisineFamilyForCuisine("Kerala Indian")?.id).toBe(
      "indian-south-asian",
    );
    expect(getCuisineFamilyForCuisine("Oaxacan Mexican")?.id).toBe("mexican");
    expect(getCuisineFamilyForCuisine("Taiwanese")?.id).toBe("taiwanese");
  });

  it("returns alphabetized regional labels for a family", () => {
    const french = getSubcuisinesForFamily("french");
    expect(french).toEqual([...french].sort((a, b) => a.localeCompare(b)));
    expect(french).toEqual(
      expect.arrayContaining(["French", "Burgundian French", "Provençal French"]),
    );
  });
});
