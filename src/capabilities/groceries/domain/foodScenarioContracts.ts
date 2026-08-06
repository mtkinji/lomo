export type StoreOpportunity = {
  id: string;
  ownerPersonId: string;
  concept: string;
  evidenceMethod: "provider" | "barcode" | "photo" | "url" | "voice" | "manual";
  provider: string | null;
  barcode: string | null;
  artifactRef: string | null;
  sourceUrl: string | null;
  transcript: string | null;
  retailer: string;
  locationId: string | null;
  packageQuantity: number;
  packageUnit: string;
  observedPriceCents: number;
  comparableUnitPriceCents: number;
  comparableUnit: string;
  confidence: number;
  observedAt: string;
  expiresAt: string;
  state: "observed" | "reviewed" | "accepted" | "rejected" | "expired";
};
export type FoodScenario = {
  id: string;
  ownerPersonId: string;
  version: number;
  baseline: {
    mealPlanId: string;
    mealPlanVersion: number;
    groceryListId: string;
    groceryListVersion: number;
    contentHash: string;
  };
  opportunityIds: string[];
  constraintIds: string[];
  mealPlanDiffs: Array<{
    kind: "replace_meal" | "add_meal" | "remove_meal";
    entryId: string;
    replacementRecipeVersionId: string | null;
  }>;
  groceryDiffs: Array<{
    kind: "replace_item" | "add_item" | "remove_item";
    itemId: string;
    replacementConcept: string | null;
  }>;
  estimateRangeCents: { min: number; max: number };
  currentPriceCoveragePercent: number;
  evidenceObservedAt: string;
  assumptions: string[];
  lifecycle:
    "proposed" | "accepted" | "rejected" | "superseded" | "partially_applied";
  contentHash: string;
};
export type FoodScenarioApplication = {
  id: string;
  scenarioId: string;
  scenarioVersion: number;
  baseline: FoodScenario["baseline"];
  pendingMealPlanDiffs: FoodScenario["mealPlanDiffs"];
  pendingGroceryDiffs: FoodScenario["groceryDiffs"];
  state: "recovery_required" | "completed" | "abandoned";
  createdAt: string;
  updatedAt: string;
};
export class FoodScenarioContractError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "FoodScenarioContractError";
  }
}
function cents(value: number) {
  return Number.isSafeInteger(value) && value >= 0;
}
export function parseStoreOpportunity(
  value: StoreOpportunity,
): StoreOpportunity {
  if (
    !value.id ||
    !value.ownerPersonId ||
    !value.concept.trim() ||
    !value.retailer.trim() ||
    !value.packageUnit ||
    !value.comparableUnit ||
    !cents(value.observedPriceCents) ||
    !cents(value.comparableUnitPriceCents) ||
    !Number.isFinite(value.packageQuantity) ||
    value.packageQuantity <= 0
  )
    throw new FoodScenarioContractError(
      "food_scenario.opportunity_invalid",
      "Store opportunity identity, package, retailer, and price are required.",
    );
  if (value.confidence < 0 || value.confidence > 1)
    throw new FoodScenarioContractError(
      "food_scenario.confidence_invalid",
      "Store opportunity confidence must be between zero and one.",
    );
  if (
    !Number.isFinite(Date.parse(value.observedAt)) ||
    !Number.isFinite(Date.parse(value.expiresAt)) ||
    Date.parse(value.expiresAt) <= Date.parse(value.observedAt)
  )
    throw new FoodScenarioContractError(
      "food_scenario.evidence_time_invalid",
      "Store evidence time and expiry are invalid.",
    );
  return { ...value };
}
export function parseFoodScenario(value: FoodScenario): FoodScenario {
  if (
    !value.id ||
    !value.ownerPersonId ||
    !Number.isInteger(value.version) ||
    value.version < 1 ||
    !value.baseline.mealPlanId ||
    !value.baseline.groceryListId ||
    !value.baseline.contentHash ||
    !value.contentHash
  )
    throw new FoodScenarioContractError(
      "food_scenario.identity_invalid",
      "Scenario identity, version, hashes, and baseline are required.",
    );
  if (
    !Number.isInteger(value.baseline.mealPlanVersion) ||
    value.baseline.mealPlanVersion < 1 ||
    !Number.isInteger(value.baseline.groceryListVersion) ||
    value.baseline.groceryListVersion < 1
  )
    throw new FoodScenarioContractError(
      "food_scenario.baseline_invalid",
      "Scenario baseline versions are invalid.",
    );
  if (
    !cents(value.estimateRangeCents.min) ||
    !cents(value.estimateRangeCents.max) ||
    value.estimateRangeCents.max < value.estimateRangeCents.min ||
    value.currentPriceCoveragePercent < 0 ||
    value.currentPriceCoveragePercent > 100
  )
    throw new FoodScenarioContractError(
      "food_scenario.estimate_invalid",
      "Scenario estimate range or coverage is invalid.",
    );
  return {
    ...value,
    baseline: { ...value.baseline },
    opportunityIds: [...value.opportunityIds],
    constraintIds: [...value.constraintIds],
    mealPlanDiffs: value.mealPlanDiffs.map((item) => ({ ...item })),
    groceryDiffs: value.groceryDiffs.map((item) => ({ ...item })),
    estimateRangeCents: { ...value.estimateRangeCents },
    assumptions: [...value.assumptions],
  };
}
