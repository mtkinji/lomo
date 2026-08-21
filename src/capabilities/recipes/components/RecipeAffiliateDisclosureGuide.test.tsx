import { fireEvent, render } from '@testing-library/react-native';
import type { RecipeEditorialPick } from '../domain/recipeEditorialPicks';
import { RecipeAffiliateDisclosureGuide } from './RecipeAffiliateDisclosureGuide';

jest.mock('../../../ui/Portal', () => ({
  Portal: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../../ui/BottomGuide', () => ({
  BottomGuide: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
    visible ? children : null,
}));

const pick: RecipeEditorialPick = {
  id: 'kitchenaid-7-cup-food-processor',
  equipmentId: 'food-processor',
  productId: 'kitchenaid-7-cup-food-processor',
  retailerListingId: 'amazon-us-kitchenaid-7-cup-food-processor',
  retailerExternalProductId: 'B07BW1ZPB5',
  title: 'KitchenAid 7-Cup Food Processor',
  rationale: 'A practical size for everyday chopping, slicing, and puréeing.',
  tradeoff: 'It takes more cabinet space than a knife.',
  substituteSummary: 'A sharp knife works when you do not need a fine, even texture.',
  recipeCount: 4,
  thumbnailAsset: 'food-processor',
};

describe('RecipeAffiliateDisclosureGuide', () => {
  it('uses neutral commission copy and requires an explicit continue action', () => {
    const onContinue = jest.fn();
    const screen = render(
      <RecipeAffiliateDisclosureGuide
        visible
        affiliate
        pick={pick}
        onClose={jest.fn()}
        onContinue={onContinue}
      />,
    );

    expect(screen.getByText('Opening Amazon')).toBeTruthy();
    expect(screen.getByText(
      'As an Amazon Associate, Kwilt earns from qualifying purchases.',
    )).toBeTruthy();
    expect(screen.getByText('You may not need it')).toBeTruthy();
    expect(screen.getByText(pick.substituteSummary)).toBeTruthy();
    expect(screen.getByText('Worth knowing')).toBeTruthy();
    expect(screen.getByText(pick.tradeoff)).toBeTruthy();
    fireEvent.press(screen.getByText('Continue to Amazon'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('labels an untagged testing destination without implying commission', () => {
    const screen = render(
      <RecipeAffiliateDisclosureGuide
        visible
        affiliate={false}
        pick={pick}
        onClose={jest.fn()}
        onContinue={jest.fn()}
      />,
    );

    expect(screen.getByText(
      'You’re about to open Amazon. This testing link is not an affiliate link.',
    )).toBeTruthy();
  });
});
