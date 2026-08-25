import { fireEvent, render } from '@testing-library/react-native';

import { RecipeSummaryBar } from './RecipeSummaryBar';

jest.mock('../../../ui/DropdownMenu', () => {
  const { Pressable, Text, View } = require('react-native');
  return {
    DropdownMenu: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    DropdownMenuItem: ({ label, onPress, selected }: { label: string; onPress(): void; selected?: boolean }) => (
      <Pressable accessibilityRole="menuitem" accessibilityState={{ selected }} onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    ),
  };
});

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
    expect(renderSummary().getByText('Makes')).toBeTruthy();
    expect(renderSummary().getByText('1 9-by-5-inch loaf')).toBeTruthy();
    expect(renderSummary({ yieldQuantity: 24, yieldUnit: 'halves', multiplier: 2 })
      .getByText('48 halves')).toBeTruthy();
  });

  it('offers reviewed whole-batch multipliers as one secondary Scale action', () => {
    const onMultiplierChange = jest.fn();
    const screen = renderSummary({
      yieldQuantity: 6,
      yieldUnit: 'burritos',
      multiplier: 1,
      onMultiplierChange,
    });

    expect(screen.getByText('Scale')).toBeTruthy();
    expect(screen.getByText('6 burritos')).toBeTruthy();
    expect(screen.getByLabelText('Scale recipe, currently 1 time')).toBeTruthy();
    expect(screen.getByTestId('recipe-scale-trigger').props.accessibilityRole).toBe('button');
    expect(screen.getAllByTestId('recipe-scale-chevron').length).toBeGreaterThan(0);
    expect(screen.getByText('1X')).toBeTruthy();
    expect(screen.queryByText('1×')).toBeNull();
    fireEvent.press(screen.getByText('2X · Makes 12 burritos'));
    fireEvent.press(screen.getByText('3X · Makes 18 burritos'));

    expect(onMultiplierChange).toHaveBeenNthCalledWith(1, 2);
    expect(onMultiplierChange).toHaveBeenNthCalledWith(2, 3);
  });

  it('shows only authored yield when scaling is unavailable', () => {
    const screen = renderSummary({ scalingAvailable: false });
    expect(screen.queryByLabelText(/Scale recipe/)).toBeNull();
    expect(screen.getByText('Makes')).toBeTruthy();
    expect(screen.getByText('1 9-by-5-inch loaf')).toBeTruthy();
    expect(screen.queryByText('1X')).toBeNull();
  });
});
