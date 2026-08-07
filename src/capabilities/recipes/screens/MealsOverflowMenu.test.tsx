import { fireEvent, render } from '@testing-library/react-native';

import { MealsOverflowMenu } from './RecipeLibraryScreen';

jest.mock('../../../features/unifiedChat/UnifiedChatDrawer', () => ({ UnifiedChatDrawer: () => null }));

jest.mock('../../../ui/Icon', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Icon: ({ name, testID }: { name: string; testID?: string }) => (
      <View testID={testID} accessibilityLabel={`icon-${name}`} />
    ),
  };
});

jest.mock('../../../ui/DropdownMenu', () => {
  const React = require('react');
  const { Pressable, View } = require('react-native');
  return {
    DropdownMenu: ({ children }: any) => <View>{children}</View>,
    DropdownMenuTrigger: ({ children }: any) => <View>{children}</View>,
    DropdownMenuContent: ({ children, align }: any) => <View testID="meals-menu-content" accessibilityLabel={`aligned-${align}`}>{children}</View>,
    DropdownMenuItem: ({ children, onPress }: any) => <Pressable onPress={onPress}>{children}</Pressable>,
  };
});

const menuProps = {
  defaultServings: 4,
  hiddenCount: 0,
  foodNeedsCount: 0,
  onChangeDefaultServings: jest.fn(),
  onOpenHidden: jest.fn(),
  onOpenFoodNeeds: jest.fn(),
};

describe('Meals overflow menu', () => {
  it('reveals Hidden meals only when there is something to recover', () => {
    const empty = render(
      <MealsOverflowMenu {...menuProps} />,
    );
    expect(empty.queryByText(/hidden meal/i)).toBeNull();
    empty.unmount();

    const onOpenHidden = jest.fn();
    const populated = render(
      <MealsOverflowMenu {...menuProps} hiddenCount={2} foodNeedsCount={1} onOpenHidden={onOpenHidden} />,
    );
    fireEvent.press(populated.getByText('2 hidden meals'));
    expect(onOpenHidden).toHaveBeenCalledTimes(1);
  });

  it('left-aligns the popover with its trigger', () => {
    const screen = render(<MealsOverflowMenu {...menuProps} />);
    expect(screen.getByLabelText('aligned-start')).toBeTruthy();
  });

  it('edits the usual serving count directly inside the menu', () => {
    const onChangeDefaultServings = jest.fn();
    const screen = render(<MealsOverflowMenu {...menuProps} onChangeDefaultServings={onChangeDefaultServings} />);

    expect(screen.getByText('Default servings')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Decrease default servings'));
    fireEvent.press(screen.getByLabelText('Increase default servings'));

    expect(onChangeDefaultServings).toHaveBeenNthCalledWith(1, 3);
    expect(onChangeDefaultServings).toHaveBeenNthCalledWith(2, 5);
  });

  it('uses an explicit food-avoidance action instead of status copy', () => {
    const empty = render(<MealsOverflowMenu {...menuProps} />);
    expect(empty.getByText('Add foods to avoid')).toBeTruthy();
    expect(empty.getByTestId('foods-to-avoid-menu-icon').props.accessibilityLabel).toBe('icon-plus');
    expect(empty.queryByText('ADD')).toBeNull();
    empty.unmount();

    const configured = render(<MealsOverflowMenu {...menuProps} foodNeedsCount={2} />);
    expect(configured.getByText('Edit foods to avoid')).toBeTruthy();
    expect(configured.getByTestId('foods-to-avoid-menu-icon').props.accessibilityLabel).toBe('icon-shield');
  });

  it('uses a people icon for the serving count instead of the Plan icon', () => {
    const screen = render(<MealsOverflowMenu {...menuProps} />);
    expect(screen.getByTestId('default-servings-menu-icon').props.accessibilityLabel).toBe('icon-users');
  });
});
