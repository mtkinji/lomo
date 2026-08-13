import { fireEvent, render } from '@testing-library/react-native';
import { KrogerCartReviewSections } from './KrogerCartReviewSections';

const ready = Array.from({ length: 18 }, (_, index) => ({ id: `ready-${index}`, title: `Ready ${index + 1}` }));
const review = [{ id: 'milk', title: 'Almond milk' }, { id: 'eggs', title: 'Eggs' }];
const unmatched = [{ id: 'bread', title: 'Bread' }];

describe('Kroger cart review sections', () => {
  it('keeps Ready collapsed and makes exceptions the three-second read', () => {
    const screen = render(<KrogerCartReviewSections retailerLabel="Smith's" fulfillmentMode="pickup" ready={ready} review={review} unmatched={unmatched} />);
    expect(screen.getByText("18 of 21 ready for Smith's pickup")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Show 18 ready items' })).toBeTruthy();
    expect(screen.getByText('2 need you')).toBeTruthy();
    expect(screen.getByText('1 not found')).toBeTruthy();
    expect(screen.queryByText('Ready 1')).toBeNull();
  });

  it('lets Maya inspect Ready and make exact reversible exception choices', () => {
    const onUse = jest.fn(); const onChoose = jest.fn(); const onLeave = jest.fn();
    const screen = render(<KrogerCartReviewSections retailerLabel="Smith's" fulfillmentMode="pickup" ready={ready.slice(0, 1)} review={review.slice(0, 1)} unmatched={unmatched} onUse={onUse} onChoose={onChoose} onLeave={onLeave} />);
    fireEvent.press(screen.getByRole('button', { name: 'Show 1 ready item' }));
    expect(screen.getByText('Ready 1')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Use Almond milk' }));
    fireEvent.press(screen.getByRole('button', { name: 'Choose another for Almond milk' }));
    fireEvent.press(screen.getByRole('button', { name: 'Leave Almond milk on list' }));
    expect(onUse).toHaveBeenCalledWith('milk'); expect(onChoose).toHaveBeenCalledWith('milk'); expect(onLeave).toHaveBeenCalledWith('milk');
    expect(screen.getByText('Bread')).toBeTruthy();
  });

  it('shows at most one merchandise savings summary', () => {
    const screen = render(<KrogerCartReviewSections retailerLabel="Smith's" fulfillmentMode="pickup" ready={[]} review={[]} unmatched={[]} savingsSummary="Save $2.00 on 2 of 3 items" />);
    expect(screen.getAllByText('Save $2.00 on 2 of 3 items')).toHaveLength(1);
  });
});
