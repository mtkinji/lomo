import type { GroceryProjection } from "../../groceries/data/groceryRepository";
import type { MealPlanProjection } from "../../meal-planning/data/mealPlanningRepository";
import { formatMealTiming } from "../../meal-planning/domain/mealCommitments";

export type CommittedMealPreview = {
  id: string;
  title: string;
  storageRef: string | null;
  timingLabel: string;
  detail: string;
};

function recipeStorageRef(snapshot: Record<string, unknown> | null | undefined): string | null {
  const media = snapshot?.media;
  if (!media || typeof media !== "object" || !("storageRef" in media)) return null;
  return typeof media.storageRef === "string" ? media.storageRef : null;
}

export function getCommittedMealPreviews(
  plan: MealPlanProjection | null,
  limit = 3,
): CommittedMealPreview[] {
  if (!plan || plan.state !== "finalized") return [];
  return plan.occasions
    .flatMap((occasion) => occasion.dishes.map((dish) => ({ occasion, dish })))
    .slice(0, limit)
    .map(({ occasion, dish }) => ({
      id: dish.id,
      title: dish.title,
      storageRef: recipeStorageRef(dish.recipeSnapshot),
      timingLabel: formatMealTiming(occasion.timing),
      detail: [
        dish.dinerPersonIds.length
          ? `${dish.dinerPersonIds.length} ${dish.dinerPersonIds.length === 1 ? "person" : "people"}`
          : null,
        dish.servings === null
          ? null
          : `${dish.servings} ${dish.servings === 1 ? "serving" : "servings"}`,
      ].filter(Boolean).join(" · "),
    }));
}

export type GroceryPlanAction = {
  label: "Make grocery list" | "Review grocery list" | "Review grocery changes" | "Open groceries";
  params: { listId: string } | { planId: string; planVersion: number };
};

export function getGroceryPlanAction(
  plan: MealPlanProjection,
  lists: GroceryProjection[],
): GroceryPlanAction {
  const current = lists.find(
    (list) =>
      list.sourceMealPlanId === plan.id &&
      list.sourceMealPlanVersion === plan.version &&
      list.status !== "stale",
  );
  if (current) {
    return {
      label: current.status === "review_needed" ? "Review grocery list" : "Open groceries",
      params: { listId: current.id },
    };
  }
  const stale = lists.find(
    (list) => list.sourceMealPlanId === plan.id && list.status === "stale",
  );
  if (stale) return { label: "Review grocery changes", params: { listId: stale.id } };
  return {
    label: "Make grocery list",
    params: { planId: plan.id, planVersion: plan.version },
  };
}
