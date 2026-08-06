import { useEffect, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import type { FoodStackParamList } from "../../../features/household-food/FoodNavigator";
import { spacing } from "../../../theme";
import { Button } from "../../../ui/Button";
import { AppShell } from "../../../ui/layout/AppShell";
import { PageHeader } from "../../../ui/layout/PageHeader";
import { Heading, Text } from "../../../ui/Typography";
import { createFoodScenarioRepository } from "../data/foodScenarioRepository";
import type {
  FoodScenario,
  FoodScenarioApplication,
  StoreOpportunity,
} from "../domain/foodScenarioContracts";
import { AnalyticsEvent } from "../../../services/analytics/events";
import { useAnalytics } from "../../../services/analytics/useAnalytics";

type Props = NativeStackScreenProps<FoodStackParamList, "FoodScenarioReview">;
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function FoodScenarioReviewScreen({ navigation, route }: Props) {
  const { capture } = useAnalytics();
  const [scenario, setScenario] = useState<FoodScenario | null>(null);
  const [opportunities, setOpportunities] = useState<StoreOpportunity[]>([]);
  const [application, setApplication] =
    useState<FoodScenarioApplication | null>(null);
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);
  const load = async () => {
    try {
      const repository = createFoodScenarioRepository();
      const [nextScenario, available] = await Promise.all([
        repository.get(route.params.scenarioId),
        repository.listOpportunities(),
      ]);
      setScenario(nextScenario);
      setOpportunities(
        available.filter((item) =>
          nextScenario?.opportunityIds.includes(item.id),
        ),
      );
      setApplication(
        nextScenario?.lifecycle === "partially_applied"
          ? await repository.getApplication(nextScenario.id)
          : null,
      );
      if (nextScenario)
        capture(AnalyticsEvent.FoodScenarioReviewed, {
          state: nextScenario.lifecycle,
        });
      setMissing(!nextScenario);
    } catch {
      setMissing(true);
    }
  };
  useEffect(() => {
    void load();
  }, [route.params.scenarioId]);
  const decide = async (decision: "accept" | "reject") => {
    if (!scenario) return;
    setBusy(true);
    try {
      const result = (await createFoodScenarioRepository().decide(
        scenario.id,
        scenario.version,
        decision,
      )) as { recoveryRequired?: boolean };
      capture(AnalyticsEvent.FoodScenarioAccepted, {
        outcome: decision,
        state: result.recoveryRequired ? "recovery_required" : "complete",
      });
      if (result.recoveryRequired)
        Alert.alert(
          "Changes still need review",
          "Kwilt preserved the original plan and list. Open each suggested change before applying it.",
        );
      else navigation.goBack();
      await load();
    } catch (error) {
      Alert.alert(
        "Scenario changed",
        error instanceof Error ? error.message : "Refresh and review again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <AppShell>
      <PageHeader
        title="Review this option"
        onPressBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {missing ? (
          <>
            <Heading variant="md">This option is no longer available.</Heading>
            <Text tone="secondary">
              Your current meal plan and grocery list were not changed.
            </Text>
          </>
        ) : !scenario ? (
          <Text>Loading the comparison…</Text>
        ) : (
          <>
            <View style={styles.intro}>
              <Heading variant="md">A possible way to spend less</Heading>
              <Text tone="secondary">
                Estimated basket {money(scenario.estimateRangeCents.min)}–
                {money(scenario.estimateRangeCents.max)} with current prices for{" "}
                {Math.round(scenario.currentPriceCoveragePercent)}% of the list.
              </Text>
              <Text tone="secondary">
                Prices observed{" "}
                {new Date(scenario.evidenceObservedAt).toLocaleString()}.
              </Text>
            </View>
            {scenario.mealPlanDiffs.length ? (
              <View style={styles.section}>
                <Heading variant="sm">Meals that would change</Heading>
                {scenario.mealPlanDiffs.map((change, index) => (
                  <Text key={`${change.entryId}-${index}`}>
                    {change.kind.replaceAll("_", " ")}
                  </Text>
                ))}
              </View>
            ) : null}
            {scenario.groceryDiffs.length ? (
              <View style={styles.section}>
                <Heading variant="sm">Grocery changes</Heading>
                {scenario.groceryDiffs.map((change, index) => (
                  <Text key={`${change.itemId}-${index}`}>
                    {change.kind.replaceAll("_", " ")}
                    {change.replacementConcept
                      ? ` with ${change.replacementConcept}`
                      : ""}
                  </Text>
                ))}
              </View>
            ) : null}
            {opportunities.map((opportunity) => (
              <View key={opportunity.id} style={styles.section}>
                <Heading variant="sm">{opportunity.concept}</Heading>
                <Text tone="secondary">
                  {money(opportunity.observedPriceCents)} at{" "}
                  {opportunity.retailer}; observed evidence, not a guaranteed
                  checkout price.
                </Text>
                <Button
                  variant="outline"
                  disabled={busy || opportunity.state === "accepted"}
                  onPress={() => {
                    setBusy(true);
                    void createFoodScenarioRepository()
                      .recordPurchase(opportunity.id)
                      .then(load)
                      .catch((error) =>
                        Alert.alert(
                          "Purchase did not save",
                          error instanceof Error ? error.message : "Try again.",
                        ),
                      )
                      .finally(() => setBusy(false));
                  }}
                >
                  {opportunity.state === "accepted"
                    ? "Saved as likely on hand"
                    : "I bought it"}
                </Button>
                <Text tone="secondary">
                  This records likely stock only. It does not accept the meal
                  substitution.
                </Text>
              </View>
            ))}
            {scenario.assumptions.length ? (
              <View style={styles.section}>
                <Heading variant="sm">What this assumes</Heading>
                {scenario.assumptions.map((assumption) => (
                  <Text key={assumption}>• {assumption}</Text>
                ))}
              </View>
            ) : null}
            {scenario.lifecycle === "proposed" ? (
              <>
                <Button
                  disabled={busy}
                  onPress={() => {
                    void decide("accept");
                  }}
                >
                  Review suggested changes
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onPress={() => {
                    void decide("reject");
                  }}
                >
                  Keep my current plan
                </Button>
              </>
            ) : (
              <Text tone="secondary">
                Status: {scenario.lifecycle.replaceAll("_", " ")}. The preserved
                baseline is still available for recovery.
              </Text>
            )}
            {application ? (
              <View style={styles.section}>
                <Heading variant="sm">Finish the reviewed changes</Heading>
                <Text tone="secondary">
                  Kwilt kept {application.pendingMealPlanDiffs.length} meal
                  change
                  {application.pendingMealPlanDiffs.length === 1 ? "" : "s"} and{" "}
                  {application.pendingGroceryDiffs.length} grocery change
                  {application.pendingGroceryDiffs.length === 1 ? "" : "s"}{" "}
                  separate so neither capability can be silently half-rewritten.
                </Text>
                {application.pendingMealPlanDiffs.length ? (
                  <Button
                    onPress={() =>
                      navigation.navigate("MealPlanEditor", {
                        planId: application.baseline.mealPlanId,
                      })
                    }
                  >
                    Review meal changes
                  </Button>
                ) : null}
                {application.pendingGroceryDiffs.length ? (
                  <Button
                    variant="outline"
                    onPress={() =>
                      navigation.navigate("GroceryList", {
                        listId: application.baseline.groceryListId,
                      })
                    }
                  >
                    Review grocery changes
                  </Button>
                ) : null}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </AppShell>
  );
}
const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  intro: { gap: spacing.xs },
  section: { gap: spacing.sm },
});
