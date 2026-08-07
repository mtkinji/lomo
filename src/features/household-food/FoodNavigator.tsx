import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { RecipeLibraryScreen } from '../../capabilities/recipes/screens/RecipeLibraryScreen';
import { RecipeEditScreen } from '../../capabilities/recipes/screens/RecipeEditScreen';
import { RecipeCookingScreen } from '../../capabilities/recipes/screens/RecipeCookingScreen';
import { RecipeHomeScreen } from '../../capabilities/recipes/screens/RecipeHomeScreen';
import { RecipeImportReviewScreen } from '../../capabilities/recipes/screens/RecipeImportReviewScreen';
import { RecipeReadinessScreen } from '../../capabilities/recipes/screens/RecipeReadinessScreen';
import { RecipeCookModeScreen } from '../../capabilities/recipes/screens/RecipeCookModeScreen';
import { RecipeCookCompleteScreen } from '../../capabilities/recipes/screens/RecipeCookCompleteScreen';
import { NextMealsScreen } from '../../capabilities/meal-planning/screens/NextMealsScreen';
import { MealPlanEditorScreen } from '../../capabilities/meal-planning/screens/MealPlanEditorScreen';
import { MealChoiceInviteScreen } from '../../capabilities/meal-planning/screens/MealChoiceInviteScreen';
import { MealPlanFinalizeScreen } from '../../capabilities/meal-planning/screens/MealPlanFinalizeScreen';
import { MealChoiceResponseScreen } from '../../capabilities/meal-planning/screens/MealChoiceResponseScreen';
import { GroceryListScreen } from '../../capabilities/groceries/screens/GroceryListScreen';
import { AlreadyHaveReviewScreen } from '../../capabilities/groceries/screens/AlreadyHaveReviewScreen';
import { GroceryItemEditScreen } from '../../capabilities/groceries/screens/GroceryItemEditScreen';
import { GroceryHandoffScreen } from '../../capabilities/groceries/screens/GroceryHandoffScreen';
import { GrocerySavingsScreen } from '../../capabilities/groceries/screens/GrocerySavingsScreen';
import { FoodStockReviewScreen } from '../../capabilities/groceries/screens/FoodStockReviewScreen';
import { FoodScenarioReviewScreen } from '../../capabilities/groceries/screens/FoodScenarioReviewScreen';
import { FoodHomeScreen } from './FoodHomeScreen';
import { useAppStore } from '../../store/useAppStore';
import { useRecipeStore } from '../../capabilities/recipes/runtime/useRecipeStore';
import { useRecipeFavoriteStore } from '../../capabilities/recipes/runtime/useRecipeFavoriteStore';
import type { EditorialMealPlanSeed } from '../../capabilities/meal-planning/domain/editorialMealPlanSeed';
import { EditorialMealCollectionScreen } from '../../capabilities/recipes/screens/EditorialMealCollectionScreen';
import { useHiddenRecipeStore } from '../../capabilities/recipes/runtime/useHiddenRecipeStore';
import { useHouseholdMealPreferencesStore } from './runtime/useHouseholdMealPreferencesStore';

export type FoodStackParamList = {
  FoodHome: undefined;
  RecipeLibrary: undefined;
  EditorialMealCollection: { collectionId: string };
  RecipeEdit: { recipeId?: string };
  RecipeHome: { recipeId: string };
  RecipeCooking: { recipeId: string };
  RecipeReadiness: { recipeId: string; servings: number };
  RecipeCookMode: { recipeId: string; servings: number };
  RecipeCookComplete: { sessionId: string; recipeId: string };
  RecipeImportReview: { intent?: 'family' | 'web' } | undefined;
  NextMeals: undefined;
  MealPlanEditor: { planId?: string; source?: 'recipe_library' | 'editorial_collection'; editorialSeed?: EditorialMealPlanSeed };
  MealChoiceInvite: { planId: string };
  MealPlanFinalize: { planId: string };
  MealChoiceResponse: { roundId: string; intent?: 'pass' };
  GroceryList: { listId?: string; planId?: string; planVersion?: number; handoffUrl?: string } | undefined;
  AlreadyHaveReview: { listId: string };
  GroceryItemEdit: { listId: string; itemId: string };
  GroceryHandoff: { listId: string };
  GrocerySavings: { listId: string };
  FoodStockReview: { concepts?: string[] } | undefined;
  FoodScenarioReview: { scenarioId: string };
};

const Stack = createNativeStackNavigator<FoodStackParamList>();

export function FoodNavigator() {
  const userId = useAppStore((state) => state.authIdentity?.userId ?? null);
  const setRecipeIdentity = useRecipeStore((state) => state.setIdentity);
  const setRecipeFavoriteIdentity = useRecipeFavoriteStore((state) => state.setIdentity);
  const setHiddenRecipeIdentity = useHiddenRecipeStore((state) => state.setIdentity);
  const setHouseholdMealPreferencesIdentity = useHouseholdMealPreferencesStore((state) => state.setIdentity);
  useEffect(() => {
    void setRecipeIdentity(userId);
    void setRecipeFavoriteIdentity(userId);
    void setHiddenRecipeIdentity(userId);
    void setHouseholdMealPreferencesIdentity(userId);
  }, [setHiddenRecipeIdentity, setHouseholdMealPreferencesIdentity, setRecipeFavoriteIdentity, setRecipeIdentity, userId]);
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FoodHome" component={FoodHomeScreen} />
      <Stack.Screen name="RecipeLibrary" component={RecipeLibraryScreen} />
      <Stack.Screen name="EditorialMealCollection" component={EditorialMealCollectionScreen} />
      <Stack.Screen name="RecipeEdit" component={RecipeEditScreen} />
      <Stack.Screen name="RecipeHome" component={RecipeHomeScreen} />
      <Stack.Screen name="RecipeCooking" component={RecipeCookingScreen} />
      <Stack.Screen name="RecipeReadiness" component={RecipeReadinessScreen} />
      <Stack.Screen name="RecipeCookMode" component={RecipeCookModeScreen} />
      <Stack.Screen name="RecipeCookComplete" component={RecipeCookCompleteScreen} />
      <Stack.Screen name="RecipeImportReview" component={RecipeImportReviewScreen} />
      <Stack.Screen name="NextMeals" component={NextMealsScreen} />
      <Stack.Screen name="MealPlanEditor" component={MealPlanEditorScreen} />
      <Stack.Screen name="MealChoiceInvite" component={MealChoiceInviteScreen} />
      <Stack.Screen name="MealPlanFinalize" component={MealPlanFinalizeScreen} />
      <Stack.Screen name="MealChoiceResponse" component={MealChoiceResponseScreen} />
      <Stack.Screen name="GroceryList" component={GroceryListScreen} />
      <Stack.Screen name="AlreadyHaveReview" component={AlreadyHaveReviewScreen} />
      <Stack.Screen name="GroceryItemEdit" component={GroceryItemEditScreen} />
      <Stack.Screen name="GroceryHandoff" component={GroceryHandoffScreen} />
      <Stack.Screen name="GrocerySavings" component={GrocerySavingsScreen} />
      <Stack.Screen name="FoodStockReview" component={FoodStockReviewScreen} />
      <Stack.Screen name="FoodScenarioReview" component={FoodScenarioReviewScreen} />
    </Stack.Navigator>
  );
}
