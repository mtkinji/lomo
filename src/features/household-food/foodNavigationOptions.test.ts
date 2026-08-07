import {
  getFoodScreenOptions,
  RECIPE_COOK_MODE_SCREEN_OPTIONS,
} from './foodNavigationOptions';

describe('Recipe Cook Mode navigation options', () => {
  it('allows portrait and landscape in cook mode', () => {
    expect(RECIPE_COOK_MODE_SCREEN_OPTIONS).toEqual({ orientation: 'default' });
    expect(getFoodScreenOptions('RecipeCookMode')).toEqual({
      headerShown: false,
      orientation: 'default',
    });
    expect(getFoodScreenOptions('RecipeHome')).toEqual({
      headerShown: false,
      orientation: 'portrait_up',
    });
  });
});
