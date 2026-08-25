import { Pressable } from '@/src/ui/HapticPressable';
import { useEffect, useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import type { FoodStackParamList } from '../../../features/household-food/FoodNavigator';
import { useAnalytics } from '../../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../../services/analytics/events';
import { colors, radii, spacing, typography } from '../../../theme';
import { Button } from '../../../ui/Button';
import { AppShell } from '../../../ui/layout/AppShell';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { Heading, Text } from '../../../ui/Typography';
import { createMealPlanningRepository } from '../../meal-planning/data/mealPlanningRepository';
import type { EditorialMealPlanSeed } from '../../meal-planning/domain/editorialMealPlanSeed';
import type { RecipeProjection } from '../data/recipeCache';
import {
  getEditorialCollection,
  getEditorialMealPlanTemplate,
} from '../data/editorialMealCollections';
import { buildRecipeLibraryInventory } from '../data/starterRecipeCatalog';
import type { EditorialCollection } from '../domain/editorialMealCollectionContracts';
import { useRecipeStore } from '../runtime/useRecipeStore';
import { RecipeArtwork } from '../components/RecipeArtwork';

type Props = NativeStackScreenProps<FoodStackParamList, 'EditorialMealCollection'>;

export function EditorialMealCollectionView({
  collection,
  recipes,
  selectedRecipeIds,
  onToggleRecipe,
  onOpenRecipe,
  onReviewSelected,
  onReviewTemplate,
}: {
  collection: EditorialCollection;
  recipes: readonly RecipeProjection[];
  selectedRecipeIds: readonly string[];
  onToggleRecipe(recipeId: string): void;
  onOpenRecipe(recipeId: string): void;
  onReviewSelected(): void;
  onReviewTemplate(): void;
}) {
  const recipeById = useMemo(() => new Map(recipes.map((recipe) => [recipe.recipe.id, recipe])), [recipes]);
  const hero = recipeById.get(collection.heroRecipeId);
  const selected = new Set(selectedRecipeIds);
  const selectedLabel = selectedRecipeIds.length === 1 ? '1 meal selected' : `${selectedRecipeIds.length} meals selected`;
  return (
    <ScrollView testID="editorial-meal-collection" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <RecipeArtwork
          storageRef={hero?.recipe.mediaAssets.find((asset) => asset.lifecycle === 'active')?.storageRef}
          accessibilityLabel={hero?.currentVersion.title ?? collection.title}
          style={styles.heroArtwork}
        />
        <View style={styles.heroScrim} />
        <View style={styles.heroCopy}>
          <Text variant="label" style={styles.heroEyebrow}>{collection.eyebrow}</Text>
          <Heading variant="lg" style={styles.heroTitle}>{collection.title}</Heading>
          <Text style={styles.heroDeck}>{collection.deck}</Text>
        </View>
      </View>

      {collection.sections.map((section) => (
        <View key={section.id} style={styles.section}>
          <View style={styles.sectionHeading}>
            <Heading variant="md">{section.title}</Heading>
            <Text tone="secondary">{section.note}</Text>
          </View>
          {section.entries.map((entry) => {
            const projection = recipeById.get(entry.recipeId);
            if (!projection) return null;
            const isSelected = selected.has(entry.recipeId);
            const media = projection.recipe.mediaAssets.find((asset) => asset.lifecycle === 'active');
            return (
              <View key={entry.id} testID={`collection-meal-${entry.id}`} style={styles.mealCard}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${projection.currentVersion.title}`}
                  onPress={() => onOpenRecipe(entry.recipeId)}
                  style={({ pressed }) => [styles.mealArtworkFrame, pressed && styles.pressed]}
                >
                  <RecipeArtwork
                    storageRef={media?.storageRef}
                    accessibilityLabel={media?.altText ?? projection.currentVersion.title}
                    style={styles.mealArtwork}
                  />
                </Pressable>
                <View style={styles.mealCopy}>
                  <Heading variant="sm">{projection.currentVersion.title}</Heading>
                  <View style={styles.reason}>
                    <Text variant="label" style={styles.reasonLabel}>Why try it?</Text>
                    <Text tone="secondary">{entry.whyTry}</Text>
                  </View>
                  <View style={styles.reason}>
                    <Text variant="label" style={styles.reasonLabel}>Why it works tonight</Text>
                    <Text tone="secondary">{entry.whyDoable}</Text>
                  </View>
                  {entry.firstTimeNote ? <Text tone="secondary" style={styles.firstTimeNote}>{entry.firstTimeNote}</Text> : null}
                  <View style={styles.mealActions}>
                    <Button
                      size="sm"
                      variant={isSelected ? 'outline' : 'secondary'}
                      accessibilityLabel={`${isSelected ? 'Remove' : 'Choose'} ${projection.currentVersion.title}`}
                      onPress={() => onToggleRecipe(entry.recipeId)}
                    >
                      {isSelected ? 'Chosen' : 'Choose'}
                    </Button>
                    <Button size="sm" variant="link" onPress={() => onOpenRecipe(entry.recipeId)}>View recipe</Button>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ))}

      {collection.mealPlanTemplateId ? (
        <View style={styles.planModule}>
          <Text variant="label" style={styles.planEyebrow}>A COMPLETE STARTING POINT</Text>
          <Heading variant="md">Use the whole idea</Heading>
          <Text tone="secondary">Start with every meal in this Collection, then remove, swap, or change the horizon before saving.</Text>
          <Button variant="outline" accessibilityLabel="Review the complete plan" onPress={onReviewTemplate}>Review the plan</Button>
        </View>
      ) : null}

      <View style={[styles.selectionTray, !selectedRecipeIds.length && styles.selectionTrayEmpty]}>
        <View style={styles.selectionCopy}>
          <Text variant="label">YOUR PICKS</Text>
          <Text tone="secondary">{selectedRecipeIds.length ? selectedLabel : 'Choose only what sounds good.'}</Text>
        </View>
        <Button
          size="sm"
          disabled={!selectedRecipeIds.length}
          accessibilityLabel={selectedRecipeIds.length === 1 ? 'Review 1 selected meal' : `Review ${selectedRecipeIds.length} selected meals`}
          onPress={onReviewSelected}
        >
          Review
        </Button>
      </View>
    </ScrollView>
  );
}

export function EditorialMealCollectionScreen({ navigation, route }: Props) {
  const collection = getEditorialCollection(route.params.collectionId);
  const personalRecipes = useRecipeStore((state) => state.recipes);
  const recipes = useMemo(() => buildRecipeLibraryInventory(personalRecipes), [personalRecipes]);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const { capture } = useAnalytics();

  useEffect(() => {
    if (collection) capture(AnalyticsEvent.MealCollectionOpened, { job_intent: collection.jobIntent });
  }, [capture, collection]);

  if (!collection) {
    return <AppShell><PageHeader title="Collection" onPressBack={() => navigation.goBack()} /><View style={styles.missing}><Heading variant="md">This Collection is no longer available.</Heading><Button variant="outline" onPress={() => navigation.replace('RecipeLibrary')}>Back to Recipes</Button></View></AppShell>;
  }

  const navigateToReview = (seed: EditorialMealPlanSeed, planId?: string) => {
    navigation.navigate('MealPlanEditor', {
      ...(planId ? { planId } : {}),
      source: 'editorial_collection',
      editorialSeed: seed,
    });
  };
  const reviewSeed = async (seed: EditorialMealPlanSeed) => {
    capture(AnalyticsEvent.MealEditorialPlanReviewStarted, {
      source_kind: seed.kind,
      meal_count: seed.recipeIds.length,
    });
    try {
      const plans = await createMealPlanningRepository().list();
      const draft = plans.find((plan) => plan.state === 'draft');
      if (!draft) {
        navigateToReview(seed);
        return;
      }
      Alert.alert(
        'You already have a Meal Plan draft',
        'Choose where you want to review these meals. Nothing changes until you Save.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Start next plan', onPress: () => navigateToReview(seed) },
          { text: 'Add to current draft', onPress: () => navigateToReview(seed, draft.id) },
        ],
      );
    } catch {
      navigateToReview(seed);
    }
  };
  const reviewSelected = () => {
    void reviewSeed({
      kind: 'collection_selection',
      sourceId: collection.id,
      sourceVersion: collection.version,
      sourceTitle: collection.title,
      recipeIds: selectedRecipeIds,
      horizon: { kind: 'meal_count', count: selectedRecipeIds.length },
    });
  };
  const reviewTemplate = () => {
    const template = collection.mealPlanTemplateId ? getEditorialMealPlanTemplate(collection.mealPlanTemplateId) : null;
    if (!template) return;
    void reviewSeed({
      kind: 'meal_plan_template',
      sourceId: template.id,
      sourceVersion: template.version,
      sourceTitle: template.title,
      recipeIds: template.slots.map((slot) => slot.recipeId),
      horizon: template.horizon,
    });
  };

  return (
    <AppShell>
      <PageHeader title="Collection" onPressBack={() => navigation.goBack()} />
      <EditorialMealCollectionView
        collection={collection}
        recipes={recipes}
        selectedRecipeIds={selectedRecipeIds}
        onToggleRecipe={(recipeId) => {
          setSelectedRecipeIds((current) => {
            const next = current.includes(recipeId) ? current.filter((id) => id !== recipeId) : [...current, recipeId];
            capture(AnalyticsEvent.MealCollectionSelectionChanged, { selection_count: next.length });
            return next;
          });
        }}
        onOpenRecipe={(recipeId) => navigation.navigate('RecipeHome', { recipeId })}
        onReviewSelected={reviewSelected}
        onReviewTemplate={reviewTemplate}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl, gap: spacing.xl },
  hero: { minHeight: 430, justifyContent: 'flex-end', overflow: 'hidden', backgroundColor: colors.sumi900 },
  heroArtwork: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(28,26,25,0.48)' },
  heroCopy: { padding: spacing.lg, gap: spacing.sm },
  heroEyebrow: { color: colors.primaryForeground, letterSpacing: 1.1 },
  heroTitle: { color: colors.primaryForeground },
  heroDeck: { color: colors.primaryForeground, maxWidth: 520, ...typography.body },
  section: { paddingHorizontal: spacing.md, gap: spacing.lg },
  sectionHeading: { gap: spacing.xs },
  mealCard: { overflow: 'hidden', borderRadius: radii.card, backgroundColor: colors.card },
  mealArtworkFrame: { width: '100%', aspectRatio: 1.55 },
  mealArtwork: { width: '100%', height: '100%' },
  mealCopy: { padding: spacing.md, gap: spacing.sm },
  reason: { gap: 2 },
  reasonLabel: { color: colors.pine700 },
  firstTimeNote: { padding: spacing.sm, borderRadius: radii.input, backgroundColor: colors.secondary },
  mealActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  planModule: { marginHorizontal: spacing.md, padding: spacing.lg, gap: spacing.sm, borderRadius: radii.card, backgroundColor: colors.secondary },
  planEyebrow: { color: colors.pine700, letterSpacing: 1 },
  selectionTray: { marginHorizontal: spacing.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radii.card, backgroundColor: colors.sumi900 },
  selectionTrayEmpty: { backgroundColor: colors.secondary },
  selectionCopy: { flex: 1, minWidth: 0, gap: 2 },
  missing: { flex: 1, padding: spacing.lg, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  pressed: { opacity: 0.82 },
});
