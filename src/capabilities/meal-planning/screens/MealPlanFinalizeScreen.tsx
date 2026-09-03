import { Pressable } from '@/src/ui/HapticPressable';
import { useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import type { FoodStackParamList } from '../../../features/household-food/FoodNavigator';
import { useHouseholdMealPreferencesStore } from '../../../features/household-food/runtime/useHouseholdMealPreferencesStore';
import { colors, radii, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { AppShell } from '../../../ui/layout/AppShell';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { Heading, Text } from '../../../ui/Typography';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../../services/analytics/events';
import { useAppStore } from '../../../store/useAppStore';
import { resolveSuggestedMealServings } from '../../recipes/domain/mealPreferences';
import { MealOccasionDrawer } from '../components/MealOccasionDrawer';
import { buildMealPlanningReminderActivity, MealPlanningReminderOfferDrawer } from '../components/MealPlanningReminderOfferDrawer';
import { createMealPlanningRepository, type MealPlanProjection } from '../data/mealPlanningRepository';
import type { MealTimingIntent } from '../domain/mealPlanContracts';
import { classifyMealPlanFinalizeFailure } from '../domain/mealPlanFinalizationTelemetry';

type Props = NativeStackScreenProps<FoodStackParamList, 'MealPlanFinalize'>;

export type EditableMealDish = {
  id: string;
  candidateId: string;
  title: string;
  dinerPersonIds: string[];
  servings: number;
};

export type EditableMealOccasion = {
  id: string;
  title: string | null;
  placementDate: string | null;
  timing: MealTimingIntent;
  notEatingPersonIds: string[];
  dishes: EditableMealDish[];
};

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string' && Boolean(item)))] : [];
}

export function buildDefaultMealOccasions(
  plan: MealPlanProjection,
  usualDinerPersonIds: readonly string[],
  usualDinerCount: number,
  makeId: () => string = () => Crypto.randomUUID(),
): EditableMealOccasion[] {
  if (plan.occasions.length) {
    return plan.occasions.map((occasion) => ({
      ...occasion,
      id: makeId(),
      notEatingPersonIds: [...occasion.notEatingPersonIds],
      dishes: occasion.dishes.map((dish) => {
        const recipeVersionId = dish.recipeSnapshot?.recipeVersionId;
        const currentCandidate = plan.candidates.find((candidate) => candidate.id === dish.candidateId)
          ?? plan.candidates.find((candidate) => recipeVersionId && candidate.recipeSnapshot?.recipeVersionId === recipeVersionId)
          ?? plan.candidates.find((candidate) => candidate.title === dish.title);
        return { ...dish, id: makeId(), candidateId: currentCandidate?.id ?? dish.candidateId, servings: dish.servings ?? Math.max(1, usualDinerCount), dinerPersonIds: [...dish.dinerPersonIds] };
      }),
    }));
  }
  return plan.candidates.map((candidate) => {
    const snapshot = candidate.recipeSnapshot ?? {};
    const selectedDiners = stringArray(snapshot.dinerPersonIds);
    const dinerPersonIds = selectedDiners.length ? selectedDiners : [...usualDinerPersonIds];
    const excluded = stringArray(snapshot.excludedDinerPersonIds);
    return {
      id: makeId(),
      title: null,
      placementDate: null,
      timing: { kind: 'flexible' },
      notEatingPersonIds: snapshot.excludedDinerResolution === 'not_eating' ? excluded : [],
      dishes: [{
        id: makeId(),
        candidateId: candidate.id,
        title: candidate.title,
        dinerPersonIds,
        servings: resolveSuggestedMealServings({
          selectedServings: typeof snapshot.plannedPortions === 'number'
            ? snapshot.plannedPortions
            : typeof snapshot.selectedServings === 'number' ? snapshot.selectedServings : null,
          usualDinerCount,
          usualDinerPersonIds: dinerPersonIds,
        }),
      }],
    };
  });
}

export function occasionNeedsAttention(occasion: EditableMealOccasion, usualDinerPersonIds: readonly string[]): boolean {
  const resolved = new Set([...occasion.notEatingPersonIds, ...occasion.dishes.flatMap((dish) => dish.dinerPersonIds)]);
  return occasion.dishes.length === 0 || occasion.dishes.some((dish) => !dish.dinerPersonIds.length || dish.servings <= 0) || usualDinerPersonIds.some((personId) => !resolved.has(personId));
}

export function MealPlanFinalizeScreen({ navigation, route }: Props) {
  const [plan, setPlan] = useState<MealPlanProjection | null>(null);
  const [occasions, setOccasions] = useState<EditableMealOccasion[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<{ occasionId: string; dishId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [showReminderOffer, setShowReminderOffer] = useState(false);
  const preferences = useHouseholdMealPreferencesStore((state) => state.projection);
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const addActivity = useAppStore((state) => state.addActivity);
  const usualDinerPersonIds = preferences?.usualDinerPersonIds ?? [];
  const usualDinerCount = preferences?.usualDinerCount ?? Math.max(1, usualDinerPersonIds.length || 2);
  const members = preferences?.members ?? [];
  const { capture } = useAnalytics();
  const continueToNextMeals = () => navigation.replace('NextMeals', {
    feedbackPromptId: 'meal_plan_finalized_satisfaction_v1',
  });

  useEffect(() => {
    void createMealPlanningRepository().list().then(async (plans) => {
      const found = plans.find((item) => item.id === route.params.planId) ?? null;
      setPlan(found);
      if (!found) return;
      setOccasions(buildDefaultMealOccasions(found, usualDinerPersonIds, usualDinerCount));
      if (found.activeRound) {
        const aggregate = await createMealPlanningRepository().aggregate(found.activeRound.id);
        setCounts(Object.fromEntries(aggregate.map((item) => [item.candidateId, item.pickCount])));
      }
    }).catch((error) => Alert.alert('Plan unavailable', error instanceof Error ? error.message : 'Please try again.'));
  }, [route.params.planId, usualDinerCount, usualDinerPersonIds.join('|')]);

  const activeOccasion = occasions.find((occasion) => occasion.id === editing?.occasionId);
  const activeDish = activeOccasion?.dishes.find((dish) => dish.id === editing?.dishId);
  const attentionCount = occasions.filter((occasion) => occasionNeedsAttention(occasion, usualDinerPersonIds)).length;
  const memberName = (personId: string) => members.find((member) => member.personId === personId)?.displayName ?? 'Someone';
  const dinerSummary = (personIds: readonly string[]) => personIds.length === usualDinerPersonIds.length && usualDinerPersonIds.every((id) => personIds.includes(id))
    ? 'Everyone'
    : personIds.map(memberName).join(', ');

  const addAnotherDish = (occasionId: string, sourceDishId: string, personIds: string[]) => {
    const source = occasions.find((occasion) => occasion.id !== occasionId && occasion.dishes.some((dish) => dish.id === sourceDishId));
    if (!source) {
      Alert.alert('Add another meal first', 'Add another meal to the plan, then you can serve it as the alternate dish.');
      return;
    }
    const sourceDish = source.dishes.find((dish) => dish.id === sourceDishId)!;
    setOccasions((current) => current
      .map((occasion) => occasion.id === occasionId
        ? { ...occasion, dishes: [...occasion.dishes, { ...sourceDish, id: Crypto.randomUUID(), dinerPersonIds: personIds, servings: Math.max(1, personIds.length) }] }
        : occasion.id === source.id ? { ...occasion, dishes: occasion.dishes.filter((dish) => dish.id !== sourceDishId) } : occasion)
      .filter((occasion) => occasion.dishes.length));
    setEditing(null);
  };

  const finalize = async () => {
    if (!plan || !occasions.length || attentionCount) return;
    setBusy(true);
    try {
      const repository = createMealPlanningRepository();
      let version = plan.version;
      if (plan.state === 'collecting_choices' && plan.activeRound?.state === 'open') {
        const receipt = await repository.closeRound(plan.activeRound.id, plan.activeRound.version) as { planVersion: number };
        version = receipt.planVersion;
        capture(AnalyticsEvent.MealChoiceRoundClosed, { state: 'closed' });
      }
      await repository.finalize({ planId: plan.id, expectedVersion: version, occasions, organizerNote: null });
      capture(AnalyticsEvent.MealPlanFinalized, {
        count: occasions.length,
        dish_count: occasions.reduce((sum, occasion) => sum + occasion.dishes.length, 0),
        diner_count: new Set(occasions.flatMap((occasion) => occasion.dishes.flatMap((dish) => dish.dinerPersonIds))).size,
        fit_status: 'resolved',
        conflict_count: 0,
      });
      const offerKey = userId ? `meal-planning-reminder-offer:v1:${userId}` : null;
      if (plan.householdId && offerKey && !(await AsyncStorage.getItem(offerKey))) {
        await AsyncStorage.setItem(offerKey, 'seen');
        setShowReminderOffer(true);
      } else {
        continueToNextMeals();
      }
    } catch (error) {
      capture(AnalyticsEvent.MealPlanFinalizeFailed, {
        failure_class: classifyMealPlanFinalizeFailure(error),
      });
      Alert.alert('Plan did not finalize', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <PageHeader title="Finalize meals" onPressBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Heading variant="md">Who is each meal for?</Heading>
        <Text tone="secondary">Most meals start with your usual diners. Open one only when this meal is different.</Text>
        {attentionCount ? <View style={styles.attention}><Text>{attentionCount} {attentionCount === 1 ? 'meal needs' : 'meals need'} attention</Text></View> : null}
        {occasions.map((occasion) => (
          <View key={occasion.id} style={styles.card}>
            {occasion.dishes.map((dish) => (
              <Pressable key={dish.id} accessibilityRole="button" accessibilityLabel={`Edit ${dish.title}`} onPress={() => setEditing({ occasionId: occasion.id, dishId: dish.id })} style={({ pressed }) => [styles.dish, pressed && styles.pressed]}>
                <View style={styles.flex}>
                  <Text variant="label">{dish.title}</Text>
                  <Text tone="secondary">{dinerSummary(dish.dinerPersonIds)} · {dish.servings} servings</Text>
                </View>
                <Text tone="secondary">Edit</Text>
              </Pressable>
            ))}
            {occasion.placementDate ? <Text tone="secondary">{occasion.placementDate}</Text> : null}
            {occasion.dishes.some((dish) => (counts[dish.candidateId] ?? 0) > 0) ? <Text tone="secondary">Household choices considered</Text> : null}
          </View>
        ))}
        <Button disabled={!plan || !occasions.length || attentionCount > 0 || busy} onPress={() => void finalize()}>
          {busy ? 'Finalizing…' : 'Finalize meals'}
        </Button>
      </ScrollView>
      {activeOccasion && activeDish ? <MealOccasionDrawer
        visible
        title={activeDish.title}
        members={members.filter((member) => usualDinerPersonIds.includes(member.personId))}
        dinerPersonIds={activeDish.dinerPersonIds}
        coveredByOtherDishPersonIds={activeOccasion.dishes.filter((dish) => dish.id !== activeDish.id).flatMap((dish) => dish.dinerPersonIds)}
        notEatingPersonIds={activeOccasion.notEatingPersonIds}
        servings={activeDish.servings}
        placementDate={activeOccasion.placementDate}
        alternateDishes={occasions.filter((occasion) => occasion.id !== activeOccasion.id).flatMap((occasion) => occasion.dishes.map((dish) => ({ id: dish.id, title: dish.title })))}
        onClose={() => setEditing(null)}
        onAddAnotherDish={(dishId, personIds) => addAnotherDish(activeOccasion.id, dishId, personIds)}
        onSave={(value) => {
          setOccasions((current) => current.map((occasion) => occasion.id === activeOccasion.id ? {
            ...occasion,
            placementDate: value.placementDate,
            notEatingPersonIds: value.notEatingPersonIds,
            dishes: occasion.dishes.map((dish) => dish.id === activeDish.id ? { ...dish, dinerPersonIds: value.dinerPersonIds, servings: value.servings } : dish),
          } : occasion));
          setEditing(null);
        }}
      /> : null}
      <MealPlanningReminderOfferDrawer
        visible={showReminderOffer}
        onClose={() => { setShowReminderOffer(false); continueToNextMeals(); }}
        onCreate={({ mode, reminderAt }) => {
          if (!plan?.householdId) return;
          const nowIso = new Date().toISOString();
          addActivity(buildMealPlanningReminderActivity({ mode, reminderAt, householdId: plan.householdId, nowIso, id: `meal-plan-reminder-${Date.now()}` }));
          setShowReminderOffer(false);
          continueToNextMeals();
        }}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md },
  card: { overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: radii.card, backgroundColor: colors.card },
  dish: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  pressed: { backgroundColor: colors.fieldFill },
  flex: { flex: 1, gap: spacing.xs },
  attention: { padding: spacing.md, borderRadius: radii.input, backgroundColor: 'rgba(249, 115, 22, 0.10)' },
});
