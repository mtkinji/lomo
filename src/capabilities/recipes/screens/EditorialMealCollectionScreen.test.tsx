import { fireEvent, render } from '@testing-library/react-native';

import { EDITORIAL_MEAL_COLLECTIONS } from '../data/editorialMealCollections';
import { buildRecipeLibraryInventory } from '../data/starterRecipeCatalog';
import { EditorialMealCollectionView } from './EditorialMealCollectionScreen';

describe('Editorial Meal Collection', () => {
  const collection = EDITORIAL_MEAL_COLLECTIONS[0];
  const recipes = buildRecipeLibraryInventory([]);

  it('explains the editorial premise and why each meal is appealing and doable', () => {
    const screen = render(
      <EditorialMealCollectionView
        collection={collection}
        recipes={recipes}
        selectedRecipeIds={[]}
        onToggleRecipe={jest.fn()}
        onOpenRecipe={jest.fn()}
        onReviewSelected={jest.fn()}
        onReviewTemplate={jest.fn()}
      />,
    );

    expect(screen.getByText(collection.title)).toBeTruthy();
    expect(screen.getByText(collection.deck)).toBeTruthy();
    expect(screen.getAllByText('Why try it?').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Why it works tonight').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Review the complete plan' })).toBeTruthy();
  });

  it('supports reversible choose-some selection and a bounded review action', () => {
    const onToggleRecipe = jest.fn();
    const onReviewSelected = jest.fn();
    const selectedRecipeId = collection.sections[0].entries[0].recipeId;
    const selectedScreen = render(
      <EditorialMealCollectionView
        collection={collection}
        recipes={recipes}
        selectedRecipeIds={[selectedRecipeId]}
        onToggleRecipe={onToggleRecipe}
        onOpenRecipe={jest.fn()}
        onReviewSelected={onReviewSelected}
        onReviewTemplate={jest.fn()}
      />,
    );

    const selectedRecipe = recipes.find((recipe) => recipe.recipe.id === selectedRecipeId)!;
    expect(selectedScreen.getByText('1 meal selected')).toBeTruthy();
    fireEvent.press(selectedScreen.getByRole('button', { name: `Remove ${selectedRecipe.currentVersion.title}` }));
    fireEvent.press(selectedScreen.getByRole('button', { name: 'Review 1 selected meal' }));
    expect(onToggleRecipe).toHaveBeenCalledWith(selectedRecipeId);
    expect(onReviewSelected).toHaveBeenCalledTimes(1);
  });
});
