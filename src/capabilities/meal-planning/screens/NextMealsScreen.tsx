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
import { getActiveMealPlan } from '../domain/mealPlanPresentation';

type Props = NativeStackScreenProps<FoodStackParamList, 'NextMeals'>;

export type MealPlanNextMove = {
  kind: 'choose' | 'review_choices' | 'decide' | 'make_groceries';
  label: string;
};

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

export function finalizedOccasionSummaries(plan: MealPlanProjection): Array<{ id: string; title: string; date: string | null; dishes: Array<{ id: string; label: string; recipeId: string | null }> }> {
  return plan.occasions.map((occasion, index) => ({
    id: occasion.id,
    title: occasion.title?.trim() || `Meal ${index + 1}`,
    date: occasion.placementDate,
    dishes: occasion.dishes.map((dish) => ({
      id: dish.id,
      label: `${dish.title} · ${dish.dinerPersonIds.length} ${dish.dinerPersonIds.length === 1 ? 'person' : 'people'} · ${dish.servings ?? 'Flexible'} ${dish.servings === 1 ? 'serving' : 'servings'}`,
      recipeId: typeof dish.recipeSnapshot?.recipeId === 'string' ? dish.recipeSnapshot.recipeId : null,
    })),
  }));
}

export function NextMealsScreen({ navigation }: Props) {
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const [plans, setPlans] = useState<MealPlanProjection[]>([]);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stockCount, setStockCount] = useState(0);
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
  const plan = getActiveMealPlan(plans);
  const nextMove = plan ? deriveMealPlanNextMove(plan) : null;
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
  return (
    <AppShell>
      <PageHeader title="Meal Plan" titleMaxFontSizeMultiplier={1.6} onPressBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {offline ? <Text tone="secondary">Showing the saved plan. Reconnect to respond or finalize.</Text> : null}
        {loading && !plan ? <Text tone="secondary">Loading your meal plan…</Text> : null}
        {!loading && !plan ? (
          <View style={styles.empty}><Heading variant="md">Choose what sounds good next.</Heading><Text tone="secondary">Add a few meals first. The plan will take shape as you choose.</Text><Button onPress={() => navigation.navigate('RecipeLibrary')}>Choose meals</Button></View>
        ) : null}
        {plan ? (
          <View style={styles.planCard}>
            <Text variant="label" tone="secondary">{horizonLabel(plan).toUpperCase()}</Text>
            <Heading variant="lg">{plan.state === 'finalized' ? 'Meals decided' : 'What sounds good next?'}</Heading>
            <View style={styles.meals}>{plan.state === 'finalized'
              ? finalizedOccasionSummaries(plan).map((occasion) => <View key={occasion.id} style={styles.occasion}><Text variant="label">{occasion.title}{occasion.date ? ` · ${occasion.date}` : ''}</Text>{occasion.dishes.map((dish) => dish.recipeId ? <Pressable key={dish.id} accessibilityRole="button" accessibilityLabel={`Open ${dish.label.split(' · ')[0]} recipe`} onPress={() => navigation.navigate('RecipeHome', { recipeId: dish.recipeId! })} style={({ pressed }) => [styles.dishLink, pressed && styles.pressed]}><Text tone="secondary" style={styles.dishLabel}>{dish.label}</Text><Icon name="chevronRight" size={17} color={colors.textSecondary} /></Pressable> : <Text key={dish.id} tone="secondary">{dish.label}</Text>)}</View>)
              : plan.candidates.map((item) => <Text key={item.id}>• {item.title}</Text>)}</View>
            <View style={styles.actions}>
              {plan.state === 'collecting_choices' ? <Text tone="secondary">Family choices are open.</Text> : null}
              {nextMove ? <Button onPress={continuePlan}>{nextMove.label}</Button> : null}
              {plan.state === 'draft' && plan.candidates.length ? <Button variant="outline" onPress={() => navigation.navigate('MealChoiceInvite', { planId: plan.id })}>Ask the family</Button> : null}
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
  planCard: { padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, borderRadius: 18 }, meals: { gap: spacing.sm }, occasion: { gap: spacing.xs }, dishLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, dishLabel: { flex: 1 }, pressed: { opacity: 0.6 }, actions: { gap: spacing.sm },
});
