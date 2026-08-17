import { fireEvent, render } from '@testing-library/react-native';
import type { RecipeEditorialPick } from '../domain/recipeEditorialPicks';
import { RecipeEditorialPickCard } from './RecipeEditorialPickCard';

const pick: RecipeEditorialPick = {
  id: 'kitchenaid-7-cup-food-processor',
  equipmentId: 'food-processor',
  asin: 'B07BW1ZPB5',
  title: 'KitchenAid 7-Cup Food Processor',
  rationale: 'A practical size for everyday chopping, slicing, and puréeing.',
  thumbnailAsset: 'food-processor',
};

describe('RecipeEditorialPickCard', () => {
  it('presents one calm editorial recommendation and defers the retailer handoff', () => {
    const onPress = jest.fn();
    const screen = render(<RecipeEditorialPickCard pick={pick} onPress={onPress} />);

    expect(screen.queryByText('Kwilt pick')).toBeNull();
    expect(screen.getByText('KitchenAid 7-Cup Food Processor')).toBeTruthy();
    expect(screen.getByText(pick.rationale)).toBeTruthy();
    expect(screen.getByText('View on Amazon')).toBeTruthy();
    expect(screen.getByLabelText('Illustration of a compact food processor')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('View KitchenAid 7-Cup Food Processor on Amazon'));
    expect(onPress).toHaveBeenCalledWith(pick);
  });
});
