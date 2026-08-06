import { useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, ScrollView, Share, StyleSheet, View } from 'react-native';

import type { FoodStackParamList } from '../../../features/household-food/FoodNavigator';
import { colors, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { AppShell } from '../../../ui/layout/AppShell';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { Heading, Text } from '../../../ui/Typography';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../../services/analytics/events';
import { createMealPlanningRepository } from '../../meal-planning/data/mealPlanningRepository';
import { AddToMealPlanSheet } from '../components/AddToMealPlanSheet';
import { RecipeActionsMenu } from '../components/RecipeActionsMenu';
import { RecipeHero } from '../components/RecipeHero';
import { RecipeIngredientList } from '../components/RecipeIngredientList';
import { RecipeMethodPreview } from '../components/RecipeMethodPreview';
import { RecipeSummaryBar } from '../components/RecipeSummaryBar';
import type { RecipeProjection } from '../data/recipeCache';
import { exportRecipeMarkdown } from '../recipeExport';
import { useRecipeStore } from '../runtime/useRecipeStore';
import { useAppStore } from '../../../store/useAppStore';
import { recipeCookCache } from '../data/recipeCookCache';
import type { RecipeCookSession } from '../domain/recipeCookContracts';
import { createRecipeCookRepository, type RecipeCookRecordProjection } from '../data/recipeCookRepository';
import { isStarterRecipe, STARTER_RECIPE_PROJECTIONS } from '../data/starterRecipeCatalog';

export function RecipeHomeView({ projection, servings, checked, priorLearning = null, onServingsChange, onToggleIngredient, onAdd, onCook, onMore }: {
  projection: RecipeProjection; servings: number; checked: Set<string>; priorLearning?: RecipeCookRecordProjection | null; onServingsChange(value: number): void; onToggleIngredient(id: string): void; onAdd(): void; onCook(): void; onMore(): void;
}) {
  const { recipe, currentVersion: version } = projection;
  const familyLabel = recipe.credits.find((credit) => credit.role === 'family_source')?.displayLabel ?? null;
  const media = recipe.mediaAssets.find((asset) => asset.lifecycle === 'active') ?? null;
  return <ScrollView contentContainerStyle={styles.content}>
    <RecipeHero media={media} familyLabel={familyLabel} />
    <View style={styles.heading}><Heading variant="lg">{version.title}</Heading>{version.description ? <Text tone="secondary">{version.description}</Text> : null}</View>
    <RecipeSummaryBar prepMinutes={version.prepMinutes} cookMinutes={version.cookMinutes} yieldQuantity={version.yieldQuantity} yieldUnit={version.yieldUnit} />
    <View style={styles.primaryActions}><Button testID="recipe-add-to-plan" fullWidth variant="primary" onPress={onAdd}>Add to Next meals</Button><Button fullWidth variant="outline" onPress={onCook}>Start cooking</Button></View>
    {version.yieldQuantity ? <View style={styles.servings}><Text variant="label">Scale recipe</Text><Button size="sm" variant="outline" disabled={servings <= 1} onPress={() => onServingsChange(Math.max(1, servings - 1))}>−</Button><Text>{servings} servings</Text><Button size="sm" variant="outline" onPress={() => onServingsChange(servings + 1)}>+</Button></View> : null}
    <RecipeIngredientList lines={version.ingredients} fromYield={version.yieldQuantity} toYield={servings} checked={checked} onToggle={onToggleIngredient} />
    <RecipeMethodPreview steps={version.instructions} />
    {priorLearning && (priorLearning.privateNote || priorLearning.wouldMakeAgain !== null) ? <View style={styles.learning}><Text variant="label">From your last cook</Text>{priorLearning.privateNote ? <Text>{priorLearning.privateNote}</Text> : null}{priorLearning.wouldMakeAgain === true ? <Text tone="secondary">You said you’d make this again.</Text> : priorLearning.wouldMakeAgain === false ? <Text tone="secondary">You said this one wasn’t a repeat yet.</Text> : null}<Text tone="secondary">Private Cook record · {new Date(priorLearning.completedAt).toLocaleDateString()}</Text></View> : null}
    {version.notes ? <View style={styles.note}><Text variant="label">Notes</Text><Text>{version.notes}</Text></View> : null}
    <View style={styles.provenance}><Text variant="label">Source</Text><Text tone="secondary">{recipe.provenance.sourceTitle ?? recipe.provenance.sourceAuthor ?? 'Added by you'} · Version {version.version}</Text>{familyLabel ? <Text tone="secondary">Family recipe from {familyLabel}</Text> : null}<Text tone="secondary">{recipe.provenance.rightsBasis === 'kwilt_authored' ? 'Included with Kwilt' : recipe.accessGrants.some((grant) => grant.status === 'active') ? 'Shared with specific people' : 'Private to you'}</Text></View>
    <Button variant="ghost" onPress={onMore}>More recipe actions</Button>
  </ScrollView>;
}

type Props = NativeStackScreenProps<FoodStackParamList, 'RecipeHome'>;
export function RecipeHomeScreen({ navigation, route }: Props) {
  const personalProjection = useRecipeStore((state) => state.recipes.find((item) => item.recipe.id === route.params.recipeId));
  const projection = personalProjection ?? STARTER_RECIPE_PROJECTIONS.find((item) => item.recipe.id === route.params.recipeId);
  const starterRecipe = isStarterRecipe(route.params.recipeId);
  const deleteRecipe = useRecipeStore((state) => state.delete);
  const [servings, setServings] = useState(projection?.currentVersion.yieldQuantity ?? 4);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [added, setAdded] = useState<{ message: string; planId: string; candidateId: string } | null>(null);
  const [activeCook, setActiveCook] = useState<RecipeCookSession | null>(null);
  const [priorLearning, setPriorLearning] = useState<RecipeCookRecordProjection | null>(null);
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const { capture } = useAnalytics();
  useEffect(() => { if (projection) capture(AnalyticsEvent.RecipeHomeViewed, { source: 'recipe_library' }); }, [capture, projection]);
  useEffect(() => { if (userId) void recipeCookCache.read(userId).then((session) => setActiveCook(session?.recipeId === route.params.recipeId && session.recipeVersionId === projection?.currentVersion.id && ['active','paused'].includes(session.status) ? session : null)); }, [projection?.currentVersion.id, route.params.recipeId, userId]);
  useEffect(() => { if (userId) void createRecipeCookRepository().latestForRecipe(route.params.recipeId).then(setPriorLearning).catch(() => setPriorLearning(null)); }, [route.params.recipeId, userId]);
  if (!projection) return <AppShell><PageHeader title="Recipe" onPressBack={() => navigation.goBack()} /><View style={styles.missing}><Text>This recipe is not available on this device.</Text></View></AppShell>;
  const removeAdded = async () => {
    if (!added) return;
    try {
      const repository = createMealPlanningRepository(); const plan = (await repository.list()).find((item) => item.id === added.planId);
      if (!plan || plan.state !== 'draft') throw new Error('The plan changed. Review it before removing this meal.');
      await repository.update({ planId: plan.id, expectedVersion: plan.version, candidates: plan.candidates.filter((candidate) => candidate.id !== added.candidateId) }); setAdded(null);
    } catch (error) { Alert.alert('Could not undo', error instanceof Error ? error.message : 'Open Next meals to review the plan.'); }
  };
  const confirmDelete = () => Alert.alert('Delete recipe?', 'This removes it from your recipe box. Shared copies are not affected.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { void deleteRecipe(projection.recipe.id, projection.currentVersion.version).then(() => navigation.goBack()); } }]);
  return <AppShell><PageHeader title="Recipe" onPressBack={() => navigation.goBack()} />
    {added ? <View style={styles.added}><Text>{added.message}</Text><View style={styles.addedActions}><Button size="sm" variant="ghost" onPress={() => navigation.navigate('NextMeals')}>View plan</Button><Button size="sm" variant="ghost" onPress={() => { void removeAdded(); }}>Undo</Button></View></View> : null}
    {activeCook ? <View style={styles.added}><Text>Resume step {activeCook.currentCueIndex + 1} of {activeCook.cueCount}</Text><Button size="sm" variant="ghost" onPress={() => navigation.navigate('RecipeCookMode', { recipeId: projection.recipe.id, servings: Math.max(1, Math.round((projection.currentVersion.yieldQuantity ?? 1) * activeCook.servingScale)) })}>Continue cooking</Button></View> : null}
    <RecipeHomeView projection={projection} servings={servings} checked={checked} priorLearning={priorLearning} onServingsChange={setServings} onToggleIngredient={(id) => setChecked((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onAdd={() => setShowAdd(true)} onCook={() => activeCook ? navigation.navigate('RecipeCookMode', { recipeId: projection.recipe.id, servings }) : navigation.navigate('RecipeReadiness', { recipeId: projection.recipe.id, servings })} onMore={() => setShowMore(true)} />
    <AddToMealPlanSheet visible={showAdd} recipe={projection} onClose={() => setShowAdd(false)} onAdded={(message, context) => { setShowAdd(false); setAdded({ message, ...context }); }} />
    <RecipeActionsMenu editable={!starterRecipe} visible={showMore} onClose={() => setShowMore(false)} onEdit={() => { setShowMore(false); navigation.navigate('RecipeEdit', { recipeId: projection.recipe.id }); }} onExport={() => { setShowMore(false); void Share.share({ title: projection.currentVersion.title, message: exportRecipeMarkdown(projection) }); }} onDelete={() => { setShowMore(false); confirmDelete(); }} />
  </AppShell>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg }, missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { gap: spacing.xs }, primaryActions: { gap: spacing.sm }, servings: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  note: { padding: spacing.md, gap: spacing.xs, borderRadius: 16, backgroundColor: colors.card }, learning: { padding: spacing.md, gap: spacing.xs, borderRadius: 16, backgroundColor: colors.pine50 }, provenance: { gap: spacing.xs, paddingTop: spacing.sm },
  added: { marginHorizontal: spacing.md, marginBottom: spacing.sm, borderRadius: 16, padding: spacing.sm, backgroundColor: colors.pine50, gap: spacing.xs }, addedActions: { flexDirection: 'row', gap: spacing.xs },
});
