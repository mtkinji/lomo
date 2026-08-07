import { useEffect, useMemo, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { StyleSheet, View } from 'react-native';

import { BottomDrawer } from '../../../ui/BottomDrawer';
import { Button } from '../../../ui/Button';
import { Heading, Text } from '../../../ui/Typography';
import { spacing } from '../../../theme';
import { getHouseholdSnapshot } from '../../../features/household/data/household';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import type { RecipeProjection } from '../data/recipeCache';
import { createMealPlanningRepository, type MealPlanCandidateDraft, type MealPlanProjection } from '../../meal-planning/data/mealPlanningRepository';
import { addRecipeCandidateToDraft } from '../../meal-planning/domain/mealPlanLifecycle';
import type { MealPlanHorizon } from '../../meal-planning/domain/mealPlanContracts';
import { buildMealPlanRecipeCandidate } from '../domain/mealPlanRecipeCandidate';
import { useHouseholdMealPreferencesStore } from '../../../features/household-food/runtime/useHouseholdMealPreferencesStore';
import { deriveMealFit } from '../../../features/household-food/domain/householdMealFit';
import { MealFitCallout } from '../../meal-planning/components/MealFitCallout';
import { resolveSuggestedMealServings } from '../domain/mealPreferences';

export function AddToMealPlanSheet({ visible, recipe, defaultServings, onClose, onAdded }: {
  visible: boolean; recipe: RecipeProjection; defaultServings: number; onClose(): void; onAdded(message: string, context: { planId: string; candidateId: string }): void;
}) {
  const [plans, setPlans] = useState<MealPlanProjection[]>([]);
  const [horizon, setHorizon] = useState<MealPlanHorizon>({ kind: 'meal_count', count: 4 });
  const [servings, setServings] = useState(defaultServings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recovery,setRecovery]=useState<'start_new_plan'|'add_to_draft_copy'>('start_new_plan');
  const preferences = useHouseholdMealPreferencesStore((state) => state.projection);
  const [dinerPersonIds, setDinerPersonIds] = useState<string[]>([]);
  const [excludedDinerPersonIds, setExcludedDinerPersonIds] = useState<string[]>([]);
  const [excludedDinerResolution, setExcludedDinerResolution] = useState<'needs_alternative' | 'not_eating' | null>(null);
  useEffect(() => {
    if (!visible) return;
    const usualDiners = preferences?.usualDinerPersonIds ?? [];
    setDinerPersonIds(usualDiners);
    setExcludedDinerPersonIds([]);
    setExcludedDinerResolution(null);
    setServings(defaultServings);
    void createMealPlanningRepository().list().then(setPlans).catch(() => setPlans([]));
  }, [defaultServings, preferences?.usualDinerPersonIds, visible]);
  const fit = useMemo(() => {
    const ingredients = recipe.currentVersion.ingredients;
    const ingredientConcepts = ingredients.flatMap((line) => line.ingredientConcept && (line.parseConfidence ?? 0) >= 0.8 ? [line.ingredientConcept] : []);
    return deriveMealFit({
      dinerPersonIds,
      foodNeeds: preferences?.foodNeeds ?? [],
      recipe: {
        ingredientConcepts,
        ingredientEvidenceComplete: ingredients.length > 0 && ingredientConcepts.length === ingredients.length,
      },
    });
  }, [dinerPersonIds, preferences?.foodNeeds, recipe.currentVersion.ingredients]);
  const personLabelsById = useMemo(() => Object.fromEntries((preferences?.members ?? []).map((member) => [member.personId, member.displayName])), [preferences?.members]);
  const active = useMemo(() => plans.find((plan) => plan.state !== 'archived') ?? null, [plans]);
  const candidate: MealPlanCandidateDraft = useMemo(() => buildMealPlanRecipeCandidate(recipe, {
    candidateId: Crypto.randomUUID(),
    servings,
    dinerPersonIds,
    excludedDinerPersonIds,
    excludedDinerResolution,
  }), [dinerPersonIds, excludedDinerPersonIds, excludedDinerResolution, recipe, servings]);
  const add = async () => {
    setBusy(true); setError(null);
    try {
      const repository = createMealPlanningRepository();
      if (active?.state === 'draft') {
        const result = addRecipeCandidateToDraft(active as MealPlanProjection & { state: 'draft' }, candidate as MealPlanCandidateDraft & { kind: 'recipe'; recipeSnapshot: { recipeId: string; recipeVersionId: string } });
        if (result.outcome === 'added') await repository.update({ planId: active.id, expectedVersion: active.version, candidates: result.candidates });
        onAdded(active.horizon.kind === 'meal_count' ? `Added to your next ${active.horizon.count} meals` : 'Added to Meal Plan', { planId: active.id, candidateId: result.effectiveCandidateId }); return;
      }
      const household = await getHouseholdSnapshot(getSupabaseClient());
      if (!household.household) throw new Error('Set up your Household before starting a shared meal plan.');
      const selectedHorizon=active&&recovery==='add_to_draft_copy'?active.horizon:horizon;const selectedCandidates=active&&recovery==='add_to_draft_copy'?[...active.candidates,candidate]:[candidate];
      const receipt = await repository.create({ householdId: household.household.id, horizon:selectedHorizon, candidates:selectedCandidates }) as { planId?: string };
      if(!receipt.planId)throw new Error('The new plan did not return a durable reference.');
      onAdded(selectedHorizon.kind === 'meal_count' ? `Added to your next ${selectedHorizon.count} meals` : 'Added to Meal Plan', { planId: receipt.planId, candidateId: candidate.id });
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'This recipe could not be added.'); }
    finally { setBusy(false); }
  };
  return <BottomDrawer visible={visible} onClose={onClose} snapPoints={['72%']}><View style={styles.content}>
    <Heading variant="md">Add to Meal Plan</Heading>
    <Text tone="secondary">{active?.state === 'draft' ? 'Add this exact recipe version to your current draft.' : active ? 'Your current plan is already underway. Start a fresh draft without changing it.' : 'Choose how far ahead you want to collect meals.'}</Text>
    <View style={styles.servings}><Text variant="label">Servings</Text><Button size="sm" variant="outline" disabled={servings <= 1} onPress={() => setServings((value) => Math.max(1, value - 1))}>−</Button><Text>{servings}</Text><Button size="sm" variant="outline" onPress={() => setServings((value) => value + 1)}>+</Button></View>
    <MealFitCallout
      fit={fit}
      personLabelsById={personLabelsById}
      canRevealPersonLabels
      onMakeForOthers={() => {
        if (fit.status !== 'recorded_conflict') return;
        const affected = [...new Set(fit.conflicts.map((conflict) => conflict.personId))];
        const remaining = dinerPersonIds.filter((personId) => !affected.includes(personId));
        setDinerPersonIds(remaining);
        setExcludedDinerPersonIds(affected);
        setExcludedDinerResolution(null);
        if (remaining.length) setServings(resolveSuggestedMealServings({ usualDinerPersonIds: remaining, numericFallback: servings }));
      }}
      onChooseAnother={onClose}
      onReviewIngredients={onClose}
    />
    {excludedDinerPersonIds.length ? <View style={styles.alternative}>
      <Text>{excludedDinerPersonIds.map((id) => personLabelsById[id] ?? 'Someone').join(' and ')} still {excludedDinerPersonIds.length === 1 ? 'needs' : 'need'} a meal.</Text>
      <View style={styles.choices}>
        <Button size="sm" variant={excludedDinerResolution === 'needs_alternative' ? 'outline' : 'ghost'} onPress={() => setExcludedDinerResolution('needs_alternative')}>Add another dish</Button>
        <Button size="sm" variant={excludedDinerResolution === 'not_eating' ? 'outline' : 'ghost'} onPress={() => setExcludedDinerResolution('not_eating')}>Not eating this time</Button>
      </View>
    </View> : null}
    {!active || active.state !== 'draft' ? <View style={styles.choices}>
      <Button size="sm" variant={horizon.kind === 'next_shop' ? 'primary' : 'outline'} onPress={() => setHorizon({ kind: 'next_shop', shopBy: null })}>Next shop</Button>
      <Button size="sm" variant={horizon.kind === 'meal_count' ? 'primary' : 'outline'} onPress={() => setHorizon({ kind: 'meal_count', count: 4 })}>Next 4 meals</Button>
      <Button size="sm" variant={horizon.kind === 'date_range' ? 'primary' : 'outline'} onPress={() => setHorizon({ kind: 'date_range', startsOn: new Date().toISOString().slice(0, 10), endsOn: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) })}>Next 7 days</Button>
      <Button size="sm" variant={horizon.kind === 'open' ? 'primary' : 'outline'} onPress={() => setHorizon({ kind: 'open' })}>Just collect</Button>
    </View> : null}
    {active&&active.state!=='draft'?<View style={styles.recovery}><Text variant="label">Keep the current plan intact</Text><Button size="sm" variant={recovery==='start_new_plan'?'primary':'outline'} onPress={()=>setRecovery('start_new_plan')}>Start fresh with this recipe</Button><Button size="sm" variant={recovery==='add_to_draft_copy'?'primary':'outline'} onPress={()=>setRecovery('add_to_draft_copy')}>Copy current choices into a draft</Button></View>:null}
    {error ? <Text tone="destructive">{error}</Text> : null}
    <Button variant="primary" disabled={busy || !dinerPersonIds.length || (excludedDinerPersonIds.length > 0 && excludedDinerResolution === null)} onPress={() => { void add(); }}>{busy ? 'Adding…' : dinerPersonIds.length ? `Add for ${dinerPersonIds.length}` : active?.state === 'draft' ? 'Add to current plan' : 'Start a new plan'}</Button>
  </View></BottomDrawer>;
}

const styles = StyleSheet.create({ content: { paddingHorizontal: spacing.md, gap: spacing.md }, servings: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, recovery:{gap:spacing.sm}, alternative: { gap: spacing.sm } });
