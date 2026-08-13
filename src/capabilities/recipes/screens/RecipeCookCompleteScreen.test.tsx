import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { RecipeCookCompleteView } from './RecipeCookCompleteScreen';
import { recipeVersionContractFixture } from '../domain/recipeContractFixtures';

describe('RecipeCookCompleteView', () => {
  it('captures a private outcome and a structured exact-version substitution', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const version = recipeVersionContractFixture();
    const screen = render(
      <RecipeCookCompleteView
        version={version}
        saving={false}
        error={null}
        onSave={onSave}
      />,
    );

    fireEvent.press(screen.getByLabelText('Rate this cook 4 out of 5'));
    fireEvent.press(screen.getByText('Add a substitution'));
    fireEvent.press(screen.getByText('1 1/2 cups flour, sifted'));
    fireEvent.changeText(screen.getByLabelText('Used instead'), 'oat flour');
    fireEvent.press(screen.getByLabelText('Rate this substitution 3 out of 5'));
    fireEvent.changeText(screen.getByLabelText('Substitution note'), 'Needed more liquid');
    fireEvent.changeText(screen.getByLabelText('Cooking note'), 'More sauce next time');
    fireEvent.press(screen.getByText('We’d make this again'));
    fireEvent.press(screen.getByText('Done'));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      wouldMakeAgain: true,
      outcomeRating: 4,
      note: 'More sauce next time',
      destination: 'private_note',
      substitutions: [{
        ingredientLineId: 'ingredient-1',
        usedInstead: 'oat flour',
        resultRating: 3,
        note: 'Needed more liquid',
      }],
    }));
  });

  it('keeps substitutions collapsed until requested', () => {
    const screen = render(
      <RecipeCookCompleteView
        version={recipeVersionContractFixture()}
        saving={false}
        error={null}
        onSave={jest.fn()}
      />,
    );
    expect(screen.queryByLabelText('Used instead')).toBeNull();
    expect(screen.getByText('Add a substitution')).toBeTruthy();
  });
});
