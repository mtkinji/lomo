import { useEffect, useState } from 'react';
import * as Crypto from 'expo-crypto';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import type { FoodStackParamList } from '../../../features/household-food/FoodNavigator';
import { getHouseholdSnapshot } from '../../../features/household/data/household';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import { colors, spacing, typography } from '../../../theme';
import { Button } from '../../../ui/Button';
import { AppShell } from '../../../ui/layout/AppShell';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { Heading, Text } from '../../../ui/Typography';
import { useRecipeStore } from '../../recipes/runtime/useRecipeStore';
import { createMealPlanningRepository, type MealPlanCandidateDraft, type MealPlanProjection } from '../data/mealPlanningRepository';
import type { MealPlanHorizon } from '../domain/mealPlanContracts';
import { MealCandidateCard } from '../components/MealCandidateCard';
import { prepareMealCandidates, type MealCandidateQuery } from '../domain/mealCandidatePreparation';
import { createFoodStockRepository } from '../../groceries/data/foodStockRepository';
import type { FoodStockObservation } from '../../groceries/domain/foodStockContracts';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../../services/analytics/events';

type Props = NativeStackScreenProps<FoodStackParamList, 'MealPlanEditor'>;

export function MealPlanEditorScreen({ navigation, route }: Props) {
  const recipes = useRecipeStore((state) => state.recipes);
  const [existing, setExisting] = useState<MealPlanProjection | null>(null);
  const [horizonKind, setHorizonKind] = useState<MealPlanHorizon['kind']>('next_shop');
  const [mealCount, setMealCount] = useState('5');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [selected, setSelected] = useState<MealPlanCandidateDraft[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [stock, setStock] = useState<FoodStockObservation[]>([]);
  const [queryMode, setQueryMode] = useState<MealCandidateQuery>('best_use');
  const { capture } = useAnalytics();
  useEffect(() => { void createFoodStockRepository().list().then(setStock).catch(() => setStock([])); }, []);
  useEffect(() => {
    if (!route.params?.planId) return;
    void createMealPlanningRepository().list().then((plans) => {
      const plan = plans.find((item) => item.id === route.params?.planId);
      if (!plan) return;
      setExisting(plan); setHorizonKind(plan.horizon.kind); setSelected(plan.candidates);
      if (plan.horizon.kind === 'meal_count') setMealCount(String(plan.horizon.count));
      if (plan.horizon.kind === 'date_range') { setStartsOn(plan.horizon.startsOn); setEndsOn(plan.horizon.endsOn); }
    });
  }, [route.params?.planId]);
  const toggleRecipe = (recipeId: string) => {
    const recipe = recipes.find((item) => item.recipe.id === recipeId);
    if (!recipe) return;
    setSelected((current) => current.some((item) => item.recipeSnapshot?.recipeId === recipeId)
      ? current.filter((item) => item.recipeSnapshot?.recipeId !== recipeId)
      : [...current, { id: Crypto.randomUUID(), kind: 'recipe', title: recipe.currentVersion.title, recipeSnapshot: {
        recipeId: recipe.recipe.id, recipeVersionId: recipe.currentVersion.id, recipeVersion: recipe.currentVersion.version,
        title: recipe.currentVersion.title, yieldQuantity: recipe.currentVersion.yieldQuantity, yieldUnit: recipe.currentVersion.yieldUnit,
        ownerPersonId: recipe.recipe.ownerPersonId, sourceType: recipe.recipe.provenance.method,
        sourceAttribution: recipe.recipe.credits.find((credit) => credit.displayLabel)?.displayLabel ?? null,
        media: recipe.recipe.mediaAssets.find((asset) => asset.lifecycle === 'active') ? (() => {
          const asset = recipe.recipe.mediaAssets.find((item) => item.lifecycle === 'active')!;
          return { assetId: asset.id, storageRef: asset.storageRef, mediaType: asset.mediaType, rightsBasis: asset.rightsBasis, attribution: asset.attribution, altText: asset.altText };
        })() : null,
      } }]);
  };
  const addNote = () => { const title = note.trim(); if (!title) return; setSelected((current) => [...current, { id: Crypto.randomUUID(), kind: 'meal_note', title, recipeSnapshot: null }]); setNote(''); };
  const prepared = prepareMealCandidates({
    query: queryMode,
    recipes: recipes.map((recipe) => ({ id: recipe.recipe.id, versionId: recipe.currentVersion.id, title: recipe.currentVersion.title, requiredConcepts: recipe.currentVersion.ingredients.flatMap((line) => line.optional || !line.ingredientConcept ? [] : [line.ingredientConcept]), estimatedGapCostCents: { min: 0, max: 0 }, lastCookedAt: null, useSoonConcepts: [] })),
    stock: stock.map((item) => ({ concept: item.concept, state: item.state })), tripTargetCents: null,
    evidence: [{ capabilityId: 'recipes', authorized: true, fresh: true }, { capabilityId: 'groceries', authorized: true, fresh: true }],
  });
  const explanationByVersion = new Map(prepared.map((item) => [item.recipeVersionId, item.reason]));
  const save = async () => {
    setSaving(true);
    try {
      const horizon: MealPlanHorizon = horizonKind === 'meal_count' ? { kind: 'meal_count', count: Number(mealCount) }
        : horizonKind === 'date_range' ? { kind: 'date_range', startsOn, endsOn }
        : horizonKind === 'open' ? { kind: 'open' } : { kind: 'next_shop', shopBy: null };
      const repository = createMealPlanningRepository();
      if (existing) await repository.update({ planId: existing.id, expectedVersion: existing.version, horizon, candidates: selected });
      else {
        const household = await getHouseholdSnapshot(getSupabaseClient());
        if (!household.household) throw new Error('Set up your Household before starting a shared meal plan.');
        await repository.create({ householdId: household.household.id, horizon, candidates: selected });
      }
      capture(AnalyticsEvent.MealPlanHorizonSelected, { horizon_kind: horizon.kind });
      capture(AnalyticsEvent.MealCandidatesPrepared, { candidate_count: selected.length, method: existing ? 'updated' : 'created' });
      navigation.replace('NextMeals');
    } catch (error) { Alert.alert('Meal plan did not save', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setSaving(false); }
  };
  return (
    <AppShell>
      <PageHeader title="Plan next meals" onPressBack={() => navigation.goBack()} rightElement={<Button size="sm" disabled={saving || !selected.length} onPress={() => { void save(); }}>{saving ? 'Saving…' : 'Save'}</Button>} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Heading variant="sm">How far are you planning?</Heading>
        <View style={styles.chips}>{(['next_shop','meal_count','date_range','open'] as const).map((kind) => <Button key={kind} size="sm" variant={horizonKind === kind ? 'primary' : 'outline'} onPress={() => setHorizonKind(kind)}>{kind === 'next_shop' ? 'Next shop' : kind === 'meal_count' ? 'Meal count' : kind === 'date_range' ? 'Date range' : 'Open'}</Button>)}</View>
        {horizonKind === 'meal_count' ? <TextInput accessibilityLabel="Number of meals" keyboardType="number-pad" value={mealCount} onChangeText={setMealCount} style={styles.input} /> : null}
        {horizonKind === 'date_range' ? <View style={styles.row}><TextInput accessibilityLabel="Starts on" placeholder="YYYY-MM-DD" value={startsOn} onChangeText={setStartsOn} style={styles.input} /><TextInput accessibilityLabel="Ends on" placeholder="YYYY-MM-DD" value={endsOn} onChangeText={setEndsOn} style={styles.input} /></View> : null}
        <Heading variant="sm">Possibilities</Heading>
        <View style={styles.chips}>{([{ id: 'best_use', label: 'Best use of what we have' }, { id: 'make_now', label: 'Make now' }, { id: 'almost_there', label: 'Almost there' }, { id: 'use_soon', label: 'Use soon' }] as Array<{ id: MealCandidateQuery; label: string }>).map((item) => <Button key={item.id} size="sm" variant={queryMode === item.id ? 'primary' : 'outline'} onPress={() => setQueryMode(item.id)}>{item.label}</Button>)}</View>
        {recipes.filter((recipe) => queryMode === 'best_use' || explanationByVersion.has(recipe.currentVersion.id)).map((recipe) => { const active = selected.some((item) => item.recipeSnapshot?.recipeId === recipe.recipe.id); return <MealCandidateCard key={recipe.recipe.id} title={recipe.currentVersion.title} explanation={explanationByVersion.get(recipe.currentVersion.id) ?? 'Saved recipe · stock not yet confirmed'} selected={active} onPress={() => toggleRecipe(recipe.recipe.id)} />; })}
        <View style={styles.row}><TextInput accessibilityLabel="Meal idea" placeholder="Leftovers, eat out, undecided…" value={note} onChangeText={setNote} style={styles.input} /><Button variant="outline" onPress={addNote}>Add</Button></View>
        {selected.filter((item) => item.kind === 'meal_note').map((item) => <Pressable key={item.id} onPress={() => setSelected((current) => current.filter((candidate) => candidate.id !== item.id))}><Text>• {item.title}  <Text tone="secondary">Remove</Text></Text></Pressable>)}
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.md }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: spacing.md, color: colors.textPrimary, backgroundColor: colors.fieldFill, ...typography.body },
});
