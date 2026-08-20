import { useCallback, useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { FoodStackParamList } from '../../../features/household-food/FoodNavigator';
import { useAppStore } from '../../../store/useAppStore';
import { colors, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { AppShell } from '../../../ui/layout/AppShell';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { Heading, Text } from '../../../ui/Typography';
import { Icon } from '../../../ui/Icon';
import { mealPlanningCache } from '../data/mealPlanningCache';
import { createMealPlanningRepository, type MealPlanProjection } from '../data/mealPlanningRepository';
import { FoodRealityStrip } from '../components/FoodRealityStrip';
import { createFoodStockRepository } from '../../groceries/data/foodStockRepository';
import { createFoodCycleRepository } from '../../groceries/data/foodCycleRepository';
import { TripTargetSheet } from '../components/TripTargetSheet';
import { getActiveMealPlan, getCommittedMealPlan } from '../domain/mealPlanPresentation';
import { formatMealTiming } from '../domain/mealCommitments';
import { getHouseholdSnapshot } from '../../../features/household/data/household';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';

type Props = NativeStackScreenProps<FoodStackParamList, 'NextMeals'>;

export type MealPlanNextMove = {
  kind: 'choose' | 'review_choices' | 'decide' | 'make_groceries';
  label: string;
};

export type MealPlanCollaborationAction = {
  kind: 'ask-family' | 'share-plan';
  label: string;
};

export function deriveMealPlanCollaborationAction(plan: MealPlanProjection): MealPlanCollaborationAction | null {
  if (plan.state !== 'draft' || !plan.candidates.length) return null;
  return plan.householdId
    ? { kind: 'ask-family', label: 'Ask the family' }
    : { kind: 'share-plan', label: 'Share this plan' };
}

export function deriveMealPlanNextMove(plan: MealPlanProjection): MealPlanNextMove {
  if (plan.state === 'finalized') return { kind: 'make_groceries', label: 'Make grocery list' };
  if (plan.state === 'collecting_choices') return { kind: 'review_choices', label: 'Review family choices' };
  if (plan.state === 'ready_to_finalize') return { kind: 'decide', label: 'Decide meals' };
  if (!plan.candidates.length) return { kind: 'choose', label: 'Choose meals' };
  return { kind: 'decide', label: 'Decide meals' };
}

function horizonLabel(plan: MealPlanProjection): string {
  const horizon = plan.horizon;
  if (horizon.kind === 'next_shop') return horizon.shopBy ? `Next shop · by ${horizon.shopBy}` : 'Next shop';
  if (horizon.kind === 'meal_count') return `Next ${horizon.count} meals`;
  if (horizon.kind === 'date_range') return `${horizon.startsOn} – ${horizon.endsOn}`;
  return 'Open plan';
}

export type FinalizedOccasionSummary = {
  id: string;
  section: 'dated' | 'coverage' | 'flexible';
  title: string;
  date: string | null;
  dishes: Array<{ id: string; label: string; recipeId: string | null }>;
};

export function finalizedOccasionSummaries(plan: MealPlanProjection): FinalizedOccasionSummary[] {
  const sectionOrder = { dated: 0, coverage: 1, flexible: 2 } as const;
  return plan.occasions.map((occasion): FinalizedOccasionSummary => {
    const timing = occasion.timing ?? (occasion.placementDate
      ? { kind: 'occasion' as const, date: occasion.placementDate, mealPeriod: 'dinner' as const }
      : { kind: 'flexible' as const });
    return {
      id: occasion.id,
      section: timing.kind === 'occasion' ? 'dated' : timing.kind === 'coverage' ? 'coverage' : 'flexible',
      title: formatMealTiming(timing),
      date: occasion.placementDate,
      dishes: occasion.dishes.map((dish) => ({
        id: dish.id,
        label: `${dish.title} · ${dish.dinerPersonIds.length} ${dish.dinerPersonIds.length === 1 ? 'person' : 'people'} · ${dish.servings ?? 'Flexible'} ${dish.servings === 1 ? 'serving' : 'servings'}`,
        recipeId: typeof dish.recipeSnapshot?.recipeId === 'string' ? dish.recipeSnapshot.recipeId : null,
      })),
    };
  }).sort((left, right) => {
    const section = sectionOrder[left.section] - sectionOrder[right.section];
    if (section) return section;
    return (left.date ?? '').localeCompare(right.date ?? '');
  });
}

const SECTION_LABELS: Record<FinalizedOccasionSummary['section'], string> = {
  dated: 'PLACED',
  coverage: 'THIS HORIZON',
  flexible: 'FLEXIBLE',
};

export function NextMealsScreen({ navigation, route }: Props) {
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const [plans, setPlans] = useState<MealPlanProjection[]>([]);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stockCount, setStockCount] = useState(0);
  const [sharing, setSharing] = useState(false);
  const[tripTargetCents,setTripTargetCents]=useState<number|null>(null);const[showTripTarget,setShowTripTarget]=useState(false);
  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const cached = await mealPlanningCache.read(userId);
    if (cached.length) setPlans(cached);
    try {
      const latest = await createMealPlanningRepository().list();
      setPlans(latest); setOffline(false); await mealPlanningCache.write(userId, latest);
    } catch { setOffline(cached.length > 0); }
    finally { setLoading(false); }
  }, [userId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void createFoodStockRepository().list().then((items) => setStockCount(items.filter((item) => item.state !== 'depleted').length)).catch(() => undefined); }, []);
  useEffect(()=>{void createFoodCycleRepository().current().then((constraint)=>setTripTargetCents(constraint?.targetCents??null)).catch(()=>undefined);},[]);
  const plan = getCommittedMealPlan(plans) ?? getActiveMealPlan(plans);
  const nextMove = plan ? deriveMealPlanNextMove(plan) : null;
  const collaborationAction = plan ? deriveMealPlanCollaborationAction(plan) : null;
  const continuePlan = () => {
    if (!plan || !nextMove) {
      navigation.navigate('RecipeLibrary');
      return;
    }
    if (nextMove.kind === 'choose') {
      navigation.navigate('RecipeLibrary');
      return;
    }
    if (nextMove.kind === 'make_groceries') {
      navigation.navigate('GroceryList', { planId: plan.id, planVersion: plan.version });
      return;
    }
    navigation.navigate('MealPlanFinalize', { planId: plan.id });
  };
  const sharePlan = async () => {
    if (!plan || plan.householdId || sharing) return;
    try {
      const snapshot = await getHouseholdSnapshot(getSupabaseClient());
      if (!snapshot.household) {
        Alert.alert(
          'No Household to share with yet',
          'Your meal plan is saved. Set up or join a Household when you want other people to weigh in.',
        );
        return;
      }
      Alert.alert(
        'Share this plan?',
        `Attach this meal plan to ${snapshot.household.name} so Household members can weigh in. You still decide the meals.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Share plan',
            onPress: () => {
              setSharing(true);
              void createMealPlanningRepository().attachToHousehold({
                planId: plan.id,
                expectedVersion: plan.version,
                householdId: snapshot.household!.id,
              }).then(async () => {
                await load();
                navigation.navigate('MealChoiceInvite', { planId: plan.id });
              }).catch((error) => {
                Alert.alert('Plan was not shared', error instanceof Error ? error.message : 'Please try again.');
              }).finally(() => setSharing(false));
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert('Household not available', error instanceof Error ? error.message : 'Please try again.');
    }
  };
  return (
    <AppShell>
      <PageHeader title="Meal Plan" titleMaxFontSizeMultiplier={1.6} onPressBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {offline ? <Text tone="secondary">Showing the saved plan. Reconnect to respond or finalize.</Text> : null}
        {loading && !plan ? <Text tone="secondary">Loading your meal plan…</Text> : null}
        {!loading && !plan ? (
          <View style={styles.empty}><Heading variant="md">Choose what sounds good next.</Heading><Text tone="secondary">Add a few meals first. The plan will take shape as you choose.</Text><Button variant="primary" onPress={() => navigation.navigate('RecipeLibrary')}>Choose meals</Button></View>
        ) : null}
        {plan ? (
          <View style={styles.planCard}>
            <Text variant="label" tone="secondary">{horizonLabel(plan).toUpperCase()}</Text>
            <Heading variant="lg">{plan.state === 'finalized' ? 'Meals decided' : 'What sounds good next?'}</Heading>
            <View style={styles.meals}>{plan.state === 'finalized'
              ? (Object.keys(SECTION_LABELS) as FinalizedOccasionSummary['section'][]).map((section) => {
                const occasions = finalizedOccasionSummaries(plan).filter((occasion) => occasion.section === section);
                return occasions.length ? <View key={section} style={styles.section}><Text variant="label" tone="secondary">{SECTION_LABELS[section]}</Text>{occasions.map((occasion) => <View key={occasion.id} style={styles.occasion}><Text variant="label">{occasion.title}</Text>{occasion.dishes.map((dish) => dish.recipeId ? <Pressable key={dish.id} accessibilityRole="button" accessibilityLabel={`Open ${dish.label.split(' · ')[0]} recipe`} onPress={() => navigation.navigate('RecipeHome', { recipeId: dish.recipeId!, source: 'meal_plan' })} style={({ pressed }) => [styles.dishLink, pressed && styles.pressed]}><Text tone="secondary" style={styles.dishLabel}>{dish.label}</Text><Icon name="chevronRight" size={17} color={colors.textSecondary} /></Pressable> : <Text key={dish.id} tone="secondary">{dish.label}</Text>)}</View>)}</View> : null;
              })
              : plan.candidates.map((item) => <Text key={item.id}>• {item.title}</Text>)}</View>
            <View style={styles.actions}>
              {plan.state === 'collecting_choices' ? <Text tone="secondary">Family choices are open.</Text> : null}
              {nextMove ? <Button variant="primary" onPress={continuePlan}>{nextMove.label}</Button> : null}
              {collaborationAction?.kind === 'ask-family' ? <Button variant="outline" onPress={() => navigation.navigate('MealChoiceInvite', { planId: plan.id })}>{collaborationAction.label}</Button> : null}
              {collaborationAction?.kind === 'share-plan' ? <Button variant="outline" disabled={sharing} onPress={() => { void sharePlan(); }}>{sharing ? 'Sharing…' : collaborationAction.label}</Button> : null}
              {plan.state === 'draft' ? <Button variant="ghost" onPress={() => navigation.navigate('RecipeLibrary')}>Keep choosing</Button> : null}
              {plan.state === 'finalized' ? <Button variant="outline" onPress={() => { void createMealPlanningRepository().revise(plan.id, plan.version).then(load); }}>Change meals</Button> : null}
            </View>
          </View>
        ) : null}
        <FoodRealityStrip budget={null} tripTargetCents={tripTargetCents} relevantStockCount={stockCount} priceEvidence={null} onBudget={() => setShowTripTarget(true)} onStock={() => navigation.navigate('FoodStockReview')} onPrices={() => Alert.alert('No current prices', 'Planning and your plain grocery list remain complete without retailer pricing.')} />
      </ScrollView><TripTargetSheet visible={showTripTarget} initialCents={tripTargetCents} onClose={()=>setShowTripTarget(false)} onSave={async(cents)=>{await createFoodCycleRepository().set({cycleRef:'next-shop',targetCents:cents,moneyEnvelope:null});setTripTargetCents(cents);setShowTripTarget(false);}}/>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.md }, empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  planCard: { padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, borderRadius: 18 }, meals: { gap: spacing.md }, section: { gap: spacing.sm }, occasion: { gap: spacing.xs }, dishLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, dishLabel: { flex: 1 }, pressed: { opacity: 0.6 }, actions: { gap: spacing.sm },
});
