import { useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { createGroceryRepository } from '../../capabilities/groceries/data/groceryRepository';
import { createMealPlanningRepository } from '../../capabilities/meal-planning/data/mealPlanningRepository';
import { recipeCookCache } from '../../capabilities/recipes/data/recipeCookCache';
import { createRecipeCookRepository, type RecipeCookRecordProjection } from '../../capabilities/recipes/data/recipeCookRepository';
import { useRecipeStore } from '../../capabilities/recipes/runtime/useRecipeStore';
import { useAppStore } from '../../store/useAppStore';
import { colors, spacing } from '../../theme';
import { Button } from '../../ui/Button';
import { AppShell } from '../../ui/layout/AppShell';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Heading, Text } from '../../ui/Typography';
import { deriveFoodContinuation, type FoodContinuation } from './foodContinuationProjection';
import type { FoodStackParamList } from './FoodNavigator';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';

type Props = NativeStackScreenProps<FoodStackParamList, 'FoodHome'>;
const fallback = deriveFoodContinuation({ activeCook: null, plans: [], groceryLists: [] });

export function FoodHomeScreen({ navigation }: Props) {
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const recipes = useRecipeStore((state) => state.recipes);
  const recipeStatus = useRecipeStore((state) => state.status);
  const [lead, setLead] = useState<FoodContinuation>(fallback);
  const [recentCooks, setRecentCooks] = useState<RecipeCookRecordProjection[]>([]);
  const [offline, setOffline] = useState(false);
  const { capture } = useAnalytics();

  useEffect(() => {
    void (async () => {
      try {
        const [plans, groceryLists, cook, recent] = await Promise.all([
          createMealPlanningRepository().list(),
          createGroceryRepository().list(),
          userId ? recipeCookCache.read(userId) : Promise.resolve(null),
          userId ? createRecipeCookRepository().listRecent(6) : Promise.resolve([]),
        ]);
        setLead(deriveFoodContinuation({
          activeCook: cook && ['active', 'paused'].includes(cook.status)
            ? { recipeId: cook.recipeId, servings: cook.servingScale, cueIndex: cook.currentCueIndex }
            : null,
          plans,
          groceryLists,
        }));
        setRecentCooks(recent);
        setOffline(false);
      } catch {
        setOffline(true);
      }
    })();
  }, [userId]);

  useEffect(() => {
    capture(AnalyticsEvent.FoodContinuationViewed, { continuation_kind: lead.kind, offline });
  }, [capture, lead.kind, offline]);

  const openLead = () => navigation.navigate(lead.route as any, lead.params as any);
  const recipeById = new Map(recipes.map((item) => [item.recipe.id, item]));

  return (
    <AppShell>
      <PageHeader title="Food" onPressBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {offline ? <Text tone="secondary">Showing what is saved on this phone. Reconnect to refresh household progress.</Text> : null}
        <View style={styles.hero}>
          <Text variant="label" tone="secondary">{lead.eyebrow}</Text>
          <Heading variant="lg">{lead.title}</Heading>
          <Text tone="secondary">{lead.detail}</Text>
          <Button onPress={openLead}>{lead.action}</Button>
        </View>
        <View style={styles.sectionHeader}>
          <Heading variant="md">Your meals</Heading>
          <Button size="sm" variant="ghost" onPress={() => navigation.navigate('RecipeLibrary')}>All</Button>
        </View>
        {recipes.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelf}>
            {recipes.slice(0, 6).map((item) => (
              <Pressable accessibilityRole="button" key={item.recipe.id} onPress={() => navigation.navigate('RecipeHome', { recipeId: item.recipe.id })} style={styles.recipeCard}>
                <Heading variant="sm" numberOfLines={2}>{item.currentVersion.title}</Heading>
                <Text tone="secondary">{item.currentVersion.cookMinutes ? `${item.currentVersion.cookMinutes} min cook` : 'Ready when you are'}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.empty}>
            <Text>{recipeStatus === 'error' ? 'Recipes are unavailable offline.' : 'Save a recipe once; cook from a clean, ad-free copy after that.'}</Text>
            <Button variant="outline" onPress={() => navigation.navigate('RecipeLibrary')}>Add a recipe</Button>
          </View>
        )}
        <View style={styles.sectionHeader}><Heading variant="md">Recently cooked</Heading></View>
        {recentCooks.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelf}>
            {recentCooks.map((record) => {
              const recipe = recipeById.get(record.recipeId);
              return (
                <Pressable accessibilityRole="button" key={record.id} onPress={() => navigation.navigate('RecipeHome', { recipeId: record.recipeId })} style={styles.recipeCard}>
                  <Heading variant="sm" numberOfLines={2}>{recipe?.currentVersion.title ?? 'Saved recipe'}</Heading>
                  <Text tone="secondary">{record.wouldMakeAgain === true ? 'Would make again' : record.privateNote ? 'Note saved' : 'Cook completed'}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : <Text tone="secondary">Completed cooks will collect here as private learning—not a family feed.</Text>}
      </ScrollView>
    </AppShell>
  );
}
const styles=StyleSheet.create({content:{padding:spacing.md,paddingBottom:spacing.xl,gap:spacing.md},hero:{padding:spacing.lg,gap:spacing.sm,borderRadius:20,backgroundColor:colors.pine50},sectionHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},shelf:{gap:spacing.sm},recipeCard:{width:180,minHeight:112,padding:spacing.md,gap:spacing.xs,borderRadius:16,borderWidth:1,borderColor:colors.cardBorder,backgroundColor:colors.card},empty:{gap:spacing.sm,padding:spacing.md,borderRadius:16,borderWidth:1,borderColor:colors.cardBorder}});
