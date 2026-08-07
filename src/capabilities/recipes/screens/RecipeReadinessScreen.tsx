import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';

import type { FoodStackParamList } from '../../../features/household-food/FoodNavigator';
import { colors, spacing } from '../../../theme';
import { Button } from '../../../ui/Button';
import { AppShell } from '../../../ui/layout/AppShell';
import { PageHeader } from '../../../ui/layout/PageHeader';
import { Heading, Text } from '../../../ui/Typography';
import type { RecipeVersion } from '../domain/recipeContracts';
import { useRecipeStore } from '../runtime/useRecipeStore';
import { STARTER_RECIPE_PROJECTIONS } from '../data/starterRecipeCatalog';
import { resolveAvailableRecipe } from '../data/resolveAvailableRecipe';

export type RecipeReadinessItem = { id: string; label: string; inferred: boolean };
export function deriveRecipeReadiness(version: RecipeVersion, servings: number): RecipeReadinessItem[] {
  const text = version.instructions.map((step) => step.text).join(' ');
  const items: RecipeReadinessItem[] = [{ id: 'servings', label: `Cooking for ${servings}`, inferred: false }];
  const preheat = /preheat[^.]*\.?/i.exec(text)?.[0]; if (preheat) items.push({ id: 'preheat', label: preheat, inferred: false });
  const equipment = ['oven', 'skillet', 'pot', 'blender', 'baking sheet'].filter((item) => text.toLowerCase().includes(item));
  if (equipment.length) items.push({ id: 'equipment', label: `Likely equipment: ${equipment.join(', ')}`, inferred: true });
  const prepCount = version.ingredients.filter((line) => Boolean(line.preparation)).length;
  if (prepCount) items.push({ id: 'prep', label: `${prepCount} ingredient${prepCount === 1 ? '' : 's'} need prep`, inferred: false });
  return items;
}

type Props = NativeStackScreenProps<FoodStackParamList, 'RecipeReadiness'>;
export function RecipeReadinessScreen({ navigation, route }: Props) {
  const personalRecipes = useRecipeStore((state) => state.recipes);
  const projection = resolveAvailableRecipe(personalRecipes, route.params.recipeId, STARTER_RECIPE_PROJECTIONS);
  if (!projection) return <AppShell><PageHeader title="Before you begin" onPressBack={() => navigation.goBack()} /><View style={styles.center}><Text>This recipe is not available.</Text></View></AppShell>;
  const items = deriveRecipeReadiness(projection.currentVersion, route.params.servings);
  return <AppShell><PageHeader title="Before you begin" onPressBack={() => navigation.goBack()} /><ScrollView contentContainerStyle={styles.content}><Heading variant="lg">Set yourself up, then cook one step at a time.</Heading><Text tone="secondary">These checks don’t change your recipe. Inferred equipment is labeled so you can ignore it.</Text><View style={styles.list}>{items.map((item) => <View key={item.id} style={styles.item}><CheckCircle2 color={colors.pine700} size={22} /><View style={styles.itemText}><Text>{item.label}</Text>{item.inferred ? <Text variant="label" tone="secondary">INFERRED</Text> : null}</View></View>)}</View>{!projection.currentVersion.instructions.length ? <Text tone="destructive">Add at least one method step before starting Cook Mode.</Text> : null}<Button variant="primary" disabled={!projection.currentVersion.instructions.length} onPress={() => navigation.replace('RecipeCookMode', route.params)}>Start cooking</Button><Button variant="ghost" onPress={() => navigation.goBack()}>Not yet</Button></ScrollView></AppShell>;
}
const styles = StyleSheet.create({ content: { flexGrow: 1, paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, list: { gap: spacing.sm }, item: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: 16, backgroundColor: colors.card }, itemText: { flex: 1, gap: 2 } });
