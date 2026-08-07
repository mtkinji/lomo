import { useEffect, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Pressable, ScrollView, StyleSheet } from "react-native";
import type { FoodStackParamList } from "../../../features/household-food/FoodNavigator";
import {
  getHouseholdSnapshot,
  type HouseholdMember,
} from "../../../features/household/data/household";
import { getSupabaseClient } from "../../../services/backend/supabaseClient";
import { colors, spacing } from "../../../theme";
import { Button } from "../../../ui/Button";
import { AppShell } from "../../../ui/layout/AppShell";
import { PageHeader } from "../../../ui/layout/PageHeader";
import { Heading, Text } from "../../../ui/Typography";
import {
  createMealPlanningRepository,
  type MealPlanProjection,
} from "../data/mealPlanningRepository";
import { useAnalytics } from "../../../services/analytics/useAnalytics";
import { AnalyticsEvent } from "../../../services/analytics/events";

type Props = NativeStackScreenProps<FoodStackParamList, "MealChoiceInvite">;

export function MealChoiceInviteScreen({ navigation, route }: Props) {
  const [plan, setPlan] = useState<MealPlanProjection | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { capture } = useAnalytics();
  useEffect(() => {
    void Promise.all([
      createMealPlanningRepository().list(),
      getHouseholdSnapshot(getSupabaseClient()),
    ]).then(([plans, household]) => {
      setPlan(plans.find((item) => item.id === route.params.planId) ?? null);
      const activeChildren = new Set(
        household.activations
          .filter(
            (item) =>
              item.capabilityId === "meal-planning" && item.state === "active",
          )
          .map((item) => item.childMembershipId),
      );
      setMembers(
        household.members.filter(
          (member) =>
            member.id !== household.currentMembershipId &&
            (member.role !== "child" || activeChildren.has(member.id)),
        ),
      );
    });
  }, [route.params.planId]);
  const invite = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      await createMealPlanningRepository().openRound({
        planId: plan.id,
        expectedVersion: plan.version,
        participantMembershipIds: selected,
        closesAt: null,
      });
      capture(AnalyticsEvent.MealChoiceRoundOpened, { count: selected.length });
      navigation.replace("NextMeals");
    } catch (error) {
      Alert.alert(
        "Could not ask the family",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <AppShell>
      <PageHeader
        title="Ask the family"
        onPressBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Heading variant="md">Who should weigh in?</Heading>
        <Text tone="secondary">
          Each person chooses privately: pick up to three, pass, or suggest one
          idea. You still finalize the plan.
        </Text>
        {members.map((member) => {
          const active = selected.includes(member.id);
          return (
            <Pressable
              key={member.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              onPress={() =>
                setSelected((current) =>
                  active
                    ? current.filter((id) => id !== member.id)
                    : [...current, member.id],
                )
              }
              style={[styles.member, active && styles.active]}
            >
              <Text>{member.displayName}</Text>
              <Text tone="secondary">{active ? "Included" : "Include"}</Text>
            </Pressable>
          );
        })}
        {!members.length ? (
          <Text tone="secondary">
            No activated household members are available yet.
          </Text>
        ) : null}
        <Button
          disabled={!selected.length || busy}
          onPress={() => {
            void invite();
          }}
        >
          {busy ? "Opening…" : "Open family choices"}
        </Button>
      </ScrollView>
    </AppShell>
  );
}
const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md },
  member: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
  },
  active: { backgroundColor: colors.pine50, borderColor: colors.pine700 },
});
