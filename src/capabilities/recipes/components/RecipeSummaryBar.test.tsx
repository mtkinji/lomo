import { fireEvent, render } from '@testing-library/react-native';

import { RecipeSummaryBar } from './RecipeSummaryBar';

function renderSummary(overrides: Partial<React.ComponentProps<typeof RecipeSummaryBar>> = {}) {
  return render(<RecipeSummaryBar
    prepMinutes={null}
    cookMinutes={null}
    yieldQuantity={1}
    yieldUnit="9-by-5-inch loaf"
    multiplier={1}
    scalingAvailable
    onMultiplierChange={jest.fn()}
    {...overrides}
  />);
}

describe('RecipeSummaryBar', () => {
  it('shows what the authored batch makes', () => {
    expect(renderSummary().getByText('Makes 1 9-by-5-inch loaf')).toBeTruthy();
    expect(renderSummary({ yieldQuantity: 24, yieldUnit: 'halves', multiplier: 2 })
      .getByText('Makes 48 halves')).toBeTruthy();
  });

  it('moves only through reviewed whole-batch multipliers', () => {
    const onMultiplierChange = jest.fn();
    const screen = renderSummary({ multiplier: 2, onMultiplierChange });

    fireEvent.press(screen.getByLabelText('Decrease recipe size'));
    fireEvent.press(screen.getByLabelText('Increase recipe size'));

    expect(onMultiplierChange).toHaveBeenNthCalledWith(1, 1);
    expect(onMultiplierChange).toHaveBeenNthCalledWith(2, 3);
  });

  it('shows authored yield without a half-working control when scaling is unavailable', () => {
    const screen = renderSummary({ scalingAvailable: false });
    expect(screen.queryByLabelText('Increase recipe size')).toBeNull();
    expect(screen.getByText('Makes 1 9-by-5-inch loaf')).toBeTruthy();
  });
});
