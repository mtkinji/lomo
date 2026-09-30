import { useEffect } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { FoodStackParamList } from '../../../features/household-food/FoodNavigator';

type Props = NativeStackScreenProps<FoodStackParamList, 'NextMeals'>;

/**
 * Compatibility route for persisted navigation state and kwilt://food/plan.
 * Meal planning itself lives in Recipes and is presented by MealPlanDrawer.
 */
export function NextMealsScreen({ navigation, route }: Props) {
  useEffect(() => {
    navigation.replace('RecipeLibrary', {
      openPlan: true,
      planId: route.params?.planId,
      feedbackPromptId: route.params?.feedbackPromptId,
    });
  }, [navigation, route.params?.feedbackPromptId, route.params?.planId]);

  return null;
}
