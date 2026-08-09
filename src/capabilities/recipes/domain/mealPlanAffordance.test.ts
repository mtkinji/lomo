import type { GroceryProjection } from "../../groceries/data/groceryRepository";
import type { MealPlanProjection } from "../../meal-planning/data/mealPlanningRepository";
import { getCommittedMealPreviews, getGroceryPlanAction } from "./mealPlanAffordance";

function plan(): MealPlanProjection {
  return {
    id: "plan-1",
    householdId: "household-1",
    version: 4,
    state: "finalized",
    horizon: { kind: "open" },
    candidates: [],
    entries: [],
    activeRound: null,
    updatedAt: "2026-08-08T12:00:00.000Z",
    occasions: [
      {
        id: "occasion-1",
        title: null,
        placementDate: null,
        timing: { kind: "flexible" },
        notEatingPersonIds: [],
        dishes: [
          { id: "dish-1", candidateId: "one", title: "Tacos", servings: 4, dinerPersonIds: [], recipeSnapshot: { media: { storageRef: "recipes/tacos.jpg" } } },
          { id: "dish-2", candidateId: "two", title: "Pasta", servings: 4, dinerPersonIds: [], recipeSnapshot: null },
        ],
      },
    ],
  };
}

function grocery(status: GroceryProjection["status"], version: number): GroceryProjection {
  return {
    id: `list-${status}`,
    revision: 1,
    status,
    sourceKind: "meal_plan",
    sourceMealPlanId: "plan-1",
    sourceMealPlanVersion: version,
    sourceRecipeVersionId: null,
    sourceTitle: null,
    items: [],
    updatedAt: "2026-08-08T12:00:00.000Z",
  };
}

describe("Plan affordance presentation", () => {
  it("prepares committed meals as informative list rows", () => {
    expect(getCommittedMealPreviews(plan())).toEqual([
      { id: "dish-1", title: "Tacos", storageRef: "recipes/tacos.jpg", timingLabel: "Flexible", detail: "4 servings" },
      { id: "dish-2", title: "Pasta", storageRef: null, timingLabel: "Flexible", detail: "4 servings" },
    ]);
  });

  it("does not present draft work as committed meals", () => {
    expect(getCommittedMealPreviews({ ...plan(), state: "draft" })).toEqual([]);
  });

  it("names the grocery action from the matching plan-version state", () => {
    expect(getGroceryPlanAction(plan(), [])).toEqual({
      label: "Make grocery list",
      params: { planId: "plan-1", planVersion: 4 },
    });
    expect(getGroceryPlanAction(plan(), [grocery("review_needed", 4)]).label).toBe("Review grocery list");
    expect(getGroceryPlanAction(plan(), [grocery("ready", 4)]).label).toBe("Open groceries");
    expect(getGroceryPlanAction(plan(), [grocery("stale", 3)])).toEqual({
      label: "Review grocery changes",
      params: { listId: "list-stale" },
    });
  });
});
