import { useEffect, useMemo, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import type { FoodStackParamList } from "../../../features/household-food/FoodNavigator";
import { colors, spacing, typography } from "../../../theme";
import { Button } from "../../../ui/Button";
import { AppShell } from "../../../ui/layout/AppShell";
import { PageHeader } from "../../../ui/layout/PageHeader";
import { Heading, Text } from "../../../ui/Typography";
import {
  createMealPlanningRepository,
  type MealPlanProjection,
} from "../data/mealPlanningRepository";
import { groupMealChoices } from "../domain/mealChoiceAggregate";
import { useAnalytics } from "../../../services/analytics/useAnalytics";
import { AnalyticsEvent } from "../../../services/analytics/events";

type Props = NativeStackScreenProps<FoodStackParamList, "MealPlanFinalize">;
type Detail = { servings: string; placementDate: string };
export function MealPlanFinalizeScreen({ navigation, route }: Props) {
  const [plan, setPlan] = useState<MealPlanProjection | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const [busy, setBusy] = useState(false);
  const { capture } = useAnalytics();
  useEffect(() => {
    void createMealPlanningRepository()
      .list()
      .then(async (plans) => {
        const found =
          plans.find((item) => item.id === route.params.planId) ?? null;
        setPlan(found);
        setSelected(found?.candidates.map((item) => item.id) ?? []);
        setDetails(
          Object.fromEntries(
            (found?.candidates ?? []).map((candidate) => [
              candidate.id,
              { servings: "", placementDate: "" },
            ]),
          ),
        );
        if (found?.activeRound) {
          const aggregate = await createMealPlanningRepository().aggregate(
            found.activeRound.id,
          );
          setCounts(
            Object.fromEntries(
              aggregate.map((item) => [item.candidateId, item.pickCount]),
            ),
          );
        }
      });
  }, [route.params.planId]);
  const groups = useMemo(
    () =>
      groupMealChoices(
        (plan?.candidates ?? []).map((candidate) => ({
          candidateId: candidate.id,
          pickCount: counts[candidate.id] ?? 0,
        })),
      ),
    [counts, plan?.candidates],
  );
  const label = (id: string) =>
    groups.family_favorites.includes(id)
      ? "Family favorite"
      : groups.sounded_good.includes(id)
        ? "Sounded good"
        : "Still available";
  const finalize = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      const repository = createMealPlanningRepository();
      let version = plan.version;
      if (
        plan.state === "collecting_choices" &&
        plan.activeRound?.state === "open"
      ) {
        const receipt = (await repository.closeRound(
          plan.activeRound.id,
          plan.activeRound.version,
        )) as any;
        version = receipt.planVersion;
        capture(AnalyticsEvent.MealChoiceRoundClosed, { state: "closed" });
      }
      await repository.finalize({
        planId: plan.id,
        expectedVersion: version,
        selected: selected.map((candidateId) => ({
          candidateId,
          servings: Number(details[candidateId]?.servings) || null,
          placementDate: details[candidateId]?.placementDate.trim() || null,
        })),
        organizerNote: null,
      });
      capture(AnalyticsEvent.MealPlanFinalized, { count: selected.length });
      navigation.replace("NextMeals");
    } catch (error) {
      Alert.alert(
        "Plan did not finalize",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <AppShell>
      <PageHeader
        title="Finalize meals"
        onPressBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Heading variant="md">Choose what actually makes the plan.</Heading>
        <Text tone="secondary">
          Family choices are input, not a vote. Set servings and dates only
          where they help.
        </Text>
        {plan?.candidates.map((candidate) => {
          const active = selected.includes(candidate.id);
          const detail = details[candidate.id] ?? {
            servings: "",
            placementDate: "",
          };
          return (
            <View
              key={candidate.id}
              style={[styles.card, active && styles.active]}
            >
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                onPress={() =>
                  setSelected((current) =>
                    active
                      ? current.filter((id) => id !== candidate.id)
                      : [...current, candidate.id],
                  )
                }
                style={styles.row}
              >
                <Text>{candidate.title}</Text>
                <Text tone="secondary">{label(candidate.id)}</Text>
              </Pressable>
              {active ? (
                <View style={styles.detailRow}>
                  <TextInput
                    accessibilityLabel={`Servings for ${candidate.title}`}
                    keyboardType="decimal-pad"
                    placeholder="Servings"
                    value={detail.servings}
                    onChangeText={(servings) =>
                      setDetails((current) => ({
                        ...current,
                        [candidate.id]: { ...detail, servings },
                      }))
                    }
                    style={styles.input}
                  />
                  <TextInput
                    accessibilityLabel={`Date for ${candidate.title}`}
                    placeholder="Date (optional)"
                    value={detail.placementDate}
                    onChangeText={(placementDate) =>
                      setDetails((current) => ({
                        ...current,
                        [candidate.id]: { ...detail, placementDate },
                      }))
                    }
                    style={styles.input}
                  />
                </View>
              ) : null}
            </View>
          );
        })}
        <Button
          disabled={!plan || !selected.length || busy}
          onPress={() => {
            void finalize();
          }}
        >
          {busy ? "Finalizing…" : "Finalize these meals"}
        </Button>
      </ScrollView>
    </AppShell>
  );
}
const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md },
  card: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    gap: spacing.sm,
  },
  active: { backgroundColor: colors.pine50, borderColor: colors.pine700 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  detailRow: { flexDirection: "row", gap: spacing.sm },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    color: colors.textPrimary,
    backgroundColor: colors.fieldFill,
    ...typography.body,
  },
});
