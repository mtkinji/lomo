import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

export const RECIPE_COOK_MODE_SCREEN_OPTIONS = {
  orientation: 'default',
} satisfies NativeStackNavigationOptions;

export const FOOD_PORTRAIT_SCREEN_OPTIONS = {
  orientation: 'portrait_up',
} satisfies NativeStackNavigationOptions;

export function getFoodScreenOptions(routeName: string): NativeStackNavigationOptions {
  return {
    headerShown: false,
    ...(routeName === 'RecipeCookMode'
      ? RECIPE_COOK_MODE_SCREEN_OPTIONS
      : FOOD_PORTRAIT_SCREEN_OPTIONS),
  };
}
