import { Pressable } from '@/src/ui/HapticPressable';
import { useEffect, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, Linking, Platform, ScrollView, Share, StyleSheet, View } from "react-native";
import type { FoodStackParamList } from "../../../features/household-food/FoodNavigator";
import {
  buildHouseholdPlanInviteMessage,
  createHouseholdMemberInvite,
  getHouseholdSnapshot,
  type HouseholdMember,
  type HouseholdSnapshot,
} from "../../../features/household/data/household";
import { getSupabaseClient } from "../../../services/backend/supabaseClient";
import { useAppStore } from "../../../store/useAppStore";
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
  const [household, setHousehold] = useState<HouseholdSnapshot["household"]>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [invitingByText, setInvitingByText] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const authIdentity = useAppStore((state) => state.authIdentity);
  const { capture } = useAnalytics();
  useEffect(() => {
    void Promise.all([
      createMealPlanningRepository().list(),
      getHouseholdSnapshot(getSupabaseClient()),
    ]).then(([plans, household]) => {
      setPlan(plans.find((item) => item.id === route.params.planId) ?? null);
      setHousehold(household.household);
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
    }).finally(() => setLoaded(true));
  }, [route.params.planId]);
  const inviteAdultByText = async () => {
    if (!household || invitingByText) return;
    setInvitingByText(true);
    try {
      const invitation = await createHouseholdMemberInvite(getSupabaseClient(), {
        householdId: household.id,
        role: "caregiver",
        ownerDisplayName: authIdentity?.name || "Kwilter",
      });
      const message = buildHouseholdPlanInviteMessage({
        inviterName: authIdentity?.name || "Someone",
        householdName: household.name,
        code: invitation.code,
      });
      const body = encodeURIComponent(message);
      const smsUrl = Platform.OS === "ios" ? `sms:&body=${body}` : `sms:?body=${body}`;
      const canOpenMessages = await Linking.canOpenURL(smsUrl).catch(() => false);
      if (canOpenMessages) {
        await Linking.openURL(smsUrl);
      } else {
        await Share.share({ message });
      }
    } catch (error) {
      Alert.alert(
        "Could not create household invitation",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setInvitingByText(false);
    }
  };
  const invite = async () => {
    if (!plan?.householdId) return;
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
  if (loaded && plan && !plan.householdId) {
    return (
      <AppShell>
        <PageHeader title="Ask the family" onPressBack={() => navigation.goBack()} />
        <View style={styles.unattached}>
          <Heading variant="md">Share this plan with a Household first.</Heading>
          <Text tone="secondary">
            Your meal plan is safely saved for you. Sharing is a separate choice so Kwilt never creates or exposes a Household by accident.
          </Text>
          <Button onPress={() => navigation.replace("NextMeals")}>Back to meal plan</Button>
        </View>
      </AppShell>
    );
  }
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
        <View style={styles.adultInvite}>
          <Heading variant="sm">Someone not in Kwilt yet?</Heading>
          <Text tone="secondary">
            Invite an adult as a caregiver. They’ll review the Household invitation before joining.
          </Text>
          <Button
            accessibilityLabel="Invite an adult by text"
            disabled={!household}
            loading={invitingByText}
            loadingLabel="Preparing message…"
            variant="secondary"
            onPress={() => {
              void inviteAdultByText();
            }}
          >
            Invite an adult by text
          </Button>
        </View>
        {members.length ? (
          <>
            {!selected.length ? (
              <Text tone="secondary">Choose at least one person to continue.</Text>
            ) : null}
            <Button
              disabled={!selected.length}
              loading={busy}
              loadingLabel="Opening…"
              onPress={() => {
                void invite();
              }}
            >
              Open family choices
            </Button>
          </>
        ) : null}
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
  adultInvite: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  active: { backgroundColor: colors.pine50, borderColor: colors.pine700 },
  unattached: { flex: 1, justifyContent: "center", padding: spacing.lg, gap: spacing.md },
});
