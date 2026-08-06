import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "../../../services/backend/supabaseClient";
import type {
  FoodScenario,
  FoodScenarioApplication,
  StoreOpportunity,
} from "../domain/foodScenarioContracts";

export function createFoodScenarioRepository(
  client: SupabaseClient = getSupabaseClient(),
) {
  return {
    async capture(
      opportunity: Omit<StoreOpportunity, "id" | "ownerPersonId" | "state">,
    ): Promise<{ opportunityId: string }> {
      const { data, error } = await client.rpc(
        "capture_kwilt_store_opportunity",
        { p_opportunity: opportunity },
      );
      if (error) throw new Error(error.message);
      return data as { opportunityId: string };
    },
    async listOpportunities(): Promise<StoreOpportunity[]> {
      const { data, error } = await client
        .from("kwilt_store_opportunities")
        .select("*")
        .order("observed_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row: any) => ({
        id: row.id,
        ownerPersonId: row.owner_person_id,
        concept: row.concept,
        evidenceMethod: row.evidence_method,
        provider: row.provider,
        barcode: row.barcode,
        artifactRef: row.artifact_ref,
        sourceUrl: row.source_url,
        transcript: row.transcript,
        retailer: row.retailer,
        locationId: row.location_id,
        packageQuantity: Number(row.package_quantity),
        packageUnit: row.package_unit,
        observedPriceCents: Number(row.observed_price_cents),
        comparableUnitPriceCents: Number(row.comparable_unit_price_cents),
        comparableUnit: row.comparable_unit,
        confidence: Number(row.confidence),
        observedAt: row.observed_at,
        expiresAt: row.expires_at,
        state: row.state,
      }));
    },
    async get(scenarioId: string): Promise<FoodScenario | null> {
      const { data, error } = await client
        .from("kwilt_food_scenarios")
        .select("*")
        .eq("id", scenarioId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return {
        id: data.id,
        ownerPersonId: data.owner_person_id,
        version: data.version,
        baseline: data.baseline,
        opportunityIds: data.opportunity_ids ?? [],
        constraintIds: data.constraint_ids ?? [],
        mealPlanDiffs: data.meal_plan_diffs ?? [],
        groceryDiffs: data.grocery_diffs ?? [],
        estimateRangeCents: data.estimate_range_cents,
        currentPriceCoveragePercent: Number(
          data.current_price_coverage_percent,
        ),
        evidenceObservedAt: data.evidence_observed_at,
        assumptions: data.assumptions ?? [],
        lifecycle: data.lifecycle,
        contentHash: data.content_hash,
      };
    },
    async getApplication(
      scenarioId: string,
    ): Promise<FoodScenarioApplication | null> {
      const { data, error } = await client
        .from("kwilt_food_scenario_applications")
        .select("*")
        .eq("scenario_id", scenarioId)
        .eq("state", "recovery_required")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return {
        id: data.id,
        scenarioId: data.scenario_id,
        scenarioVersion: data.scenario_version,
        baseline: data.baseline,
        pendingMealPlanDiffs: data.pending_meal_plan_diffs ?? [],
        pendingGroceryDiffs: data.pending_grocery_diffs ?? [],
        state: data.state,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    },
    async propose(scenario: FoodScenario): Promise<{ scenarioId: string }> {
      const { data, error } = await client.rpc("propose_kwilt_food_scenario", {
        p_scenario: scenario,
      });
      if (error) throw new Error(error.message);
      return data as { scenarioId: string };
    },
    async decide(
      scenarioId: string,
      expectedVersion: number,
      decision: "accept" | "reject",
    ): Promise<unknown> {
      const { data, error } = await client.rpc("decide_kwilt_food_scenario", {
        p_scenario_id: scenarioId,
        p_expected_version: expectedVersion,
        p_decision: decision,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    async recordPurchase(
      opportunityId: string,
    ): Promise<{ observationId: string; state: "likely" }> {
      const { data, error } = await client.rpc(
        "record_kwilt_store_opportunity_purchase",
        { p_opportunity_id: opportunityId },
      );
      if (error) throw new Error(error.message);
      return data as { observationId: string; state: "likely" };
    },
  };
}
