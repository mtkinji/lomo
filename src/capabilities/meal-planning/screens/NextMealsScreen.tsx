import { useCallback, useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import type { FoodStackParamList } from '../../../features/household-food/FoodNavigator';
import { useAppStore } from '../../../store/useAppStore';
import { colors, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { AppShell } from '../../../ui/layout/AppShell';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { Heading, Text } from '../../../ui/Typography';
import { mealPlanningCache } from '../data/mealPlanningCache';
import { createMealPlanningRepository, type MealPlanProjection } from '../data/mealPlanningRepository';
import { FoodRealityStrip } from '../components/FoodRealityStrip';
import { createFoodStockRepository } from '../../groceries/data/foodStockRepository';
import { createFoodCycleRepository } from '../../groceries/data/foodCycleRepository';
import { TripTargetSheet } from '../components/TripTargetSheet';

type Props = NativeStackScreenProps<FoodStackParamList, 'NextMeals'>;

function horizonLabel(plan: MealPlanProjection): string {
  const horizon = plan.horizon;
  if (horizon.kind === 'next_shop') return horizon.shopBy ? `Next shop · by ${horizon.shopBy}` : 'Next shop';
  if (horizon.kind === 'meal_count') return `Next ${horizon.count} meals`;
  if (horizon.kind === 'date_range') return `${horizon.startsOn} – ${horizon.endsOn}`;
  return 'Open plan';
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
  const plan = plans.find((item) => item.state !== 'archived') ?? plans[0];
  return (
    <AppShell>
      <PageHeader title="Meal Planning" onPressBack={() => navigation.goBack()} rightElement={<Button size="sm" onPress={() => navigation.navigate('MealPlanEditor', {})}>{plan ? 'New cycle' : 'Start'}</Button>} />
      <ScrollView contentContainerStyle={styles.content}>
        <FoodRealityStrip budget={null} tripTargetCents={tripTargetCents} relevantStockCount={stockCount} priceEvidence={null} onBudget={() => setShowTripTarget(true)} onStock={() => navigation.navigate('FoodStockReview')} onPrices={() => Alert.alert('No current prices', 'Planning and your plain grocery list remain complete without retailer pricing.')} />
        {offline ? <Text tone="secondary">Showing the saved plan. Reconnect to respond or finalize.</Text> : null}
        {loading && !plan ? <Text tone="secondary">Loading your meal plan…</Text> : null}
        {!loading && !plan ? (
          <View style={styles.empty}><Heading variant="md">Plan for the next shop—not somebody else’s calendar.</Heading><Text tone="secondary">Choose a cadence that fits, add a few possibilities, and invite the family only when it helps.</Text><Button onPress={() => navigation.navigate('MealPlanEditor', {})}>Start planning</Button></View>
        ) : null}
        {plan ? (
          <View style={styles.planCard}>
            <Text variant="label" tone="secondary">{horizonLabel(plan).toUpperCase()}</Text>
            <Heading variant="lg">{plan.state === 'finalized' ? 'Meals decided' : 'What sounds good next?'}</Heading>
            <View style={styles.meals}>{(plan.state === 'finalized' ? plan.entries : plan.candidates).map((item) => <Text key={item.id}>• {item.title}</Text>)}</View>
            <View style={styles.actions}>
              {plan.state === 'draft' ? <><Button variant="outline" onPress={() => navigation.navigate('MealPlanEditor', { planId: plan.id })}>Edit choices</Button><Button onPress={() => navigation.navigate('MealChoiceInvite', { planId: plan.id })}>Ask the family</Button><Button variant="ghost" onPress={() => navigation.navigate('MealPlanFinalize', { planId: plan.id })}>Finalize myself</Button></> : null}
              {plan.state === 'collecting_choices' && plan.activeRound ? <><Text tone="secondary">Family choices are open.</Text><Button onPress={() => navigation.navigate('MealPlanFinalize', { planId: plan.id })}>Review and close</Button></> : null}
              {plan.state === 'ready_to_finalize' ? <Button onPress={() => navigation.navigate('MealPlanFinalize', { planId: plan.id })}>Finalize meals</Button> : null}
              {plan.state === 'finalized' ? <><Button onPress={() => navigation.navigate('GroceryList', { planId: plan.id, planVersion: plan.version })}>Make grocery list</Button><Button variant="outline" onPress={() => { void createMealPlanningRepository().revise(plan.id, plan.version).then(load); }}>Revise this plan</Button></> : null}
            </View>
          </View>
        ) : null}
      </ScrollView><TripTargetSheet visible={showTripTarget} initialCents={tripTargetCents} onClose={()=>setShowTripTarget(false)} onSave={async(cents)=>{await createFoodCycleRepository().set({cycleRef:'next-shop',targetCents:cents,moneyEnvelope:null});setTripTargetCents(cents);setShowTripTarget(false);}}/>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.md }, empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  planCard: { padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, borderRadius: 18 }, meals: { gap: spacing.xs }, actions: { gap: spacing.sm },
});
