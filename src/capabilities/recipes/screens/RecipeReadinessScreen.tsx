import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';

import type { FoodStackParamList } from '../../../features/household-food/FoodNavigator';
import { colors, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { AppShell } from '../../../ui/layout/AppShell';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { Heading, Text } from '../../../ui/Typography';
import type { RecipeVersion } from '../domain/recipeContracts';
import type { RecipeEditorialEnrichment } from '../data/recipeEditorialEnrichment';
import { useRecipeStore } from '../runtime/useRecipeStore';
import { STARTER_RECIPE_PROJECTIONS, getStarterRecipeEnrichment } from '../data/starterRecipeCatalog';
import { resolveAvailableRecipe } from '../data/resolveAvailableRecipe';
import { cookModeEducationCache } from '../data/cookModeEducationCache';
import { useAppStore } from '../../../store/useAppStore';

export type RecipeReadinessItem = { id: string; label: string; inferred: boolean };
export function deriveRecipeReadiness(
  version: RecipeVersion,
  servings: number,
  enrichment: RecipeEditorialEnrichment | null = null,
): RecipeReadinessItem[] {
  const text = version.instructions.map((step) => step.text).join(' ');
  const items: RecipeReadinessItem[] = [{ id: 'servings', label: `Cooking for ${servings}`, inferred: false }];
  const preheat = /preheat[^.]*\.?/i.exec(text)?.[0]; if (preheat) items.push({ id: 'preheat', label: preheat, inferred: false });
  if (enrichment?.equipmentNeeds.length) {
    items.push(...enrichment.equipmentNeeds.map((need) => ({
      id: `equipment-${need.id}`,
      label: need.label,
      inferred: false,
    })));
  } else {
    const equipment = ['oven', 'skillet', 'pot', 'blender', 'baking sheet'].filter((item) => text.toLowerCase().includes(item));
    if (equipment.length) items.push({ id: 'equipment', label: `Likely equipment: ${equipment.join(', ')}`, inferred: true });
  }
  const prepCount = version.ingredients.filter((line) => Boolean(line.preparation)).length;
  if (prepCount) items.push({ id: 'prep', label: `${prepCount} ingredient${prepCount === 1 ? '' : 's'} need prep`, inferred: false });
  return items;
}

export function shouldShowFoodCookGuide(source: 'meal_plan' | undefined, seen: boolean): boolean {
  return source === 'meal_plan' && !seen;
}

type Props = NativeStackScreenProps<FoodStackParamList, 'RecipeReadiness'>;
export function RecipeReadinessScreen({ navigation, route }: Props) {
  const personalRecipes = useRecipeStore((state) => state.recipes);
  const identityId = useAppStore((state) => state.authIdentity?.userId ?? 'signed-out');
  const [foodGuideSeen, setFoodGuideSeen] = useState(true);
  useEffect(() => {
    let cancelled = false;
    if (route.params.source !== 'meal_plan') return;
    void cookModeEducationCache.hasSeenFoodMealLoopCookGuide(identityId).then((seen) => {
      if (!cancelled) setFoodGuideSeen(seen);
    });
    return () => { cancelled = true; };
  }, [identityId, route.params.source]);
  const projection = resolveAvailableRecipe(personalRecipes, route.params.recipeId, STARTER_RECIPE_PROJECTIONS);
  if (!projection) return <AppShell><PageHeader title="Before you begin" onPressBack={() => navigation.goBack()} /><View style={styles.center}><Text>This recipe is not available.</Text></View></AppShell>;
  const items = deriveRecipeReadiness(
    projection.currentVersion,
    route.params.servings,
    getStarterRecipeEnrichment(projection.recipe.id),
  );
  return <AppShell><PageHeader title="Before you begin" onPressBack={() => navigation.goBack()} /><ScrollView contentContainerStyle={styles.content}>{shouldShowFoodCookGuide(route.params.source, foodGuideSeen) ? <View style={styles.guide}><Heading variant="sm">Your place stays here.</Heading><Text tone="secondary">Use the touch controls to move one cue at a time. If you leave, Kwilt resumes this recipe at the same cue.</Text><Button size="sm" variant="outline" onPress={() => { setFoodGuideSeen(true); void cookModeEducationCache.markFoodMealLoopCookGuideSeen(identityId); }}>Got it</Button></View> : null}<Heading variant="lg">Set yourself up, then cook one step at a time.</Heading><Text tone="secondary">These checks don’t change your recipe. Inferred equipment is labeled so you can ignore it.</Text><View style={styles.list}>{items.map((item) => <View key={item.id} style={styles.item}><CheckCircle2 color={colors.pine700} size={22} /><View style={styles.itemText}><Text>{item.label}</Text>{item.inferred ? <Text variant="label" tone="secondary">INFERRED</Text> : null}</View></View>)}</View>{!projection.currentVersion.instructions.length ? <Text tone="destructive">Add at least one method step before starting Cook Mode.</Text> : null}<Button variant="primary" disabled={!projection.currentVersion.instructions.length} onPress={() => navigation.replace('RecipeCookMode', route.params)}>Start cooking</Button><Button variant="ghost" onPress={() => navigation.goBack()}>Not yet</Button></ScrollView></AppShell>;
}
const styles = StyleSheet.create({ content: { flexGrow: 1, paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, guide: { gap: spacing.sm, padding: spacing.md, borderRadius: 18, backgroundColor: colors.gray100 }, list: { gap: spacing.sm }, item: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: 16, backgroundColor: colors.card }, itemText: { flex: 1, gap: 2 } });
