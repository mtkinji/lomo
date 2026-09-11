import type { HouseholdSnapshot } from "../household/data/household";
import type { MoneyOnboardingState } from "../../capabilities/money/runtime/moneyOnboardingStorage";
import type { MealPlanProjection } from "../../capabilities/meal-planning/data/mealPlanningRepository";
import type { HomeRecommendationEvidence } from "./homeRecommendations";
export type HomeRecommendationSources = {
  household: () => Promise<HouseholdSnapshot>;
  money: () => Promise<
    Pick<
      MoneyOnboardingState,
      "completedAt" | "checkpoint" | "introductionSeenAt"
    > & { hasActivePlan?: boolean; hasTarget?: boolean }
  >;
  meals: () => Promise<MealPlanProjection[]>;
};
export const UNKNOWN_HOME_EVIDENCE: HomeRecommendationEvidence = {
  access: "unknown",
  household: "unknown",
  money: "unknown",
  meals: "unknown",
};
export async function loadHomeRecommendationEvidence(
  sources: HomeRecommendationSources,
  isCurrent: () => boolean,
) {
  let household: HouseholdSnapshot;
  try {
    household = await sources.household();
  } catch {
    return { evidence: UNKNOWN_HOME_EVIDENCE, partialError: true };
  }
  if (!isCurrent())
    return { evidence: UNKNOWN_HOME_EVIDENCE, partialError: false };
  const member = household.members.find(
    (m) => m.id === household.currentMembershipId,
  );
  if (member?.role === "child" || member?.kind === "dependent") {
    return {
      evidence: { ...UNKNOWN_HOME_EVIDENCE, access: "child" as const },
      partialError: false,
    };
  }
  if (household.household && !member)
    return { evidence: UNKNOWN_HOME_EVIDENCE, partialError: true };
  const [money, meals] = await Promise.allSettled([
    Promise.resolve().then(sources.money),
    Promise.resolve().then(sources.meals),
  ]);
  const evidence: HomeRecommendationEvidence = {
    access: "adult",
    household: household.members.length > 1 ? "together" : "solo",
    money:
      money.status === "rejected"
        ? "unknown"
        : money.value.completedAt || money.value.hasActivePlan
          ? "complete"
          : money.value.hasTarget
            ? "settled"
            : money.value.checkpoint
              ? "started"
              : money.value.introductionSeenAt
                ? "settled"
                : "unused",
    meals:
      meals.status === "rejected"
        ? "unknown"
        : meals.value.some(
              (plan) =>
                plan.state !== "archived" &&
                plan.candidates.some(
                  (c) => c.lifecycle !== "made" && c.lifecycle !== "removed",
                ),
            )
          ? "active"
          : meals.value.length
            ? "settled"
            : "unused",
  };
  return {
    evidence,
    partialError: money.status === "rejected" || meals.status === "rejected",
  };
}
