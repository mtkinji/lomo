import { useEffect, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import type { FoodStackParamList } from "../../../features/household-food/FoodNavigator";
import { spacing } from "../../../theme";
import { AppShell } from "../../../ui/layout/AppShell";
import { PageHeader } from "../../../ui/layout/PageHeader";
import { Heading, Text } from "../../../ui/Typography";
import { AnalyticsEvent } from "../../../services/analytics/events";
import { useAnalytics } from "../../../services/analytics/useAnalytics";
import { SavingsOptionCard } from "../components/SavingsOptionCard";
import { createGroceryRepository } from "../data/groceryRepository";
import { createGrocerySavingsRepository } from "../data/grocerySavingsRepository";
import type { SavingsOption } from "../domain/savingsContracts";

type Props = NativeStackScreenProps<FoodStackParamList, "GrocerySavings">;
export function GrocerySavingsScreen({ navigation, route }: Props) {
  const { capture } = useAnalytics();
  const [options, setOptions] = useState<SavingsOption[] | null>(null);
  const [coverage, setCoverage] = useState(0);
  useEffect(() => {
    void (async () => {
      try {
        const list = (await createGroceryRepository().list()).find(
          (entry) => entry.id === route.params.listId,
        );
        if (!list) throw new Error("List unavailable");
        const result = await createGrocerySavingsRepository().prepare(
          list.id,
          list.revision,
        );
        setOptions(result.options);
        setCoverage(result.evidenceCoveragePercent);
        capture(AnalyticsEvent.SavingsReviewed, {
          count: result.options.length,
          evidence_coverage_bucket:
            Math.floor(result.evidenceCoveragePercent / 20) * 20,
        });
      } catch {
        setOptions([]);
      }
    })();
  }, [capture, route.params.listId]);
  return (
    <AppShell>
      <PageHeader
        title="Savings check"
        onPressBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <Heading variant="md">Save where the evidence is solid.</Heading>
          <Text tone="secondary">
            Kwilt compares equivalent quantities, fees, memberships, food you
            have, and likely waste. Savings stay estimated until a receipt or
            retailer confirms them.
          </Text>
        </View>
        {options === null ? (
          <Text>Checking current evidence…</Text>
        ) : options.length === 0 ? (
          <View style={styles.empty}>
            <Heading variant="sm">No verified offers yet</Heading>
            <Text tone="secondary">
              Kwilt won’t call a shelf price a coupon or promise a discount it
              cannot verify. Your reviewed plain list is still ready.
            </Text>
          </View>
        ) : (
          <>
            <Text tone="secondary">
              Current evidence covers {coverage}% of this list.
            </Text>
            {options.map((option) => (
              <SavingsOptionCard
                key={option.id}
                option={option}
                onPress={() =>
                  Alert.alert(
                    option.nextAction,
                    option.nextAction === "Activate in retailer app"
                      ? "Open the retailer app, activate the coupon, then return to refresh acknowledgement."
                      : "This choice will be reviewed before the grocery list changes.",
                  )
                }
              />
            ))}
          </>
        )}
      </ScrollView>
    </AppShell>
  );
}
const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  intro: { gap: spacing.xs },
  empty: { paddingVertical: spacing.xl, gap: spacing.sm },
});
