import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { colors } from '../../../theme';
import { recipeContractFixture, recipeVersionContractFixture } from '../domain/recipeContractFixtures';
import { RecipeHomeView } from './RecipeHomeScreen';

describe('Recipe Home', () => {
  it('keeps planning and cooking as the two primary actions and scales one coherent ingredient line', () => {
    const onAdd = jest.fn(); const onCook = jest.fn(); const onToggle = jest.fn();
    const screen = render(<RecipeHomeView
      projection={{ recipe: recipeContractFixture(), currentVersion: recipeVersionContractFixture() }}
      servings={4} checked={new Set()} onServingsChange={jest.fn()} onToggleIngredient={onToggle}
      onAdd={onAdd} onCook={onCook} onMore={jest.fn()}
    />);
    fireEvent.press(screen.getByText('Add to Next meals')); fireEvent.press(screen.getByText('Start cooking'));
    expect(onAdd).toHaveBeenCalled(); expect(onCook).toHaveBeenCalled();
    expect(StyleSheet.flatten(screen.getByTestId('recipe-add-to-plan').props.style).backgroundColor).toBe(colors.primary);
    expect(screen.getByText('¾ cup flour, sifted')).toBeTruthy();
    expect(screen.queryByText('1 1/2 cups flour, sifted')).toBeNull();
    fireEvent.press(screen.getByText('¾ cup flour, sifted')); expect(onToggle).toHaveBeenCalledWith('ingredient-1');
  });

  it('shows provenance and missing-time treatment without turning it into an audit log', () => {
    const version = { ...recipeVersionContractFixture(), prepMinutes: null, cookMinutes: null };
    const screen = render(<RecipeHomeView projection={{ recipe: recipeContractFixture(), currentVersion: version }} servings={8} checked={new Set()} onServingsChange={jest.fn()} onToggleIngredient={jest.fn()} onAdd={jest.fn()} onCook={jest.fn()} onMore={jest.fn()} />);
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.getByText('Private to you')).toBeTruthy();
    expect(screen.getByText(/Grandma Ruth's card/)).toBeTruthy();
  });

  it('surfaces relevant private learning with its Cook-record source', () => {
    const screen = render(<RecipeHomeView projection={{ recipe: recipeContractFixture(), currentVersion: recipeVersionContractFixture() }} servings={8} checked={new Set()} priorLearning={{ id: 'record-1', sessionId: 'session-1', recipeId: 'recipe-1', recipeVersionId: 'version-1', servingScale: 1, wouldMakeAgain: true, privateNote: 'Use more sauce', completedAt: '2026-08-05T12:00:00.000Z' }} onServingsChange={jest.fn()} onToggleIngredient={jest.fn()} onAdd={jest.fn()} onCook={jest.fn()} onMore={jest.fn()} />);
    expect(screen.getByText('From your last cook')).toBeTruthy(); expect(screen.getByText('Use more sauce')).toBeTruthy(); expect(screen.getByText(/Private Cook record/)).toBeTruthy();
  });
});
